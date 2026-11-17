import { MODELS, serialize, serializeValue, uuid, Row, FieldDef } from './schema';
import { rtdbMultiUpdate } from './rtdb';
import { RowStore, project, matchesWhere, applyOrderBy, ProjectionArgs, WhereClause, OrderByClause } from './query';

interface WritePlan {
  writes: Record<string, unknown>;
  meta: any;
}

/**
 * A deferred write. Building it does no I/O; awaiting it plans the write
 * against a fresh read snapshot, commits atomically, then builds the result.
 * This is what lets `prisma.$transaction([...])` batch several writes into a
 * single multi-path update.
 */
class LazyOp<T> {
  private doPlan: (store: RowStore) => Promise<WritePlan>;
  private doResult: (store: RowStore, meta: any) => Promise<T>;

  constructor(
    doPlan: (store: RowStore) => Promise<WritePlan>,
    doResult: (store: RowStore, meta: any) => Promise<T>
  ) {
    this.doPlan = doPlan;
    this.doResult = doResult;
  }

  plan(store: RowStore): Promise<WritePlan> {
    return this.doPlan(store);
  }

  buildResult(store: RowStore, meta: any): Promise<T> {
    return this.doResult(store, meta);
  }

  /** Standalone execution: plan, commit atomically, then build the result. */
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return (async () => {
      const planStore = new RowStore();
      const { writes, meta } = await this.doPlan(planStore);
      await rtdbMultiUpdate(writes);
      return this.doResult(new RowStore(), meta);
    })().then(onfulfilled, onrejected);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PrismaError extends Error {
  code?: string;
}

function notFound(model: string): PrismaError {
  const error: PrismaError = new Error(`Record to update not found: ${model}`);
  error.code = 'P2025';
  return error;
}

function duplicateUnique(model: string, keys: string[]): PrismaError {
  const error: PrismaError = new Error(
    `Unique constraint failed on the fields: (\`${keys.join('`,`')}\`)`
  );
  error.code = 'P2002';
  return error;
}

/** Resolves `{ increment: n }` / `{ decrement: n }` style atomic updates. */
function resolveNumericOp(current: any, op: any): any {
  if (op !== null && typeof op === 'object' && !(op instanceof Date) && !Array.isArray(op)) {
    const o = op as Record<string, any>;
    const base = typeof current === 'number' ? current : 0;
    if ('increment' in o) return base + Number(o.increment || 0);
    if ('decrement' in o) return base - Number(o.decrement || 0);
    if ('set' in o) return o.set;
  }
  return op;
}

interface ChildCreate {
  relation: string;
  items: any[];
}

/**
 * Splits a write payload into scalar fields and nested relation operations.
 * Supports the `items: { create: [...] }` and `product: { connect: { id } }`
 * shapes used by order creation.
 */
function expandRelations(model: string, data: Row): { scalar: Row; childCreates: ChildCreate[] } {
  const def = MODELS[model];
  const scalar: Row = {};
  const childCreates: ChildCreate[] = [];

  for (const [key, value] of Object.entries(data)) {
    const relation = def.relations[key];

    if (relation && relation.kind === 'hasMany') {
      const v = value as any;
      if (v && typeof v === 'object' && Array.isArray(v.create)) {
        childCreates.push({ relation: key, items: v.create });
        continue;
      }
      // `{ connect }` / scalar writes on a hasMany relation are not supported
      // by any route; fall through to a plain field write.
    }

    if (relation && relation.kind === 'belongsTo') {
      const v = value as any;
      if (v && typeof v === 'object' && v.connect && relation.foreignKey) {
        scalar[relation.foreignKey] = v.connect.id;
        continue;
      }
    }

    scalar[key] = value;
  }

  return { scalar, childCreates };
}

/** Fills in `createdAt` / `updatedAt` the way Prisma's `@default(now())` / `@updatedAt` do. */
function withTimestamps(model: string, scalar: Row, isNew: boolean): void {
  const def = MODELS[model];
  const now = new Date().toISOString();
  if (isNew && def.fields.createdAt && scalar.createdAt === undefined) {
    scalar.createdAt = now;
  }
  if (def.fields.updatedAt) scalar.updatedAt = now;
}

async function assertUnique(
  model: string,
  store: RowStore,
  data: Row,
  excludeId?: string
): Promise<void> {
  const def = MODELS[model];
  const rows = Object.values(await store.collection(model));

  for (const keys of def.unique) {
    const provided = keys.filter((k) => data[k] !== undefined && data[k] !== null);
    if (provided.length !== keys.length) continue;

    const clash = rows.find((row) => {
      if (excludeId && row.id === excludeId) return false;
      return keys.every((k) => String(row[k]) === String(data[k]));
    });
    if (clash) throw duplicateUnique(model, keys);
  }
}

async function findTarget(model: string, store: RowStore, where?: WhereClause): Promise<Row | null> {
  // Fast path: an id lookup needs no scan.
  if (where && typeof where.id === 'string' && Object.keys(where).length === 1) {
    return store.byId(model, where.id);
  }
  const rows = Object.values(await store.collection(model));
  return rows.find((row) => matchesWhere(row, where)) ?? null;
}

/** Applies a partial update to a stored row, deleting keys set to `null`. */
function buildPatch(model: string, current: Row, data: Row): Record<string, unknown> {
  const def = MODELS[model];
  const patch: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(data)) {
    if (rawValue === undefined) continue; // Prisma ignores undefined
    if (key === 'id') continue; // the key is the id; never overwrite it

    const field: FieldDef | undefined = def.fields[key];

    if (rawValue === null) {
      // Setting null removes the key in RTDB (which cannot store null).
      patch[key] = null;
      continue;
    }

    if (field) {
      const resolved = resolveNumericOp(current[key], rawValue);
      const serialized = serializeValue(field, resolved);
      patch[key] = serialized === null ? null : serialized;
    } else {
      patch[key] = rawValue;
    }
  }
  return patch;
}

// ---------------------------------------------------------------------------
// Delegate factory
// ---------------------------------------------------------------------------

interface FindArgs extends ProjectionArgs {
  where?: WhereClause;
  orderBy?: OrderByClause | null;
  take?: number;
  skip?: number;
}

function makeFieldRefs(model: string): Record<string, { __fieldRef: string }> {
  const refs: Record<string, { __fieldRef: string }> = {};
  for (const key of Object.keys(MODELS[model].fields)) {
    refs[key] = { __fieldRef: key };
  }
  return refs;
}

function makeDelegate(model: string) {
  const fields = makeFieldRefs(model);

  return {
    fields,

    async findUnique(args: FindArgs = {}): Promise<any> {
      const store = new RowStore();
      const row = await findTarget(model, store, args.where || {});
      if (!row) return null;
      return project(store, model, row, args);
    },

    async findFirst(args: FindArgs = {}): Promise<any> {
      const store = new RowStore();
      let rows = await store.find(model, args.where);
      rows = applyOrderBy(rows, args.orderBy);
      const row = rows[0];
      if (!row) return null;
      return project(store, model, row, args);
    },

    async findMany(args: FindArgs = {}): Promise<any[]> {
      const store = new RowStore();
      let rows = await store.find(model, args.where);
      rows = applyOrderBy(rows, args.orderBy);
      if (typeof args.skip === 'number' && args.skip > 0) rows = rows.slice(args.skip);
      if (typeof args.take === 'number') rows = rows.slice(0, args.take);

      const out: any[] = [];
      for (const row of rows) out.push(await project(store, model, row, args));
      return out;
    },

    async count(args: { where?: WhereClause } = {}): Promise<number> {
      const store = new RowStore();
      const rows = await store.find(model, args.where);
      return rows.length;
    },

    async aggregate(args: { where?: WhereClause; _sum?: Record<string, boolean> } = {}): Promise<any> {
      const store = new RowStore();
      const rows = await store.find(model, args.where);
      const result: Record<string, any> = {};
      if (args._sum) {
        const sum: Record<string, number | null> = {};
        for (const field of Object.keys(args._sum)) {
          if (!args._sum[field]) continue;
          sum[field] =
            rows.length === 0
              ? null
              : rows.reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
        }
        result._sum = sum;
      }
      return result;
    },

    create(args: any): LazyOp<any> {
      const { data, select, include } = args || {};

      return new LazyOp<any>(
        async (store) => {
          const { scalar, childCreates } = expandRelations(model, data || {});
          withTimestamps(model, scalar, true);

          await assertUnique(model, store, scalar);

          // An explicit id lets callers key a row by an external identity
          // (e.g. the Firebase uid) instead of a generated UUID.
          const id = typeof data?.id === 'string' && data.id ? data.id : uuid();

          const writes: Record<string, unknown> = {
            [`${MODELS[model].path}/${id}`]: serialize(model, scalar),
          };

          // Nested `create` on hasMany relations (e.g. order -> orderItems).
          for (const { relation, items } of childCreates) {
            const rel = MODELS[model].relations[relation];
            if (!rel || rel.kind !== 'hasMany') continue;
            const childModel = rel.target;
            const fk = rel.targetForeignKey;
            for (const item of items) {
              const { scalar: childScalar } = expandRelations(childModel, item);
              withTimestamps(childModel, childScalar, true);
              childScalar[fk] = id;
              const childId = uuid();
              writes[`${MODELS[childModel].path}/${childId}`] = serialize(childModel, childScalar);
            }
          }

          return { writes, meta: { id } };
        },
        async (store, meta) => {
          const { id } = meta;
          const row = await store.byId(model, id);
          if (!row) throw notFound(model);
          return project(store, model, row, { select, include });
        }
      );
    },

    update(args: any): LazyOp<any> {
      const { where, data, select, include } = args || {};

      return new LazyOp<any>(
        async (store) => {
          const current = await findTarget(model, store, where || {});
          if (!current) throw notFound(model);

          const patch = buildPatch(model, current, data || {});
          await assertUnique(model, store, { ...current, ...patch }, current.id);

          const now = new Date().toISOString();
          if (MODELS[model].fields.updatedAt) patch.updatedAt = now;

          const writes: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(patch)) {
            writes[`${MODELS[model].path}/${current.id}/${key}`] = value;
          }
          return { writes, meta: { id: current.id } };
        },
        async (store, meta) => {
          const { id } = meta;
          const row = await store.byId(model, id);
          if (!row) throw notFound(model);
          return project(store, model, row, { select, include });
        }
      );
    },

    updateMany(args: any): LazyOp<{ count: number }> {
      const { where, data } = args || {};

      return new LazyOp<{ count: number }>(
        async (store) => {
          const rows = await store.find(model, where);
          const writes: Record<string, unknown> = {};
          for (const row of rows) {
            const patch = buildPatch(model, row, data || {});
            const now = new Date().toISOString();
            if (MODELS[model].fields.updatedAt) patch.updatedAt = now;
            for (const [key, value] of Object.entries(patch)) {
              writes[`${MODELS[model].path}/${row.id}/${key}`] = value;
            }
          }
          return { writes, meta: { count: rows.length } };
        },
        async (_store, meta) => ({ count: meta.count as number })
      );
    },

    delete(args: any): LazyOp<any> {
      const { where, select, include } = args || {};

      return new LazyOp<any>(
        async (store) => {
          const row = await findTarget(model, store, where || {});
          if (!row) throw notFound(model);
          return {
            writes: { [`${MODELS[model].path}/${row.id}`]: null },
            // The row is gone by the time results are built, so keep a copy.
            meta: { row: { ...row } },
          };
        },
        async (store, meta) => project(store, model, meta.row, { select, include })
      );
    },

    deleteMany(args: any = {}): LazyOp<{ count: number }> {
      const { where } = args;

      return new LazyOp<{ count: number }>(
        async (store) => {
          const rows = await store.find(model, where);
          const writes: Record<string, unknown> = {};
          for (const row of rows) writes[`${MODELS[model].path}/${row.id}`] = null;
          return { writes, meta: { count: rows.length } };
        },
        async (_store, meta) => ({ count: meta.count as number })
      );
    },
  };
}

type Delegate = ReturnType<typeof makeDelegate>;

export const prisma: Record<string, any> & { $transaction: (ops: any[]) => Promise<any[]> } = {
  /**
   * Array form only (the only form any route uses). Every op is planned
   * against a shared read snapshot, then all writes are committed in one
   * atomic multi-path update — RTDB's equivalent of a transaction.
   */
  async $transaction(ops: any[]): Promise<any[]> {
    if (!Array.isArray(ops)) {
      throw new Error('prisma.$transaction: only the array form is supported');
    }

    const store = new RowStore();
    const planned: { op: LazyOp<any>; meta: any }[] = [];
    const writes: Record<string, unknown> = {};

    for (const op of ops) {
      if (!(op instanceof LazyOp)) {
        throw new Error('prisma.$transaction: array entries must be write operations');
      }
      const result = await op.plan(store);
      Object.assign(writes, result.writes);
      planned.push({ op, meta: result.meta });
    }

    await rtdbMultiUpdate(writes);

    const resultStore = new RowStore();
    const out: any[] = [];
    for (const entry of planned) {
      out.push(await entry.op.buildResult(resultStore, entry.meta));
    }
    return out;
  },
};

for (const modelName of Object.keys(MODELS)) {
  prisma[modelName] = makeDelegate(modelName) as Delegate;
}

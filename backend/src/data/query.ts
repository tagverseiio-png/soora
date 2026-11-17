import { MODELS, hydrate, ModelDef, Row } from './schema';
import { rtdbGetCollection } from './rtdb';

export interface FieldRef {
  __fieldRef: string;
}

export function isFieldRef(value: unknown): value is FieldRef {
  return !!value && typeof value === 'object' && typeof (value as FieldRef).__fieldRef === 'string';
}

export type WhereClause = Record<string, any>;
export type OrderByClause = Record<string, 'asc' | 'desc'>;

export interface ProjectionArgs {
  select?: Record<string, any> | null;
  include?: Record<string, any> | null;
  where?: WhereClause;
  orderBy?: OrderByClause | null;
  take?: number;
  skip?: number;
}

/** Normalizes Dates / ISO strings / booleans into a mutually comparable value. */
function comparable(value: any): any {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const t = Date.parse(value);
    if (!isNaN(t)) return t;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function resolveOperand(value: any, row: Row): any {
  return isFieldRef(value) ? row[value.__fieldRef] : value;
}

function equals(a: any, b: any): boolean {
  if (a === undefined || a === null) return b === undefined || b === null;
  if (b === undefined || b === null) return a === undefined || a === null;
  const ca = comparable(a);
  const cb = comparable(b);
  if (typeof ca === 'number' && typeof cb === 'number') return ca === cb;
  return String(ca) === String(cb);
}

function contains(haystack: any, needle: any, insensitive?: boolean): boolean {
  if (typeof haystack !== 'string' || typeof needle !== 'string') return false;
  return insensitive
    ? haystack.toLowerCase().includes(needle.toLowerCase())
    : haystack.includes(needle);
}

function matchCondition(rowValue: any, condition: any, row: Row): boolean {
  // Plain value => equality
  if (
    condition === null ||
    typeof condition !== 'object' ||
    condition instanceof Date ||
    Array.isArray(condition)
  ) {
    if (isFieldRef(condition)) return equals(rowValue, row[condition.__fieldRef]);
    return equals(rowValue, condition);
  }

  const ops = condition as Record<string, any>;

  // `{ not: X }` — X may itself be a value or a nested operator object.
  if ('not' in ops) {
    const notValue = ops.not;
    if (
      notValue !== null &&
      typeof notValue === 'object' &&
      !isFieldRef(notValue) &&
      !(notValue instanceof Date)
    ) {
      if (matchCondition(rowValue, notValue, row)) return false;
    } else if (equals(rowValue, resolveOperand(notValue, row))) {
      return false;
    }
  }

  if ('equals' in ops && !equals(rowValue, resolveOperand(ops.equals, row))) return false;

  if ('in' in ops && Array.isArray(ops.in)) {
    const target = resolveOperand(ops.in, row);
    if (!Array.isArray(target) || !target.some((v: any) => equals(rowValue, v))) return false;
  }

  if ('notIn' in ops && Array.isArray(ops.notIn)) {
    if (ops.notIn.some((v: any) => equals(rowValue, v))) return false;
  }

  const cmp = comparable(rowValue);
  const numeric = (op: 'gt' | 'gte' | 'lt' | 'lte', operand: any): boolean => {
    const target = comparable(resolveOperand(operand, row));
    if (cmp === undefined || cmp === null || target === undefined || target === null) return false;
    if (typeof cmp === 'number' && typeof target === 'number') {
      if (op === 'gt') return cmp > target;
      if (op === 'gte') return cmp >= target;
      if (op === 'lt') return cmp < target;
      return cmp <= target;
    }
    const a = String(cmp);
    const b = String(target);
    if (op === 'gt') return a > b;
    if (op === 'gte') return a >= b;
    if (op === 'lt') return a < b;
    return a <= b;
  };

  if ('gt' in ops && !numeric('gt', ops.gt)) return false;
  if ('gte' in ops && !numeric('gte', ops.gte)) return false;
  if ('lt' in ops && !numeric('lt', ops.lt)) return false;
  if ('lte' in ops && !numeric('lte', ops.lte)) return false;

  if ('contains' in ops) {
    const insensitive = ops.mode === 'insensitive';
    if (!contains(rowValue, ops.contains, insensitive)) return false;
  }

  if ('startsWith' in ops && typeof rowValue === 'string') {
    const needle = String(ops.startsWith);
    const hit =
      ops.mode === 'insensitive'
        ? rowValue.toLowerCase().startsWith(needle.toLowerCase())
        : rowValue.startsWith(needle);
    if (!hit) return false;
  }

  return true;
}

export function matchesWhere(row: Row, where?: WhereClause): boolean {
  if (!where) return true;
  for (const [key, condition] of Object.entries(where)) {
    if (condition === undefined) continue;

    if (key === 'OR') {
      if (!Array.isArray(condition) || !condition.some((w: WhereClause) => matchesWhere(row, w))) {
        return false;
      }
      continue;
    }
    if (key === 'AND') {
      const list = Array.isArray(condition) ? condition : [condition];
      if (!list.every((w: WhereClause) => matchesWhere(row, w))) return false;
      continue;
    }
    if (key === 'NOT') {
      const list = Array.isArray(condition) ? condition : [condition];
      if (list.some((w: WhereClause) => matchesWhere(row, w))) return false;
      continue;
    }

    if (!matchCondition(row[key], condition, row)) return false;
  }
  return true;
}

function compareValues(a: any, b: any): number {
  const ca = comparable(a);
  const cb = comparable(b);

  // Absent values sort last regardless of direction (Prisma/SQL puts NULLs last
  // for ASC; RTDB has no nulls, but our hydrated shape does).
  const aNull = ca === undefined || ca === null;
  const bNull = cb === undefined || cb === null;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  if (typeof ca === 'number' && typeof cb === 'number') return ca - cb;
  if (typeof ca === 'boolean' && typeof cb === 'boolean') return Number(ca) - Number(cb);

  const sa = String(ca);
  const sb = String(cb);
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

export function applyOrderBy<T extends Row>(rows: T[], orderBy?: OrderByClause | null): T[] {
  if (!orderBy) return rows;
  const entries = Object.entries(orderBy).filter(
    ([, dir]) => dir === 'asc' || dir === 'desc'
  ) as [string, 'asc' | 'desc'][];
  if (entries.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const [field, dir] of entries) {
      const cmp = compareValues(a[field], b[field]);
      if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Row store — one fetch per collection per query, so joins don't N+1
// ---------------------------------------------------------------------------

export class RowStore {
  private cache = new Map<string, Promise<Record<string, Row>>>();

  /** All rows of a model, hydrated, keyed by id. */
  collection(model: string): Promise<Record<string, Row>> {
    let pending = this.cache.get(model);
    if (!pending) {
      pending = (async () => {
        const raw = await rtdbGetCollection(MODELS[model].path);
        const out: Record<string, Row> = {};
        for (const [id, value] of Object.entries(raw)) {
          if (value && typeof value === 'object') out[id] = hydrate(model, id, value);
        }
        return out;
      })();
      this.cache.set(model, pending);
    }
    return pending;
  }

  async byId(model: string, id: string): Promise<Row | null> {
    const rows = await this.collection(model);
    return rows[id] ?? null;
  }

  async find(model: string, where?: WhereClause): Promise<Row[]> {
    const rows = await this.collection(model);
    return Object.values(rows).filter((row) => matchesWhere(row, where));
  }
}

/**
 * Builds the response object for one row according to `select` / `include`.
 * With neither given, the whole hydrated row is returned.
 *
 * `include` returns every scalar field plus the listed relations.
 * `select` returns only the listed keys.
 */
export async function project(
  store: RowStore,
  model: string,
  row: Row,
  args: ProjectionArgs = {}
): Promise<any> {
  const { select, include } = args;
  const def: ModelDef = MODELS[model];

  if (select) {
    const out: Row = {};
    for (const [key, value] of Object.entries(select)) {
      if (value === undefined || value === false) continue;
      if (key === '_count') {
        out._count = await projectCount(store, model, row, (value as any) || {});
        continue;
      }
      if (value === true) {
        out[key] = def.relations[key]
          ? await projectRelation(store, model, row, key, {})
          : row[key];
        continue;
      }
      out[key] = await projectRelation(store, model, row, key, value);
    }
    return out;
  }

  // No `select`: every scalar field, plus any relations from `include`.
  const out: Row = { ...row };
  if (include) {
    for (const [key, value] of Object.entries(include)) {
      if (value === undefined || value === false) continue;
      out[key] =
        value === true
          ? await projectRelation(store, model, row, key, {})
          : await projectRelation(store, model, row, key, value);
    }
  }
  return out;
}

async function projectCount(
  store: RowStore,
  model: string,
  row: Row,
  spec: any
): Promise<Record<string, number>> {
  // Prisma writes this as `_count: { select: { orders: true } }`.
  const counts: Record<string, any> =
    spec && typeof spec === 'object' && spec.select ? spec.select : spec;

  const def = MODELS[model];
  const out: Record<string, number> = {};

  for (const [rel, enabled] of Object.entries(counts)) {
    if (!enabled) continue;
    const relation = def.relations[rel];
    if (!relation || relation.kind !== 'hasMany') continue;
    const children = await store.find(relation.target, {
      [relation.targetForeignKey]: row.id,
    });
    out[rel] = children.length;
  }
  return out;
}

async function projectRelation(
  store: RowStore,
  model: string,
  row: Row,
  relName: string,
  relArgs: any
): Promise<any> {
  const relation = MODELS[model].relations[relName];
  if (!relation) {
    // Not a relation — treat as a nested projection of a plain field.
    return row[relName];
  }

  const { where, select, include, orderBy, take, skip } = relArgs || {};

  if (relation.kind === 'belongsTo') {
    const fk = row[relation.foreignKey];
    if (!fk) return null;
    const target = await store.byId(relation.target, fk);
    if (!target) return null;
    return project(store, relation.target, target, { select, include });
  }

  // hasMany
  const children = await store.find(relation.target, {
    ...(where || {}),
    [relation.targetForeignKey]: row.id,
  });

  let ordered = applyOrderBy(children, orderBy);
  if (typeof skip === 'number' && skip > 0) ordered = ordered.slice(skip);
  if (typeof take === 'number') ordered = ordered.slice(0, take);

  const projected: any[] = [];
  for (const child of ordered) {
    projected.push(await project(store, relation.target, child, { select, include }));
  }
  return projected;
}

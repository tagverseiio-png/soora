import dotenv from 'dotenv';

dotenv.config();

/**
 * Minimal Firebase Realtime Database REST client.
 *
 * We talk to RTDB over its REST API using a database secret rather than the
 * firebase-admin SDK so that no service-account JSON is required to run the
 * backend.
 *
 * Verified constraints of this endpoint:
 *  - Auth must be passed as `?auth=<secret>`; `Authorization: Bearer` is
 *    rejected with 401.
 *  - No `ETag` header is returned, so `If-Match` optimistic concurrency is
 *    unavailable (it always fails with 412). Uniqueness is therefore enforced
 *    with check-then-create at the model layer, not by the database.
 *  - `orderByChild` / `equalTo` require `.indexOn` rules, which cannot be set
 *    with a database secret. All filtering, sorting and pagination is done
 *    in memory by the query engine.
 *  - `null` / `undefined` values are stripped on write, so "set to null" is
 *    expressed by deleting the key.
 *  - Values must be JSON primitives, arrays or plain objects (no Date).
 */

const DEFAULT_DATABASE_URL =
  'https://soora-a92e1-default-rtdb.asia-southeast1.firebasedatabase.app';

const BASE_URL = (process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL).replace(
  /\/+$/,
  ''
);
const SECRET = process.env.FIREBASE_DATABASE_SECRET || '';

export interface RtdbQuery {
  orderBy?: string | null;
  limitToFirst?: number;
  limitToLast?: number;
}

export interface RequestOptions {
  body?: unknown;
  query?: RtdbQuery;
}

export interface RtdbResponse {
  status: number;
  data: any;
}

function assertConfigured(): void {
  if (!SECRET) {
    throw new Error(
      'FIREBASE_DATABASE_SECRET is not set. Copy backend/.env.example to backend/.env and fill it in.'
    );
  }
}

function buildUrl(path: string, query?: RtdbQuery): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const url = clean ? `${BASE_URL}/${clean}.json` : `${BASE_URL}/.json`;
  const params = [`auth=${encodeURIComponent(SECRET)}`];
  if (query) {
    if (query.orderBy !== undefined) {
      params.push(
        `orderBy=${encodeURIComponent(query.orderBy === null ? 'null' : `"${query.orderBy}"`)}`
      );
    }
    if (query.limitToFirst !== undefined) params.push(`limitToFirst=${query.limitToFirst}`);
    if (query.limitToLast !== undefined) params.push(`limitToLast=${query.limitToLast}`);
  }
  return `${url}?${params.join('&')}`;
}

async function request(method: string, path: string, options: RequestOptions = {}): Promise<RtdbResponse> {
  assertConfigured();

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const init: RequestInit = { method, headers };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  const res = await fetch(buildUrl(path, options.query), init);
  const text = await res.text();

  let data: any = null;
  if (text && text !== 'null') {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `RTDB ${method} ${path} returned non-JSON response: ${text.slice(0, 200)}`
      );
    }
  }

  if (!res.ok) {
    const message = data?.error || text || `HTTP ${res.status}`;
    const error: Error & { status?: number } = new Error(
      `RTDB ${method} ${path} failed (${res.status}): ${message}`
    );
    error.status = res.status;
    throw error;
  }

  return { status: res.status, data };
}

/** Reads a node. Returns `null` when the path does not exist. */
export async function rtdbGet(path: string, query?: RtdbQuery): Promise<any> {
  const res = await request('GET', path, { query });
  return res.data ?? null;
}

/**
 * Reads a whole collection keyed by push/uuid key into a plain record.
 * Returns `{}` for a missing path (RTDB returns `null`).
 */
export async function rtdbGetCollection(path: string): Promise<Record<string, any>> {
  const data = await rtdbGet(path);
  return (data ?? {}) as Record<string, any>;
}

/** Writes a node, replacing it entirely. Returns the data as stored. */
export async function rtdbPut(path: string, value: unknown): Promise<any> {
  const res = await request('PUT', path, { body: value });
  return res.data ?? null;
}

/** Merges the given keys into a node. Keys set to `null` are deleted. */
export async function rtdbPatch(path: string, value: Record<string, unknown>): Promise<any> {
  const res = await request('PATCH', path, { body: value });
  return res.data ?? null;
}

/** Creates a node under a push-key path and returns the generated key. */
export async function rtdbPost(path: string, value: unknown): Promise<string | null> {
  const res = await request('POST', path, { body: value });
  return res.data?.name ?? null;
}

/** Deletes a node. Deleting a non-existent node is not an error. */
export async function rtdbDelete(path: string): Promise<void> {
  await request('DELETE', path);
}

/**
 * Applies many writes in a single atomic multi-path update.
 * Keys are absolute paths from the database root; `null` deletes.
 * This is the closest thing RTDB offers to a transaction.
 */
export async function rtdbMultiUpdate(updates: Record<string, unknown>): Promise<void> {
  if (Object.keys(updates).length === 0) return;
  await request('PATCH', '', { body: updates });
}

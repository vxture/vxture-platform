/**
 * tx.ts — tiny write-path helpers shared by operator RBAC write routers.
 * @package @vxture/bff-admin
 *
 * withTransaction wraps a BEGIN/COMMIT unit on a dedicated client so a multi-
 * statement write (main write + audit, copy + permission clone, delete + unlink)
 * is atomic; any thrown error rolls back and the client is always released.
 * pgErrorCode extracts a SQLSTATE so callers can map 23505 → 409 etc.
 */
import type { Pool, PoolClient } from "pg";

/** Minimal surface shared by pg.Pool and pg.PoolClient (both expose `query`). */
export type Queryable = Pick<PoolClient, "query">;

export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** SQLSTATE of a thrown pg error, or undefined for non-pg errors. */
export function pgErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

import { performance } from 'perf_hooks';
import { dbLogger } from './utils/logger';
import type { QueryResult } from './types';
import { sqliteAdapter } from './adapters/sqlite-adapter';
import { postgresAdapter, getPostgresPool } from './adapters/postgres-adapter';

// Environment switch
const useSqlite = process.env.USE_SQLITE_DEV === 'true';

/**
 * Main Query Function
 * Routes queries to SQLite or Postgres depending on environment.
 */
export async function query<T extends Record<string, any> = any>(
  sql: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const start = performance.now();

  const adapter = useSqlite ? sqliteAdapter : postgresAdapter;
  const adapterName = useSqlite ? 'SQLITE' : 'PG';

  try {
    const result = await adapter.query<T>(sql, params);

    const duration = performance.now() - start;
    if (duration > 100) {
      dbLogger.debug(
        `[${adapterName}] Slow query (${duration.toFixed(2)}ms)`,
        { sql: sql.substring(0, 50) }
      );
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    dbLogger.error(
      `[${adapterName}] ❌ Query failed (${duration.toFixed(2)}ms)`,
      {
        sql: sql.substring(0, 100),
        error: (error as Error).message,
      }
    );

    throw error;
  }
}

/**
 * Expose a unified transaction API if needed
 * (SQLite + PG implementations are in adapters)
 */
export async function transaction<T>(
  callback: (trx: any) => Promise<T>
): Promise<T> {
  const adapter = useSqlite ? sqliteAdapter : postgresAdapter;
  return adapter.transaction(callback);
}

/**
 * Helper to check connection status (used by db.service.ts)
 */
export function getPoolStatus() {
  if (useSqlite) {
    return {
      totalCount: 1,
      idleCount: 1,
      waitingCount: 0
    };
  }

  const pool = getPostgresPool();
  if (!pool) {
    return {
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0
    };
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}

// src/lib/db/adapters/postgres-adapter.ts
import { Pool, PoolClient } from 'pg';
import { DbAdapter, QueryResult } from '../types';
import { dbLogger } from '../utils/logger';

// Singleton PG pool
let pgPool: Pool | null = null;

export function getPostgresPool(): Pool {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });
  }
  return pgPool;
}

class PostgresClientAdapter implements DbAdapter {
  constructor(private client: PoolClient) {}

  async query<T extends Record<string, any>>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const result = await this.client.query<T>(sql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
      command: result.command,
      oid: result.oid ?? 0,
      fields: result.fields ?? [],
    };
  }

  async transaction(): Promise<any> {
    throw new Error('Nested transactions not supported for PG clients');
  }
}

export class PostgresAdapter implements DbAdapter {
  constructor(private pool: Pool) {}

  async query<T extends Record<string, any>>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const start = performance.now();

    try {
      const result = await this.pool.query<T>(sql, params);

      const duration = performance.now() - start;
      if (duration > 500) {
        dbLogger.warn('[PG] Slow query', { duration, sql });
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command,
        oid: result.oid ?? 0,
        fields: result.fields ?? [],
      };
    } catch (error) {
      const duration = performance.now() - start;
      dbLogger.error(`[PG] ❌ ${duration.toFixed(2)}ms — Query failed`, error as Error);
      throw error;
    }
  }

  async transaction<T>(callback: (trx: DbAdapter) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const trxAdapter = new PostgresClientAdapter(client);

    try {
      await client.query('BEGIN');
      const result = await callback(trxAdapter);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Singleton adapter
export const postgresAdapter = new PostgresAdapter(getPostgresPool());

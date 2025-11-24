
import { Pool, QueryResult, type QueryResultRow } from 'pg';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { dbConfig, isCloud as isGoogleCloud } from './config';
import { logger } from './logger';
import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import { initializeSQLiteSchema } from './db-init';

const dbLogger = logger("DATABASE");

// Helper functions (parseReturningClause, getTableName, etc.) remain unchanged
function parseReturningClause(sql: string): { cleanSql: string, returningCols: string[], hasReturning: boolean } {
  const match = sql.match(/RETURNING\s+(.*)/i);
  if (match) {
    const cleanSql = sql.substring(0, match.index).trim();
    const returningCols = match[1].split(',').map(c => c.trim());
    return { cleanSql, returningCols, hasReturning: true };
  }
  return { cleanSql: sql, returningCols: [], hasReturning: false };
}

function getTableName(sql: string): string | null {
  const match = sql.match(
    /^(?:INSERT(?:\s+INTO)?|UPDATE|DELETE(?:\s+FROM)?)\s+([a-zA-Z0-9_]+)/i
  );
  return match ? match[1] : null;
}

function preprocessSqlForSqlite(sql: string, params: any[]): { sql: string, params: any[] } {
  const originalParams = [...params];
  let finalParams: any[] = [];
  const uuidQueue: string[] = [];

  let processedSql = sql.replace(/uuid_generate_v4\(\)/gi, () => {
    uuidQueue.push(randomUUID());
    return '?';
  });
  
  // Стало: (Возвращаем ISO 8601 с буквой T и Z, как это делает Postgres)
processedSql = processedSql.replace(/NOW\(\)/gi, "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");

  const placeholders = processedSql.match(/(\$[0-9]+)|\?/g);

  if (placeholders) {
    let paramIndex = 0;
    let uuidIndex = 0;
    
    placeholders.forEach(p => {
      if (p === '?') {
        if (uuidIndex < uuidQueue.length) {
          finalParams.push(uuidQueue[uuidIndex]);
          uuidIndex++;
        } else {
          if (paramIndex < originalParams.length) {
            finalParams.push(originalParams[paramIndex]);
            paramIndex++;
          }
        }
      } else {
        const idx = parseInt(p.substring(1), 10) - 1;
        if (idx >= 0 && idx < originalParams.length) {
          finalParams.push(originalParams[idx]);
        }
      }
    });
  }

  processedSql = processedSql.replace(/\$[0-9]+/g, '?');

  finalParams = finalParams.map(p => {
    if (p !== null && (Array.isArray(p) || (typeof p === 'object' && !(p instanceof Date)))) {
      return JSON.stringify(p);
    }
    return p;
  });

  return { sql: processedSql, params: finalParams };
}

function handleSqliteQuery<T extends QueryResultRow>(db: Database.Database, sql: string, params: any[]): QueryResult<T> {
    const { cleanSql, returningCols, hasReturning } = parseReturningClause(sql);
    const { sql: processedSql, params: processedParams } = preprocessSqlForSqlite(cleanSql, params);

    const stmt = db.prepare(processedSql);

    const isSelect = processedSql.trim().toUpperCase().startsWith('SELECT');
    
    if (isSelect) {
        const rows = stmt.all(processedParams) as T[];
        return {
            rows: rows,
            rowCount: rows.length,
            command: 'SELECT',
            oid: 0, 
            fields: [],
        };
    }

    const info = stmt.run(processedParams);
    let returnedRows: T[] = [];

    if (hasReturning) {
        const tableName = getTableName(cleanSql);
        if (!tableName) {
            throw new Error('Could not determine table name to emulate RETURNING');
        }

        if (info.changes > 0) {
            const lastId = info.lastInsertRowid;
            if (lastId) {
              const selectStmt = db.prepare(`SELECT ${returningCols.join(', ')} FROM ${tableName} WHERE rowid = ?`);
              const row = selectStmt.get(lastId);
              if (row) returnedRows.push(row as T);
            } else if (cleanSql.toUpperCase().includes('WHERE')) {
                const whereClause = cleanSql.substring(cleanSql.toUpperCase().indexOf('WHERE'));
                const whereParams = processedParams.slice(processedParams.length - whereClause.split('?').length + 1);
                const selectSql = `SELECT ${returningCols.join(', ')} FROM ${tableName} ${whereClause}`;
                const selectStmt = db.prepare(selectSql);
                const rows = selectStmt.all(whereParams);
                returnedRows = rows as T[];
            }
        }
    }

    return {
        rows: returnedRows,
        rowCount: info.changes,
        command: sql.trim().split(' ')[0].toUpperCase() as any,
        oid: 0, 
        fields: [],
    };
}

// --- NEW, RACE-CONDITION-SAFE SQLITE CONNECTION ---

let sqliteDb: Database.Database | undefined;
let sqliteInitPromise: Promise<void> | null = null;

async function getSqliteDb(): Promise<Database.Database> {
  if (sqliteDb) {
    return sqliteDb;
  }

  if (!sqliteInitPromise) {
    sqliteInitPromise = (async () => {
      try {
        const isTest = process.env.NODE_ENV === "test";
        const dbPath = isTest ? ":memory:" : "./dev.sqlite";

        dbLogger.info(`🗄️  Initializing SQLite connection: ${dbPath}`);
        
        const db = new Database(dbPath);
        
        db.pragma("journal_mode = WAL");

        await initializeSQLiteSchema(db);
        
        sqliteDb = db; 
        dbLogger.info("✅ SQLite connection ready.");

      } catch(err) {
        dbLogger.error("❌ FATAL: Failed to initialize SQLite database.", {err});
        sqliteInitPromise = null; 
        // In a real scenario, you might want to handle this more gracefully than exiting
        process.exit(1);
      }
    })();
  }

  await sqliteInitPromise;
  
  if (!sqliteDb) {
      // This should theoretically never happen if the promise resolves correctly
      throw new Error("Database not initialized despite waiting for promise.");
  }

  return sqliteDb;
}

// ... (PostgreSQL connection pool remains the same)
let pool: Pool;

function getPool(): Pool {
    if (!pool) {
        const { user, password, database, host, port } = dbConfig;
        
        const poolConfig = {
            user,
            password,
            database,
            host: isGoogleCloud() ? `/cloudsql/${dbConfig.connectionName}` : host,
            port: isGoogleCloud() ? undefined : port,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            ssl: isGoogleCloud() ? undefined : { rejectUnauthorized: false },
        };

        dbLogger.info('Initializing PostgreSQL connection pool', { 
            host: poolConfig.host, 
            database: poolConfig.database,
            isCloud: isGoogleCloud() 
        });

        try {
            pool = new Pool(poolConfig);
            
            pool.on('connect', () => {
                dbLogger.info('✅ PostgreSQL client connected');
            });

            pool.on('error', (err) => {
                dbLogger.error('❌ Unexpected PostgreSQL pool error', err);
            });
        } catch (error) {
            dbLogger.error('Failed to initialize PostgreSQL pool', error as Error);
            throw new Error('Database pool could not be initialized.');
        }
    }
    return pool;
}


// --- Main query function remains the same, now calling the new getSqliteDb ---
export async function query<T extends QueryResultRow>(
  sql: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const startTime = performance.now();

  if (process.env.USE_SQLITE_DEV === "true") {
    const db = await getSqliteDb();
    try {
      const result = handleSqliteQuery<T>(db, sql, params);
      const duration = performance.now() - startTime;
      dbLogger.debug(`[SQLITE] ✅ Query executed in ${duration.toFixed(2)}ms`, { sql: sql.substring(0, 50) });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      dbLogger.error(`[SQLITE] ❌ Query failed after ${duration.toFixed(2)}ms`, { error });
      throw error;
    }
  }

  const pgPool = getPool();
  try {
    const result = await pgPool.query<T>(sql, params);
    const duration = performance.now() - startTime;
    dbLogger.debug(`[PG] ✅ Query executed in ${duration.toFixed(2)}ms`, { sql: sql.substring(0, 50) });
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    dbLogger.error(`[PG] ❌ Query failed after ${duration.toFixed(2)}ms`, { error });
    throw error;
  }
}

// ... (getPoolStatus remains the same)
export function getPoolStatus() {
    if (process.env.USE_SQLITE_DEV === 'true') {
        // Simplified status for SQLite
        return {
            totalCount: sqliteDb ? 1 : 0,
            idleCount: sqliteDb ? 1 : 0,
            waitingCount: sqliteInitPromise ? 1 : 0, // Approx. waiting if init is in progress
        };
    }

    if (!pool) {
        return {
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
        };
    }
    
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
    };
}

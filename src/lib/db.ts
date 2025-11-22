import { Pool, QueryResult, type QueryResultRow } from 'pg';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { dbConfig, getNodeEnv, isCloud } from './config';
import { logger } from './logger';
import { randomUUID } from 'crypto';
import Database, { Statement } from 'better-sqlite3';

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
            oid: null,
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
        command: sql.trim().split(' ')[0].toUpperCase(),
        oid: null,
        fields: [],
    };
}

let pool: Pool;
function getPool() {
    // ... pg pool init ...
}

// FIX: Swapped to the recommended implementation
let sqliteDb: Database.Database;
let sqliteSchema: string; // Cache for the schema

function getSqliteDb(): Database.Database {
    if (!sqliteDb) {
        const isTest = process.env.NODE_ENV === 'test';
        const dbPath = isTest ? ':memory:' : './dev.sqlite';
        
        logger.info(`🗄️ Initializing SQLite connection: ${dbPath}`);
        
        try {
            sqliteDb = new Database(dbPath);
            
            if (isTest) {
                if (!sqliteSchema) {
                    const schemaPath = path.resolve(__dirname, '../../db/schema-portable.sql');
                    sqliteSchema = fs.readFileSync(schemaPath, 'utf-8');
                }
                sqliteDb.exec(sqliteSchema);
            }
            
            logger.info('✅ SQLite connection initialized');

        } catch (error) {
            logger.error('❌ Failed to initialize SQLite database', { error });
            process.exit(1);
        }
    }
    return sqliteDb;
}

export async function query<T extends QueryResultRow>(
  sql: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const startTime = performance.now();
  
  if (process.env.USE_SQLITE_DEV === 'true') {
      const db = getSqliteDb();
      try {
          const result = handleSqliteQuery<T>(db, sql, params);
          const duration = performance.now() - startTime;
          logger.debug(`[SQLITE] ✅ Query executed in ${duration.toFixed(2)}ms`, { sql, params });
          return result;
      } catch (error) {
          const duration = performance.now() - startTime;
          logger.error(`[SQLITE] ❌ Query failed after ${duration.toFixed(2)}ms`, { error });
          throw error;
      }
  }

  // ... (PostgreSQL logic)
  const pgPool = getPool();
  try {
    const result = await pgPool.query<T>(sql, params);
    const duration = performance.now() - startTime;
    logger.debug(`[PG] ✅ Query executed in ${duration.toFixed(2)}ms`, { sql, params });
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error(`[PG] ❌ Query failed after ${duration.toFixed(2)}ms`, { error });
    throw error;
  }
}

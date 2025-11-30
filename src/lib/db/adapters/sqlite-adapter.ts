// src/lib/db/adapters/sqlite-adapter.ts
import Database from 'better-sqlite3';
import { QueryResult, DbAdapter } from '../types';
import { rewriteSqlForSqlite } from '../utils/rewrite-sqlite';
import { parseReturningClause } from '../utils/parse-returning';
import { normalizeParams } from '../utils/normalize-params';
import { dbLogger } from '../utils/logger';

export class SqliteAdapter implements DbAdapter {
    private db: Database.Database;

    constructor(dbPath: string) {
        dbLogger.info('🗄️ Connecting to SQLite:', dbPath);
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        dbLogger.info('✅ SQLite connection ready.');
    }

    async query<T extends Record<string, any>>(
        sql: string,
        params: any[] = []
    ): Promise<QueryResult<T>> {
        const normalizedParams = normalizeParams(params);
        const { sql: rewrittenSql, params: rewrittenParams } = rewriteSqlForSqlite(sql, normalizedParams);
        const { cleanSql, returningCols, hasReturning } = parseReturningClause(rewrittenSql);
        const command = this.extractCommand(cleanSql);

        try {
            const processedParams = rewrittenParams.map(p => 
                typeof p === 'object' && p !== null ? JSON.stringify(p) : p
            );

            // SELECT queries
            if (command === 'SELECT') {
                const stmt = this.db.prepare(cleanSql);
                const rows = stmt.all(processedParams) as T[];
                
                return {
                    rows,
                    rowCount: rows.length,
                    command,
                    oid: 0,
                    fields: []
                };
            }

            // INSERT/UPDATE/DELETE queries
            const stmt = this.db.prepare(cleanSql);
            const info = stmt.run(processedParams);
            let returnedRows: T[] = [];

            if (hasReturning && returningCols.length > 0) {
                const selectSql = `SELECT ${returningCols.join(', ')} FROM ${this.extractTableName(cleanSql)} WHERE rowid = ?`;
                const selectStmt = this.db.prepare(selectSql);
                const row = selectStmt.get(info.lastInsertRowid);
                if (row) returnedRows = [row as T];
            }

            return {
                rows: returnedRows,
                rowCount: info.changes,
                command,
                oid: 0,
                fields: []
            };
        } catch (error) {
            dbLogger.error('SQLite query failed', error as Error);
            throw error;
        }
    }

    async transaction<T>(callback: (client: DbAdapter) => Promise<T>): Promise<T> {
        const transactionFn = this.db.transaction((cb: () => T) => cb());
        
        return transactionFn(() => {
            return callback(this) as T;
        });
    }

    private extractTableName(sql: string): string {
        const match = sql.match(/(?:INSERT INTO|UPDATE|DELETE FROM)\s+(\w+)/i);
        return match ? match[1] : 'unknown';
    }

    private extractCommand(sql: string): string {
        const match = sql.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i);
        return match ? match[1].toUpperCase() : 'UNKNOWN';
    }
}

const dbPath = process.env.SQLITE_DB_PATH || ':memory:';
export const sqliteAdapter = new SqliteAdapter(dbPath);
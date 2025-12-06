// src/lib/db/adapters/sqlite-adapter.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DbAdapter, QueryResult } from '../types';
import { dbLogger } from '../utils/logger';
import { rewriteSqlForSqlite } from '../utils/rewrite-sqlite';

const defaultPath = path.join(process.cwd(), 'dev.sqlite');

const dir = path.dirname(defaultPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export class SqliteAdapter implements DbAdapter {
  private db: Database.Database;

  constructor(dbPath: string) {
    dbLogger.info(`🗄️ Connecting SQLite → ${dbPath}`);
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  private extractCommand(sql: string): string {
    return sql.trim().split(/\s+/)[0].toUpperCase();
  }

  private extractTableName(sql: string): string {
    const match = sql.match(/into\s+([a-zA-Z0-9_]+)/i);
    return match ? match[1] : '';
  }

  private parseReturning(sql: string) {
    const match = sql.match(/returning\s+(.+)$/i);
    if (!match) return { hasReturning: false, returningCols: [], cleanSql: sql };

    const returningCols = match[1].split(',').map(s => s.trim());
    const cleanSql = sql.replace(/returning\s+(.+)$/i, '').trim();

    return { hasReturning: true, returningCols, cleanSql };
  }

  async query<T extends Record<string, any>>(
    sql: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    try {
      const { sql: rewrittenSql, params: rewrittenParams } =
        rewriteSqlForSqlite(sql, params);

      const { hasReturning, returningCols, cleanSql } =
        this.parseReturning(rewrittenSql);

      const command = this.extractCommand(cleanSql);
      const processedParams = rewrittenParams.map(p =>
        typeof p === 'object' && p !== null ? JSON.stringify(p) : p
      );

      // SELECT branch
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

      // INSERT / UPDATE / DELETE branch
      const stmt = this.db.prepare(cleanSql);
      const info = stmt.run(processedParams);
      let returnedRows: T[] = [];

      // Handle RETURNING — only for INSERT
      if (hasReturning && returningCols.length > 0 && command === 'INSERT') {
        const table = this.extractTableName(cleanSql);
        const selectSql = `SELECT ${returningCols.join(', ')} FROM ${table} WHERE rowid = ?`;
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
      dbLogger.error('[SQLite] Query failed', error as Error);
      throw error;
    }
  }

  async transaction<T>(callback: (trx: DbAdapter) => Promise<T>): Promise<T> {
    const begin = this.db.prepare('BEGIN');
    const commit = this.db.prepare('COMMIT');
    const rollback = this.db.prepare('ROLLBACK');

    begin.run();
    try {
      const result = await callback(this);
      commit.run();
      return result;
    } catch (error) {
      rollback.run();
      throw error;
    }
  }
}

export const sqliteAdapter = new SqliteAdapter(defaultPath);

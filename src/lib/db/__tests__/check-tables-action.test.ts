// src/lib/db/__tests__/check-tables-action.test.ts
import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

import { checkTablesAction } from '../../actions/db.actions';
import * as db from '../index';

const TEST_DB_PATH = path.join(process.cwd(), 'test-checktables.sqlite');

describe('checkTablesAction (SQLite)', () => {
  let mockQuery: any;

  beforeAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    const dbSqlite = new Database(TEST_DB_PATH);
    dbSqlite.exec(`
      CREATE TABLE products (id TEXT PRIMARY KEY, title TEXT NOT NULL);
      CREATE TABLE orders (id TEXT PRIMARY KEY, customer_name TEXT NOT NULL);
    `);
    dbSqlite.close();

    // Установить USE_SQLITE_DEV для checkTablesAction
    process.env.USE_SQLITE_DEV = 'true';

    // Мокаем query для SQLite
    mockQuery = vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: any[]) => {
      const tableName = params?.[0];
      const existingTables = ['products', 'orders'];
      
      // SQLite возвращает rows с name или пустой массив
      if (existingTables.includes(tableName)) {
        return {
          rows: [{ name: tableName }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        };
      }
      
      return {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
    });
  });

  afterAll(() => {
    mockQuery.mockRestore();
    delete process.env.USE_SQLITE_DEV;
  });

  it('should detect existing and missing tables', async () => {
    const result = await checkTablesAction();

    expect(result).toContainEqual({ name: 'orders', exists: true });
    expect(result).toContainEqual({ name: 'products', exists: true });
    expect(result).toContainEqual({ name: 'categories', exists: false });
    expect(result).toContainEqual({ name: 'users', exists: false });
  });
});

describe('checkTablesAction (Postgres mocked)', () => {
  let mockQuery: any;

  beforeAll(() => {
    // Убедиться что SQLite выключен
    delete process.env.USE_SQLITE_DEV;

    mockQuery = vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: any[]) => {
      const table = params?.[0];

      const baseResult = {
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      if (table === 'orders') {
        return { ...baseResult, rows: [{ exists: true }] };
      }
      if (table === 'products') {
        return { ...baseResult, rows: [{ exists: false }] };
      }
      if (table === 'categories') {
        return { ...baseResult, rows: [{ exists: true }] };
      }

      return { ...baseResult, rows: [{ exists: false }], rowCount: 0 };
    });
  });

  afterAll(() => {
    mockQuery.mockRestore();
  });

  it('should return correct values using mocked Postgres responses', async () => {
    const result = await checkTablesAction();

    expect(result).toContainEqual({ name: 'orders', exists: true });
    expect(result).toContainEqual({ name: 'products', exists: false });
    expect(result).toContainEqual({ name: 'categories', exists: true });
  });
});
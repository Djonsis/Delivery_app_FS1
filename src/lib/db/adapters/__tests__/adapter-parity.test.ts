import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { SqliteAdapter } from '../sqlite-adapter';

const TEST_DB_PATH = path.join(process.cwd(), 'test-parity.sqlite');
let db: Database.Database;
let adapter: SqliteAdapter;

beforeAll(() => {
  // reset db
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  db = new Database(TEST_DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      sku_prefix TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      nutrition TEXT
    );
  `);

  // 👉 Use isolated adapter for parity tests
  adapter = new SqliteAdapter(TEST_DB_PATH);
});

afterEach(() => {
  db.exec('DELETE FROM categories');
  db.exec('DELETE FROM products');
});

describe('Adapter Parity: RETURNING', () => {
  it('should return inserted row', async () => {
    const result = await adapter.query<{ id: string; name: string }>(
      `INSERT INTO categories (id, name, slug, sku_prefix, created_at) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2, $3, datetime('now')) 
       RETURNING id, name`,
      ['Test Category', 'test-cat', 'TEST']
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toHaveProperty('id');
    expect(result.rows[0].name).toBe('Test Category');
  });

  it('should return multiple columns', async () => {
    const result = await adapter.query<{ id: string; name: string; slug: string }>(
      `INSERT INTO categories (id, name, slug, sku_prefix, created_at) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2, $3, datetime('now')) 
       RETURNING id, name, slug`,
      ['Multi Column', 'multi-col', 'MC']
    );

    expect(result.rows[0]).toHaveProperty('id');
    expect(result.rows[0]).toHaveProperty('name');
    expect(result.rows[0]).toHaveProperty('slug');
  });
});

// … дальше НИЧЕГО не меняем …


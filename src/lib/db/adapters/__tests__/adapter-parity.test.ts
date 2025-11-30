import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { sqliteAdapter } from '../sqlite-adapter';

const TEST_DB_PATH = path.join(process.cwd(), 'test-parity.sqlite');
let db: Database.Database;

beforeAll(() => {
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
});

afterEach(() => {
  db.exec('DELETE FROM categories');
  db.exec('DELETE FROM products');
});

describe('Adapter Parity: RETURNING', () => {
  it('should return inserted row', async () => {
    const result = await sqliteAdapter.query<{ id: string; name: string }>(
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
    const result = await sqliteAdapter.query<{ id: string; name: string; slug: string }>(
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

describe('Adapter Parity: JSON', () => {
    it('should handle JSON objects', async () => {
      const nutritionData = { calories: 250, protein: 10, carbs: 30 };
  
      const insertResult = await sqliteAdapter.query<{ id: string; nutrition: string }>(
        `INSERT INTO products (id, title, price, nutrition) 
         VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2, $3) 
         RETURNING id, nutrition`,
        ['Test Product', 100, JSON.stringify(nutritionData)]
      );
  
      const parsed = JSON.parse(insertResult.rows[0].nutrition);
      expect(parsed).toEqual(nutritionData);
    });
  
    it('should handle nested JSON', async () => {
      const complexData = { 
        nested: { value: 42, array: [1, 2, 3] },
        tags: ['a', 'b', 'c']
      };
  
      const result = await sqliteAdapter.query<{ nutrition: string }>(
        `INSERT INTO products (id, title, price, nutrition) 
         VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2, $3) 
         RETURNING nutrition`,
        ['Complex', 50, JSON.stringify(complexData)]
      );
  
      const parsed = JSON.parse(result.rows[0].nutrition);
      expect(parsed).toEqual(complexData);
    });
  });

describe('Adapter Parity: UUID', () => {
  it('should generate valid UUIDs', async () => {
    const result = await sqliteAdapter.query<{ id: string }>(
      `INSERT INTO products (id, title, price) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2) 
       RETURNING id`,
      ['UUID Test', 50]
    );

    expect(result.rows[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should generate unique UUIDs', async () => {
    const result1 = await sqliteAdapter.query<{ id: string }>(
      `INSERT INTO products (id, title, price) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2) 
       RETURNING id`,
      ['Product 1', 10]
    );

    const result2 = await sqliteAdapter.query<{ id: string }>(
      `INSERT INTO products (id, title, price) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2) 
       RETURNING id`,
      ['Product 2', 20]
    );

    expect(result1.rows[0].id).not.toBe(result2.rows[0].id);
  });
});

describe('Adapter Parity: NOW()', () => {
  it('should set created_at timestamp', async () => {
    const beforeInsert = new Date();

    const result = await sqliteAdapter.query<{ created_at: string }>(
      `INSERT INTO categories (id, name, slug, sku_prefix, created_at) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2, $3, datetime('now')) 
       RETURNING created_at`,
      ['Timestamp Test', 'ts-test', 'TS']
    );

    const createdAt = new Date(result.rows[0].created_at);
    expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000);
    expect(createdAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

describe('Adapter Parity: Parameter Transform', () => {
  it('should transform $1, $2 to ?', async () => {
    const result = await sqliteAdapter.query<{ title: string; price: number }>(
      'INSERT INTO products (id, title, price) VALUES (lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-\' || lower(hex(randomblob(2))) || \'-\' || lower(hex(randomblob(2))) || \'-\' || lower(hex(randomblob(6))), $1, $2) RETURNING title, price',
      ['Param Test', 99.99]
    );

    expect(result.rows[0].title).toBe('Param Test');
    expect(result.rows[0].price).toBe(99.99);
  });
});
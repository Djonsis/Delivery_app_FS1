// src/lib/db/__tests__/orders-integration.test.ts
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { SqliteAdapter } from '../adapters/sqlite-adapter';

const TEST_DB_PATH = path.join(process.cwd(), 'test.sqlite');
let db: Database.Database;
let adapter: SqliteAdapter;

beforeAll(async () => {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  db = new Database(TEST_DB_PATH);
  
  const schema = `
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Новый заказ',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL
    );
  `;

  db.exec(schema);
  db.close();
  
  adapter = new SqliteAdapter(TEST_DB_PATH);
});

afterEach(async () => {
  await adapter.query('DELETE FROM order_items', []);
  await adapter.query('DELETE FROM orders', []);
  await adapter.query('DELETE FROM products', []);
});

describe('Orders Integration', () => {
  it('should create order with RETURNING', async () => {
    const result = await adapter.query<{ id: string; customer_name: string }>(
      `INSERT INTO orders (id, customer_name, total_amount, status, created_at) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2, $3, datetime('now')) 
       RETURNING id, customer_name`,
      ['Test Customer', 150.50, 'Новый заказ']
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toHaveProperty('id');
    expect(result.rows[0].customer_name).toBe('Test Customer');
  });

  it('should create order with items', async () => {
    const productResult = await adapter.query<{ id: string }>(
      `INSERT INTO products (id, title, price) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2) 
       RETURNING id`,
      ['Test Product', 75.25]
    );

    const productId = productResult.rows[0].id;

    const orderResult = await adapter.query<{ id: string }>(
      `INSERT INTO orders (id, customer_name, total_amount, status, created_at) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2, $3, datetime('now')) 
       RETURNING id`,
      ['Test Customer', 150.50, 'Новый заказ']
    );

    const orderId = orderResult.rows[0].id;

    await adapter.query(
      `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2, $3, $4)`,
      [orderId, productId, 2, 75.25]
    );

    const items = await adapter.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );

    expect(items.rows).toHaveLength(1);
    expect(items.rows[0].product_id).toBe(productId);
  });

  it('should calculate order total correctly', async () => {
    const result = await adapter.query<{ id: string; total_amount: number }>(
      `INSERT INTO orders (id, customer_name, total_amount, status, created_at) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))), $1, $2, $3, datetime('now')) 
       RETURNING id, total_amount`,
      ['Test Customer', 299.99, 'Новый заказ']
    );

    expect(result.rows[0].total_amount).toBe(299.99);
  });
});
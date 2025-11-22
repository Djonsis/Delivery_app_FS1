// src/lib/__tests__/db.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { query } from '../db';
import { randomUUID } from 'crypto';

describe('Database Adapter - SQLite', () => {
    beforeAll(() => {
        // Убеждаемся, что тест запущен в SQLite режиме
        process.env.USE_SQLITE_DEV = 'true';
        process.env.NODE_ENV = 'test'; // Гарантируем, что используется :memory: DB
    });

    it('should execute simple SELECT query', async () => {
        const result = await query('SELECT 1 as test');
        
        expect(result.rows).toBeDefined();
        expect(result.rows.length).toBeGreaterThan(0);
        expect(result.rows[0].test).toBe(1);
    });

    it('should handle parameterized queries with $1, $2', async () => {
        const result = await query(
            'SELECT $1 as first, $2 as second',
            ['hello', 'world']
        );
        
        expect(result.rows[0].first).toBe('hello');
        expect(result.rows[0].second).toBe('world');
    });

    it('should support INSERT with RETURNING', async () => {
        const categoryId = randomUUID();
        
        const result = await query(
            `INSERT INTO categories (id, name, slug, sku_prefix) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [categoryId, 'Test Category', 'test-cat', 'TST']
        );
        
        expect(result.rows).toBeDefined();
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].id).toBe(categoryId);
        expect(result.rows[0].name).toBe('Test Category');
    });

    it('should support uuid_generate_v4() function', async () => {
        const result = await query(
            `INSERT INTO categories (id, name, slug, sku_prefix) 
             VALUES (uuid_generate_v4(), $1, $2, $3) RETURNING *`,
            ['Auto UUID Category', 'auto-uuid', 'AUT']
        );
        
        expect(result.rows).toBeDefined();
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
    });

    it('should handle JSONB fields as TEXT', async () => {
        const productId = randomUUID();
        const nutrition = {
            calories: 100,
            protein: 5,
            carbs: 20
        };
        
        const result = await query(
            `INSERT INTO products 
             (id, title, price, unit, nutrition) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [productId, 'Test Product', 150, 'pcs', nutrition]
        );
        
        expect(result.rows[0].nutrition).toBeDefined();
        
        const parsedNutrition = JSON.parse(result.rows[0].nutrition);
        expect(parsedNutrition.calories).toBe(100);
    });

    it('should handle array fields as TEXT', async () => {
        const productId = randomUUID();
        const tags = ['organic', 'fresh', 'local'];
        
        const result = await query(
            `INSERT INTO products 
             (id, title, price, unit, tags) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [productId, 'Tagged Product', 200, 'kg', tags]
        );
        
        expect(result.rows[0].tags).toBeDefined();
        
        const parsedTags = JSON.parse(result.rows[0].tags);
        expect(parsedTags).toEqual(tags);
    });

    it('should support UPDATE with RETURNING', async () => {
        const productId = randomUUID();
        await query(
            `INSERT INTO products (id, title, price, unit) 
             VALUES ($1, $2, $3, $4)`,
            [productId, 'Update Test', 100, 'pcs']
        );
        
        const result = await query(
            `UPDATE products SET price = $1 WHERE id = $2 RETURNING *`,
            [250, productId]
        );
        
        expect(result.rows).toBeDefined();
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].price).toBe(250);
    });

    it('should support DELETE operations', async () => {
        const productId = randomUUID();
        await query(
            `INSERT INTO products (id, title, price, unit) 
             VALUES ($1, $2, $3, $4)`,
            [productId, 'Delete Test', 100, 'pcs']
        );
        
        const result = await query(
            `DELETE FROM products WHERE id = $1`,
            [productId]
        );
        
        expect(result.rowCount).toBe(1);
        
        const checkResult = await query(
            `SELECT * FROM products WHERE id = $1`,
            [productId]
        );
        expect(checkResult.rows.length).toBe(0);
    });
});
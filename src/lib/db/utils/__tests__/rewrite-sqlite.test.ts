import { describe, it, expect } from 'vitest';
import { rewriteSqlForSqlite } from '../rewrite-sqlite';

describe('rewriteSqlForSqlite', () => {
  it('should replace uuid_generate_v4()', () => {
    const result = rewriteSqlForSqlite(
      'INSERT INTO orders (id) VALUES (uuid_generate_v4())',
      []
    );
    expect(result.sql).toContain('?');
    expect(result.params.length).toBeGreaterThan(0);
  });

  it('should replace NOW()', () => {
    const result = rewriteSqlForSqlite(
      'INSERT INTO orders (created_at) VALUES (NOW())',
      []
    );
    expect(result.sql).toContain("strftime('%Y-%m-%dT%H:%M:%SZ','now')");
  });

  it('should transform $1 to ?', () => {
    const result = rewriteSqlForSqlite(
      'INSERT INTO products (title, price) VALUES ($1, $2)',
      ['Test', 100]
    );
    expect(result.sql).toBe('INSERT INTO products (title, price) VALUES (?, ?)');
    expect(result.params).toEqual(['Test', 100]);
  });

  it('should handle mixed replacements', () => {
    const result = rewriteSqlForSqlite(
      'INSERT INTO orders (id, created_at, customer_name) VALUES (uuid_generate_v4(), NOW(), $1)',
      ['John']
    );
    expect(result.sql).toContain('?');
    expect(result.sql).toContain("strftime('%Y-%m-%dT%H:%M:%SZ','now')");
    expect(result.params).toContain('John');
  });
});

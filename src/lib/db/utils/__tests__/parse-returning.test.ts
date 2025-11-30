import { describe, it, expect } from 'vitest';
import { parseReturningClause } from '../parse-returning';

describe('parseReturningClause', () => {
  it('should parse INSERT with RETURNING', () => {
    const result = parseReturningClause(
      'INSERT INTO orders (customer_name, total_amount) VALUES ($1, $2) RETURNING id, created_at'
    );

    expect(result).toEqual({
      cleanSql: 'INSERT INTO orders (customer_name, total_amount) VALUES ($1, $2)',
      returningCols: ['id', 'created_at'],
      hasReturning: true
    });
  });

  it('should handle UPDATE without RETURNING', () => {
    const result = parseReturningClause('UPDATE products SET price = $1');

    expect(result).toEqual({
      cleanSql: 'UPDATE products SET price = $1',
      returningCols: [],
      hasReturning: false
    });
  });

  it('should handle multiple columns in RETURNING', () => {
    const result = parseReturningClause(
      'INSERT INTO products (title, price) VALUES ($1, $2) RETURNING id, title, price, created_at'
    );

    expect(result.returningCols).toEqual(['id', 'title', 'price', 'created_at']);
  });
});
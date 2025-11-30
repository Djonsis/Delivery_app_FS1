import { describe, it, expect } from 'vitest';
import { getTableName } from '../get-table-name';

describe('getTableName', () => {
  it('should extract table name from INSERT', () => {
    expect(getTableName('INSERT INTO orders (name) VALUES ($1)')).toBe('orders');
  });

  it('should extract table name from UPDATE', () => {
    expect(getTableName('UPDATE products SET price = $1')).toBe('products');
  });

  it('should extract table name from DELETE', () => {
    expect(getTableName('DELETE FROM categories WHERE id = $1')).toBe('categories');
  });

  it('should return null for invalid SQL', () => {
    expect(getTableName('INVALID SQL')).toBeNull();
  });
});
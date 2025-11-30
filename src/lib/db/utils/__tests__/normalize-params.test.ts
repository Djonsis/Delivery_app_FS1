// src/lib/db/utils/__tests__/normalize-params.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeParams } from '../normalize-params';

describe('normalizeParams', () => {
  it('should serialize objects to JSON', () => {
    const result = normalizeParams([{ calories: 250, protein: 10 }]);
    expect(result).toEqual(['{"calories":250,"protein":10}']);
  });

  it('should serialize arrays to JSON', () => {
    const result = normalizeParams([[1, 2, 3]]);
    expect(result).toEqual(['[1,2,3]']);
  });

  it('should keep primitives unchanged', () => {
    const result = normalizeParams([10, 'text', null, true]);
    expect(result).toEqual([10, 'text', null, true]);
  });

  it('should handle mixed types', () => {
    const result = normalizeParams([
      'text',
      { key: 'value' },
      100,
      [1, 2],
      null
    ]);
    expect(result).toEqual([
      'text',
      '{"key":"value"}',
      100,
      '[1,2]',
      null
    ]);
  });

  it('should handle empty array', () => {
    const result = normalizeParams([]);
    expect(result).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { DbProductSchema } from './product.schema';

// Мок "сырых" данных, имитирующих запись из PostgreSQL
const mockPgProduct = {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    sku: 'SKU123',
    title: 'PostgreSQL Product',
    description: 'A product from a PostgreSQL database',
    price: '199.99', // PG NUMERIC может прийти как строка
    currency: 'RUB',
    category_id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
    tags: '["tag1", "tag2"]', // PG JSON может быть строкой
    image_url: 'http://example.com/image.png',
    rating: '4.5', // PG NUMERIC как строка
    reviews: 50,
    category_name: 'Electronics',
    is_weighted: false, // PG boolean
    unit: 'pcs',
    weight_category: null,
    price_per_unit: null,
    price_unit: null,
    min_order_quantity: 1,
    step_quantity: 1,
    weight_template_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    brand: 'BrandName',
    manufacturer: 'Factory',
    nutrition: '{"calories": "100", "protein": "10g"}' // PG JSON как строка
};

// Мок "сырых" данных, имитирующих запись из SQLite
const mockSqliteProduct = {
    ...mockPgProduct,
    title: 'SQLite Product',
    price: 150.75, // SQLite INTEGER/REAL это number
    rating: 4, // SQLite INTEGER/REAL это number
    is_weighted: 0, // SQLite boolean это 0/1
    tags: null, // SQLite может вернуть NULL для JSON
    nutrition: null // SQLite может вернуть NULL для JSON
};

describe('DbProductSchema', () => {

    it('should correctly validate data from PostgreSQL', () => {
        const result = DbProductSchema.safeParse(mockPgProduct);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.is_weighted).toBe(false);
            expect(typeof result.data.price).toBe('number');
            expect(result.data.price).toBe(199.99);
            expect(Array.isArray(result.data.tags)).toBe(true);
            expect(result.data.nutrition).toEqual({calories: "100", protein: "10g"});
        }
    });

    it('should correctly validate data from SQLite', () => {
        const result = DbProductSchema.safeParse(mockSqliteProduct);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.is_weighted).toBe(false); // 0 должно стать false
            expect(typeof result.data.price).toBe('number');
            expect(result.data.price).toBe(150.75);
            expect(result.data.tags).toEqual([]); // null должен стать пустым массивом
            expect(result.data.nutrition).toBeNull();
        }
    });

    it('should handle non-weighted products correctly', () => {
        const nonWeighted = {
            ...mockSqliteProduct,
            is_weighted: 0,
            unit: 'pcs',
            weight_category: null,
            price_per_unit: null,
            price_unit: null,
            weight_template_id: null,
        };
        const result = DbProductSchema.safeParse(nonWeighted);
        expect(result.success).toBe(true);
        if(result.success){
            expect(result.data.weight_category).toBeNull();
            expect(result.data.price_per_unit).toBeNull();
            expect(result.data.price_unit).toBeNull();
            expect(result.data.weight_template_id).toBeNull();
        }
    });

    it('should fail on invalid data', () => {
        const invalidProduct = {
            ...mockPgProduct,
            price: -100 // Невалидное значение
        };
        const result = DbProductSchema.safeParse(invalidProduct);
        expect(result.success).toBe(false);
    });
});

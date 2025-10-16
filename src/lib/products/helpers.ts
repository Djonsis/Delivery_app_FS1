
import { DbProductSchema } from "@/lib/schemas/product.schema";
import { validateDbRow } from "@/lib/utils/validateDbRow";
import type { Product, ProductCreateInput, ProductUpdateInput } from "@/lib/types";
import { categoriesService } from "@/lib/categories.service";
import { serverLogger } from "@/lib/server-logger";
import { query } from "@/lib/db";

const log = serverLogger.withCategory("PRODUCTS_HELPERS");

export function toPostgresArray(arr?: string[] | null): string | null {
    if (!arr || arr.length === 0) {
        return null;
    }
    const escapedElements = arr.map(el => `"${el.replace(/\\/g, '\\\\').replace(/"/g, '\"\"')}"`);
    return `{${escapedElements.join(',')}}`;
}

/**
 * Safely maps a raw database row to a structured Product object.
 */
export function mapDbProductToProduct(dbRow: Record<string, unknown>): Product {
    // 1. VALIDATE & TRANSFORM: Zod schema handles parsing and type conversion.
    const validated = validateDbRow(dbRow, DbProductSchema, 'mapDbProductToProduct');

    // 2. MAP: Data is now clean and type-safe.
    return {
        id: validated.id,
        sku: validated.sku,
        title: validated.title,
        description: validated.description,
        price: validated.price,
        currency: validated.currency,
        category_id: validated.category_id,
        category: validated.category_name ?? null, // optional joined field
        tags: Object.freeze(validated.tags ?? []), // Return as a readonly, non-null array
        imageUrl: validated.image_url ?? `https://placehold.co/600x400.png?text=${encodeURIComponent(validated.title)}`,
        rating: validated.rating,
        reviews: validated.reviews,
        brand: validated.brand,
        manufacturer: validated.manufacturer,
        nutrition: validated.nutrition ?? null,
        created_at: validated.created_at,
        updated_at: validated.updated_at,
        deleted_at: validated.deleted_at,
        is_weighted: validated.is_weighted,
        unit: validated.unit,
        price_per_unit: validated.price_per_unit,
        price_unit: validated.price_unit,
        min_order_quantity: validated.min_order_quantity,
        step_quantity: validated.step_quantity,
        weight_template_id: validated.weight_template_id,
    };
}

export async function generateSkuForCategory(categoryId: string, maxRetries: number = 3): Promise<string> {
    const category = await categoriesService.getById(categoryId);
    if (!category || !category.sku_prefix) {
        log.warn("Cannot generate SKU. Category or SKU prefix not found.", { categoryId });
        throw new Error("Категория или префикс для артикула не найдены.");
    }

    const countResult = await query(
        'SELECT COUNT(*) FROM products WHERE category_id = $1',
        [categoryId]
    );
    const productCount = parseInt(countResult.rows[0].count, 10);

    for (let i = 0; i < maxRetries; i++) {
        const nextNumber = productCount + 1 + i;
        const paddedNumber = nextNumber.toString().padStart(3, '0');
        const sku = `${category.sku_prefix}-${paddedNumber}`;

        const { rows } = await query("SELECT 1 FROM products WHERE sku = $1", [sku]);
        if (rows.length === 0) {
            log.info(`Generated unique SKU: ${sku}`, { attempt: i + 1 });
            return sku;
        }

        log.warn(`SKU ${sku} already exists, retrying...`, { attempt: i + 1 });
    }
    
    throw new Error(`Failed to generate a unique SKU for category ${categoryId} after ${maxRetries} retries.`);
}

export function prepareProductCreateParams(data: ProductCreateInput, sku: string): unknown[] {
    const safeTags = (data.tags && data.tags.length > 0) ? toPostgresArray(data.tags) : null;

    return [
        data.title.trim(),
        sku,
        data.description ?? null,
        data.price,
        data.currency ?? 'RUB',
        data.category_id,
        safeTags,
        data.imageUrl ?? null,
        data.rating ?? 4.5,
        data.reviews ?? 0,
        data.is_weighted ?? false,
        data.unit ?? 'pcs',
        data.price_per_unit ?? null,
        data.price_unit ?? null,
        data.min_order_quantity ?? 1,
        data.step_quantity ?? 1,
        data.weight_template_id ?? null,
    ];
}

export function prepareProductUpdateParams(productData: Partial<ProductUpdateInput>): { setClause: string; values: unknown[] } {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    const mapping: Record<keyof ProductUpdateInput, string> = {
        title: 'title',
        description: 'description',
        price: 'price',
        currency: 'currency',
        category_id: 'category_id',
        tags: 'tags',
        imageUrl: 'image_url',
        rating: 'rating',
        reviews: 'reviews',
        is_weighted: 'is_weighted',
        unit: 'unit',
        price_per_unit: 'price_per_unit',
        price_unit: 'price_unit',
        min_order_quantity: 'min_order_quantity',
        step_quantity: 'step_quantity',
        weight_template_id: 'weight_template_id',
    };

    let valueIndex = 1;
    (Object.keys(productData) as (keyof ProductUpdateInput)[]).forEach(key => {
        if (productData[key] !== undefined) {
            let value = productData[key];

            if (key === 'tags') {
                const tags = value as string[] | undefined;
                value = (tags && tags.length > 0) ? toPostgresArray(tags) : null;
            } else if (key === 'title' && typeof value === 'string') {
                value = value.trim();
            }
            
            setClauses.push(`${mapping[key]} = $${valueIndex++}`);
            values.push(value ?? null); // Ensure undefined becomes null for SQL
        }
    });

    if (setClauses.length === 0) {
        throw new Error('No fields provided for update. Aborting.');
    }

    setClauses.push(`updated_at = NOW()`);

    return {
        setClause: setClauses.join(', '),
        values
    };
}

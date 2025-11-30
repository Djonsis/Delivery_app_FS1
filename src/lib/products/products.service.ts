
import { randomUUID } from 'crypto';
import type { Product, ProductFilter, ProductCreateInput, ProductUpdateInput } from "@/lib/types";
import { serverLogger } from "@/lib/server-logger";
import { query } from "@/lib/db/db";
import { categoriesService } from "@/lib/categories.service";
import { mapDbRowToProduct } from "./helpers";
import { validateDbRow, validateDbRows, DbValidationError } from "@/lib/utils/validate-db-row";
import { DbProductSchema } from "@/lib/schemas/product.schema";

const log = serverLogger.withCategory("PRODUCTS_SERVICE");

// Type guard для ошибок БД
function isDbError(error: unknown): error is { code: string; constraint: string } {
    return typeof error === "object" && error !== null && "code" in error && "constraint" in error;
}

async function getAll(filters: ProductFilter = {}): Promise<Product[]> {
    const { query: searchQuery, categoryId, minPrice, maxPrice, sort, limit = 50, offset = 0 } = filters;
    log.info("💾 Fetching products from DB with filters.", { filters });

    try {
        let baseQuery = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id`;
        const whereClauses: string[] = ["p.deleted_at IS NULL"];
        const queryParams: unknown[] = [];

        if (searchQuery) {
            queryParams.push(`%${searchQuery}%`);
            whereClauses.push(`(p.title LIKE $${queryParams.length} OR p.description LIKE $${queryParams.length})`);
        }

        if (categoryId) {
            queryParams.push(categoryId);
            whereClauses.push(`p.category_id = $${queryParams.length}`);
        }

        if (minPrice !== undefined) { queryParams.push(minPrice); whereClauses.push(`p.price >= $${queryParams.length}`); }
        if (maxPrice !== undefined) { queryParams.push(maxPrice); whereClauses.push(`p.price <= $${queryParams.length}`); }

        if (whereClauses.length > 0) baseQuery += ` WHERE ${whereClauses.join(" AND ")}`;
        
        let orderByClause = " ORDER BY p.created_at DESC";
        switch (sort) {
            case "price_asc": orderByClause = " ORDER BY p.price ASC"; break;
            case "price_desc": orderByClause = " ORDER BY p.price DESC"; break;
            case "rating_desc": orderByClause = " ORDER BY p.rating DESC"; break;
            case "popularity": orderByClause = " ORDER BY p.reviews DESC"; break;
        }
        baseQuery += orderByClause;

        queryParams.push(limit, offset);
        baseQuery += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

        const { rows } = await query(baseQuery, queryParams);
        log.debug(`Fetched ${rows.length} raw products from DB.`);

        const validatedRows = validateDbRows(rows, DbProductSchema, "getAllProducts", { skipInvalid: true });
        return validatedRows.map(mapDbRowToProduct);

    } catch (error) {
        log.error("Database error in getAll()", { error });
        throw error;
    }
}

async function getById(id: string): Promise<Product | null> {
    log.info("💾 Fetching product by ID.", { id });
    try {
        const { rows } = await query(`
            SELECT p.*, c.name as category_name
            FROM products p LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1 AND p.deleted_at IS NULL
        `, [id]);

        if (rows.length === 0) return null;

        const validatedRow = validateDbRow(rows[0], DbProductSchema, "getById");
        return mapDbRowToProduct(validatedRow); 

    } catch (error) {
        if (error instanceof DbValidationError) {
            log.warn("Product validation failed in getById(). Corrupted data.", { id, details: error.message });
            return null;
        }
        log.error("Database error in getById()", { id, error });
        throw error;
    }
}

async function create(data: ProductCreateInput): Promise<{ success: boolean; message: string; product?: Product }> {
    log.info("💾 Attempting to create product.", { title: data.title });

    try {
        const productId = randomUUID();
        
        const category = await categoriesService.getById(data.category_id);
        if (!category || !category.sku_prefix) {
            return { success: false, message: "Категория или префикс для артикула не найдены." };
        }

        // ✅ ИСПРАВЛЕНИЕ: Находим максимальный существующий SKU в этой категории
        const maxSkuResult = await query(
            `SELECT sku FROM products 
             WHERE category_id = $1 AND sku LIKE $2
             ORDER BY sku DESC LIMIT 1`,
            [data.category_id, `${category.sku_prefix}-%`]
        );

        let nextNumber = 1; // По умолчанию, если товаров нет

        if (maxSkuResult.rows.length > 0) {
            const lastSku = maxSkuResult.rows[0].sku as string;
            // Извлекаем номер из "VEG-001" -> "001"
            const match = lastSku.match(/-(\d+)$/);
            if (match) {
                const lastNumber = parseInt(match[1], 10);
                nextNumber = lastNumber + 1;
            }
        }

        const paddedNumber = nextNumber.toString().padStart(3, '0');
        const sku = `${category.sku_prefix}-${paddedNumber}`;

        // ✅ ДОБАВЛЕНО: Логирование для отладки
        log.debug("SKU Generation", {
            categoryId: data.category_id,
            prefix: category.sku_prefix,
            maxExistingSku: maxSkuResult.rows[0]?.sku ?? 'none',
            nextNumber,
            generatedSku: sku
        });

        const params = [
            productId,  
            data.title.trim(),
            sku,
            data.description ?? null,
            data.price,
            data.currency ?? 'RUB',
            data.category_id,
            JSON.stringify(data.tags),
            data.imageUrl ?? null,
            data.rating ?? 4.5,
            data.reviews ?? 0,
            data.is_weighted ? 1 : 0,
            data.unit ?? 'pcs',
            data.price_per_unit ?? null,
            data.price_unit ?? null,
            data.min_order_quantity ?? 1,
            data.step_quantity ?? 1,
            data.weight_template_id ?? null,
        ];

        await query(`
            INSERT INTO products (
                id, title, sku, description, price, currency, category_id, tags, image_url,
                rating, reviews, is_weighted, unit, price_per_unit, price_unit,
                min_order_quantity, step_quantity, weight_template_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, params);
        
        const { rows } = await query(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1',
            [productId]
        );
        
        if (rows.length === 0) {
            throw new Error('Failed to retrieve created product');
        }
        
        const validatedRow = validateDbRow(rows[0], DbProductSchema, "createProduct");
        const product = mapDbRowToProduct(validatedRow);
        log.info("✅ Successfully created product", { id: product.id, title: product.title, sku: product.sku });

        return { success: true, message: "Товар успешно создан.", product };

    } catch (error) {
        log.error("Database error in create()", { error, productData: data });
        if (isDbError(error) && error.code === "23505") {
             return { success: false, message: `Товар с таким ${error.constraint.includes('sku') ? 'артикулом' : 'названием'} уже существует.` };
        }
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
             return { success: false, message: `Товар с таким ${error.message.includes('sku') ? 'артикулом' : 'названием'} уже существует.` };
        }
        return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
    }
}

async function update(id: string, data: Partial<ProductUpdateInput>): Promise<{ success: boolean; message: string; product?: Product }> {
    log.info("💾 Updating product.", { id, changes: data });

    try {
        const setClauses: string[] = [];
        const values: unknown[] = [];
        const mapping: Partial<Record<keyof ProductUpdateInput, string>> = {
            title: 'title', description: 'description', price: 'price', currency: 'currency', category_id: 'category_id',
            tags: 'tags', imageUrl: 'image_url', rating: 'rating', reviews: 'reviews', is_weighted: 'is_weighted',
            unit: 'unit', price_per_unit: 'price_per_unit', price_unit: 'price_unit', min_order_quantity: 'min_order_quantity',
            step_quantity: 'step_quantity', weight_template_id: 'weight_template_id',
        };

        (Object.keys(data) as (keyof ProductUpdateInput)[]).forEach(key => {
            if (data[key] !== undefined && mapping[key]) {
                let value = data[key];
                if (key === 'tags') value = JSON.stringify(value);
                if (key === 'is_weighted') {
                    value = value ? 1 : 0;
                }
                if (key === 'title' && typeof value === 'string') value = value.trim();
                
                setClauses.push(`${mapping[key]} = $${values.length + 1}`);
                values.push(value);
            }
        });

        if (setClauses.length === 0) {
            const currentProduct = await getById(id);
            return { success: true, message: "Никаких изменений не было сделано.", product: currentProduct ?? undefined };
        }

        setClauses.push(`updated_at = NOW()`);
        values.push(id);

        const { rows } = await query(`
            UPDATE products SET ${setClauses.join(', ')}
            WHERE id = $${values.length} AND deleted_at IS NULL RETURNING *
        `, values);

        if (rows.length === 0) return { success: false, message: "Товар не найден или уже удален." };

        const validatedRow = validateDbRow(rows[0], DbProductSchema, "updateProduct");
        const product = mapDbRowToProduct(validatedRow);

        log.info("Successfully updated product", { id });
        return { success: true, message: "Товар успешно обновлен.", product };

    } catch (error) {
        log.error("Database error in update()", { error, id, productData: data });
        if (isDbError(error) && error.code === "23505") {
            return { success: false, message: "Товар с таким названием уже существует." };
        }
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
             return { success: false, message: "Товар с таким названием уже существует." };
        }
        return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
    }
}

async function remove(id: string): Promise<{ success: boolean; message: string }> {
    log.info("💾 Soft-deleting product.", { id });
    try {
        const { rowCount } = await query(`UPDATE products SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (rowCount === 0) {
            return { success: false, message: "Товар не найден или уже удален." };
        }
        return { success: true, message: "Товар успешно удален." };
    } catch (error) {
        log.error("Database error in remove()", { error, id });
        return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
    }
}

async function getByCategory(categoryName: string, limit: number = 5): Promise<Product[]> {
    const allCategories = await categoriesService.getAll();
    const category = allCategories.find(c => c.name === categoryName);
    if (!category) return [];
    return getAll({ categoryId: category.id, limit });
}

export const productsService = {
    getAll,
    getById,
    getByCategory,
    create,
    update,
    delete: remove,
};

export type ProductsService = typeof productsService;

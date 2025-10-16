import type { Product, ProductFilter, ProductCreateInput, ProductUpdateInput } from "@/lib/types";
import { serverLogger } from "@/lib/server-logger";
import { query } from "@/lib/db";
import { categoriesService } from "@/lib/categories.service";
import { mapDbProductToProduct, generateSkuForCategory, prepareProductCreateParams, prepareProductUpdateParams } from "./helpers";
import { validateDbRows, DbValidationError } from "@/lib/utils/validate-db-row";
import { DbProductSchema } from "@/lib/schemas/product.schema";

const log = serverLogger.withCategory("PRODUCTS_SERVICE");

// Type guard для ошибок БД: полезно для обработки ошибок уникальности (23505)
function isDbError(error: unknown): error is { code: string; constraint: string } {
    return typeof error === "object" && error !== null && "code" in error && "constraint" in error;
}

/**
 * Получение всех продуктов с фильтрацией, сортировкой и пагинацией
 * Использует validateDbRows для пропуска "сломанных" данных из БД (skipInvalid: true).
 */
async function getAll({
    query: searchQuery,
    categoryId,
    minPrice,
    maxPrice,
    sort,
    limit = 50,
    offset = 0,
}: ProductFilter = {}): Promise<Product[]> {
    log.info("Fetching products from DB with filters.", { filters: { searchQuery, categoryId, minPrice, maxPrice, sort, limit, offset } });

    try {
        let baseQuery = `
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
        `;

        const whereClauses: string[] = ["p.deleted_at IS NULL"];
        const queryParams: unknown[] = [];

        // ... Логика добавления WHERE-условий (без изменений) ...
        if (searchQuery) {
            queryParams.push(`%${searchQuery}%`);
            whereClauses.push(`(p.title ILIKE $${queryParams.length} OR p.description ILIKE $${queryParams.length})`);
        }

        if (categoryId) {
            queryParams.push(categoryId);
            whereClauses.push(`p.category_id = $${queryParams.length}`);
        }

        if (minPrice !== undefined) {
            queryParams.push(minPrice);
            whereClauses.push(`p.price >= $${queryParams.length}`);
        }

        if (maxPrice !== undefined) {
            queryParams.push(maxPrice);
            whereClauses.push(`p.price <= $${queryParams.length}`);
        }

        if (whereClauses.length > 0) {
            baseQuery += ` WHERE ${whereClauses.join(" AND ")}`;
        }

        // ... Логика ORDER BY (без изменений) ...
        let orderByClause = " ORDER BY p.created_at DESC";
        switch (sort) {
            case "price_asc": orderByClause = " ORDER BY p.price ASC"; break;
            case "price_desc": orderByClause = " ORDER BY p.price DESC"; break;
            case "rating_desc": orderByClause = " ORDER BY p.rating DESC"; break;
            case "popularity": orderByClause = " ORDER BY p.reviews DESC"; break;
        }
        baseQuery += orderByClause;

        // ✅ ИСПРАВЛЕНИЕ: Правильная нумерация параметров LIMIT/OFFSET
        const limitIndex = queryParams.length + 1;
        const offsetIndex = queryParams.length + 2;
        queryParams.push(limit, offset);
        baseQuery += ` LIMIT $${limitIndex} OFFSET $${offsetIndex}`;


        const { rows } = await query(baseQuery, queryParams);
        log.debug(`Fetched ${rows.length} raw products from DB.`);

        // ✅ Групповая валидация: логирует ошибки и пропускает невалидные элементы
        const validatedRows = validateDbRows(rows, DbProductSchema, "products", { skipInvalid: true });
        
        // Маппинг валидированных объектов в доменный тип Product
        return validatedRows.map(mapDbProductToProduct);

    } catch (error) {
        log.error("Database error in getAll()", { error });
        throw error;
    }
}

/**
 * Получение одного продукта по ID
 * Использует try/catch для обработки DbValidationError.
 */
async function getById(id: string): Promise<Product | null> {
    log.info("Fetching product by ID from database.", { id });
    try {
        const { rows } = await query(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1 AND p.deleted_at IS NULL
        `, [id]);

        if (rows.length === 0) return null;

        // mapDbProductToProduct выполняет валидацию.
        return mapDbProductToProduct(rows[0]); 
    } catch (error) {
        // ✅ Обработка ошибки валидации: продукт найден, но его данные "сломаны".
        if (error instanceof DbValidationError) {
            log.warn("Product validation failed in getById(). Data is corrupted.", { id, details: error.message });
            return null; // Возвращаем null, будто не найден, чтобы UI не падал.
        }

        log.error("Database error in getById()", { id, error });
        throw error;
    }
}

/**
 * Создание нового продукта
 */
async function create(productData: ProductCreateInput): Promise<{ success: boolean; message: string; product?: Product }> {
    log.info("Attempting to create product.", { title: productData.title });

    try {
        const category = await categoriesService.getById(productData.category_id);
        if (!category?.success) {
            return { success: false, message: category?.message ?? "Category not found." };
        }

        const sku = await generateSkuForCategory(productData.category_id);
        const params = prepareProductCreateParams(productData, sku);

        const { rows } = await query(`
            INSERT INTO products (
                title, sku, description, price, currency, category_id, tags, image_url,
                rating, reviews, is_weighted, unit, price_per_unit, price_unit,
                min_order_quantity, step_quantity, weight_template_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `, params);

        // Нет try/catch, т.к. ошибка здесь означает критический сбой в коде/схеме.
        const product = mapDbProductToProduct(rows[0]);
        log.info("Successfully created product", { id: product.id, title: product.title });

        return { success: true, message: "Product created successfully.", product };

    } catch (error) {
        log.error("Database error in create()", { error, productData });
        // Обработка ошибок уникальности (23505)
        if (isDbError(error) && error.code === "23505") {
            if (error.constraint === "products_sku_key") {
                return { success: false, message: "Failed to generate a unique SKU. Please try again." };
            }
            if (error.constraint === "products_title_key") {
                return { success: false, message: "A product with this title already exists." };
            }
        }
        return { success: false, message: "An unexpected database error occurred." };
    }
}

/**
 * Обновление продукта
 */
async function update(id: string, productData: Partial<ProductUpdateInput>): Promise<{ success: boolean; message: string; product?: Product }> {
    log.info("Updating product in database.", { id, changes: productData });

    const { setClause, values } = prepareProductUpdateParams(productData);

    // ✅ Улучшение: избегаем лишнего запроса getById
    if (values.length === 0) {
        log.warn("Update called with no data for product.", { id });
        // Продукт не найден? Мы это узнаем позже. Пока просто сообщаем, что ничего не изменилось.
        return { success: true, message: "No changes were made." }; 
    }

    try {
        const queryParams = [...values, id];
        const { rows } = await query(`
            UPDATE products
            SET ${setClause}
            WHERE id = $${queryParams.length} AND deleted_at IS NULL
            RETURNING *
        `, queryParams);

        if (rows.length === 0) {
            return { success: false, message: "Product not found or already deleted." };
        }

        const product = mapDbProductToProduct(rows[0]);
        log.info("Successfully updated product", { id });
        return { success: true, message: "Product updated successfully.", product };

    } catch (error) {
        log.error("Database error in update()", { error, id, productData });
        if (isDbError(error) && error.code === "23505" && error.constraint === "products_title_key") {
            return { success: false, message: "A product with this title already exists." };
        }
        return { success: false, message: "An unexpected database error occurred." };
    }
}

/**
 * Мягкое удаление продукта
 */
async function remove(id: string): Promise<{ success: boolean; message: string }> {
    log.info("Attempting to soft-delete product in DB.", { id });
    try {
        const { rowCount } = await query(`UPDATE products SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, [id]);

        if (rowCount === 0) {
            log.warn("Attempted to delete a product that was not found or already deleted.", { id });
            return { success: false, message: "Product not found or already deleted." };
        }

        log.info("Product soft-deleted successfully", { id });
        return { success: true, message: "Product deleted successfully." };
    } catch (error) {
        log.error("Database error in remove()", { error, id });
        return { success: false, message: "An unexpected database error occurred." };
    }
}

export const productsService = {
    getAll,
    getById,
    create,
    update,
    delete: remove,
};

export type ProductsService = typeof productsService;
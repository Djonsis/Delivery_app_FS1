import type { Product, ProductFilter, ProductCreateInput, ProductUpdateInput } from "@/lib/types";
import { serverLogger } from "@/lib/server-logger";
import { query } from "@/lib/db";
import { categoriesService } from "@/lib/categories.service";
import { mapDbProductToProduct, generateSkuForCategory, prepareProductCreateParams, prepareProductUpdateParams } from "./helpers";
import { validateDbRows, DbValidationError } from "@/lib/utils/validate-db-row";
import { DbProductSchema } from "@/lib/schemas/product.schema";
import { runMockOrReal } from "../env";
import { mockProducts, mockProduct } from "../mock-data";

const log = serverLogger.withCategory("PRODUCTS_SERVICE");

// Type guard для ошибок БД: полезно для обработки ошибок уникальности (23505)
function isDbError(error: unknown): error is { code: string; constraint: string } {
    return typeof error === "object" && error !== null && "code" in error && "constraint" in error;
}

/**
 * Получение всех продуктов с фильтрацией, сортировкой и пагинацией
 * Использует validateDbRows для пропуска "сломанных" данных из БД (skipInvalid: true).
 */
async function getAll(filters: ProductFilter = {}): Promise<Product[]> {
    return runMockOrReal(
        // Mock path
        () => {
            log.info("🎭 MOCK MODE: Returning mock products with filters", { filters });
            // Здесь может быть более сложная логика фильтрации моковых данных
            return Promise.resolve(mockProducts);
        },
        // Real path
        async () => {
            const {
                query: searchQuery,
                categoryId,
                minPrice,
                maxPrice,
                sort,
                limit = 50,
                offset = 0,
            } = filters;

            log.info("💾 REAL MODE: Fetching products from DB with filters.", { filters });

            try {
                let baseQuery = `
                    SELECT p.*, c.name as category_name
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                `;

                const whereClauses: string[] = ["p.deleted_at IS NULL"];
                const queryParams: unknown[] = [];

                if (searchQuery) {
                    queryParams.push(`%${searchQuery}%`);
                    whereClauses.push(`(p.title ILIKE $${queryParams.length} OR p.description ILIKE $${queryParams.length})`);
                }

                if (categoryId) {
                    // Если категория "Все", не добавляем фильтр по категории
                    const allCategories = await categoriesService.getAll();
                    const category = allCategories.find(c => c.name === categoryId);
                    if (category) {
                        queryParams.push(category.id);
                        whereClauses.push(`p.category_id = $${queryParams.length}`);
                    }
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

                let orderByClause = " ORDER BY p.created_at DESC";
                switch (sort) {
                    case "price_asc": orderByClause = " ORDER BY p.price ASC"; break;
                    case "price_desc": orderByClause = " ORDER BY p.price DESC"; break;
                    case "rating_desc": orderByClause = " ORDER BY p.rating DESC"; break;
                    case "popularity": orderByClause = " ORDER BY p.reviews DESC"; break;
                }
                baseQuery += orderByClause;

                const limitIndex = queryParams.length + 1;
                const offsetIndex = queryParams.length + 2;
                queryParams.push(limit, offset);
                baseQuery += ` LIMIT $${limitIndex} OFFSET $${offsetIndex}`;


                const { rows } = await query(baseQuery, queryParams);
                log.debug(`Fetched ${rows.length} raw products from DB.`);

                const validatedRows = validateDbRows(rows, DbProductSchema, "products", { skipInvalid: true });
                
                return validatedRows.map(mapDbProductToProduct);

            } catch (error) {
                log.error("Database error in getAll()", { error });
                throw error;
            }
        }
    );
}

/**
 * Получение одного продукта по ID
 */
async function getById(id: string): Promise<Product | null> {
    return runMockOrReal(
        // Mock path
        () => {
            log.info(`🎭 MOCK MODE: getById(${id})`);
            return Promise.resolve(id === mockProduct.id ? mockProduct : null);
        },
        // Real path
        async () => {
            log.info("💾 REAL MODE: Fetching product by ID from database.", { id });
            try {
                const { rows } = await query(`
                    SELECT p.*, c.name as category_name
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE p.id = $1 AND p.deleted_at IS NULL
                `, [id]);

                if (rows.length === 0) return null;

                return mapDbProductToProduct(rows[0]); 
            } catch (error) {
                if (error instanceof DbValidationError) {
                    log.warn("Product validation failed in getById(). Data is corrupted.", { id, details: error.message });
                    return null;
                }

                log.error("Database error in getById()", { id, error });
                throw error;
            }
        }
    );
}

/**
 * Получение продуктов по категории
 */
async function getByCategory(categoryName: string | null, limit: number = 5): Promise<Product[]> {
    if (!categoryName) return [];

    const allCategories = await categoriesService.getAll();
    const category = allCategories.find(c => c.name === categoryName);

    if (!category) return [];

    return getAll({ categoryId: category.id, limit });
}

/**
 * Создание нового продукта
 */
async function create(productData: ProductCreateInput): Promise<{ success: boolean; message: string; product?: Product }> {
     return runMockOrReal(
        // Mock path
        () => {
            log.info("🎭 MOCK MODE: create() - skipping DB");
            const newProduct = { ...mockProduct, ...productData, id: `mock-prod-${Date.now()}`};
            return Promise.resolve({ success: true, message: "(Mock) Product created successfully", product: newProduct });
        },
        // Real path
        async () => {
            log.info("💾 REAL MODE: Attempting to create product.", { title: productData.title });
            try {
                const category = await categoriesService.getById(productData.category_id);
                if (!category) {
                    return { success: false, message: "Категория не найдена." };
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

                const product = mapDbProductToProduct(rows[0]);
                log.info("Successfully created product", { id: product.id, title: product.title });

                return { success: true, message: "Товар успешно создан.", product };

            } catch (error) {
                log.error("Database error in create()", { error, productData });
                if (isDbError(error) && error.code === "23505") {
                    if (error.constraint === "products_sku_key") {
                        return { success: false, message: "Не удалось сгенерировать уникальный SKU. Попробуйте еще раз." };
                    }
                    if (error.constraint === "products_title_key") {
                        return { success: false, message: "Товар с таким названием уже существует." };
                    }
                }
                return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
            }
        }
    );
}

/**
 * Обновление продукта
 */
async function update(id: string, productData: Partial<ProductUpdateInput>): Promise<{ success: boolean; message: string; product?: Product }> {
    return runMockOrReal(
        // Mock path
        () => {
            log.info(`🎭 MOCK MODE: update(${id}) - skipping DB`);
             if (id !== mockProduct.id) {
                return Promise.resolve({ success: false, message: "(Mock) Product not found." });
            }
            const updatedProduct = { ...mockProduct, ...productData };
            return Promise.resolve({ success: true, message: "(Mock) Product updated successfully.", product: updatedProduct });
        },
        // Real path
        async () => {
            log.info("💾 REAL MODE: Updating product in database.", { id, changes: productData });

            const { setClause, values } = prepareProductUpdateParams(productData);

            if (values.length === 0) {
                log.warn("Update called with no data for product.", { id });
                return { success: true, message: "Никаких изменений не было сделано." }; 
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
                    return { success: false, message: "Товар не найден или уже удален." };
                }

                const product = mapDbProductToProduct(rows[0]);
                log.info("Successfully updated product", { id });
                return { success: true, message: "Товар успешно обновлен.", product };

            } catch (error) {
                log.error("Database error in update()", { error, id, productData });
                if (isDbError(error) && error.code === "23505" && error.constraint === "products_title_key") {
                    return { success: false, message: "Товар с таким названием уже существует." };
                }
                return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
            }
        }
    );
}

/**
 * Мягкое удаление продукта
 */
async function remove(id: string): Promise<{ success: boolean; message: string }> {
     return runMockOrReal(
        // Mock path
        () => {
            log.info(`🎭 MOCK MODE: remove(${id}) - skipping DB`);
            return Promise.resolve({ success: true, message: "(Mock) Product deleted successfully." });
        },
        // Real path
        async () => {
            log.info("💾 REAL MODE: Attempting to soft-delete product in DB.", { id });
            try {
                const { rowCount } = await query(`UPDATE products SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, [id]);

                if (rowCount === 0) {
                    log.warn("Attempted to delete a product that was not found or already deleted.", { id });
                    return { success: false, message: "Товар не найден или уже удален." };
                }

                log.info("Product soft-deleted successfully", { id });
                return { success: true, message: "Товар успешно удален." };
            } catch (error) {
                log.error("Database error in remove()", { error, id });
                return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
            }
        }
    );
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

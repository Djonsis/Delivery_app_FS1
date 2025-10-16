import type { Category, CategoryCreateInput, CategoryUpdateInput } from "@/lib/types";
import { serverLogger } from "@/lib/server-logger";
import { query } from "@/lib/db";
import { validateDbRows, DbValidationError } from "@/lib/utils/validate-db-row";
import { DbCategorySchema } from "@/lib/schemas/category.schema";
import { mapDbRowToCategory, generateSlug, prepareCategoryUpdateParams } from "./helpers"; // ✅ Новые хелперы

const log = serverLogger.withCategory("CATEGORIES_SERVICE");

// Type guard для ошибок БД (аналогично products.service)
function isDbError(error: unknown): error is { code: string; constraint: string } {
    return typeof error === "object" && error !== null && "code" in error && "constraint" in error;
}

/**
 * Получение всех категорий.
 */
async function getAll(): Promise<Category[]> {
    log.info("Fetching all categories from DB.");

    try {
        const { rows } = await query(`
            SELECT * FROM categories 
            WHERE deleted_at IS NULL
            ORDER BY name ASC
        `);

        log.debug(`Fetched ${rows.length} raw categories.`);

        // ✅ 1. Внедрение validateDbRows для устойчивости
        const validatedRows = validateDbRows(
            rows, 
            DbCategorySchema, 
            "categories", 
            { skipInvalid: true } // Пропускаем невалидные строки, логируя ошибку
        );

        // ✅ 2. Маппинг валидированных строк
        return validatedRows.map(mapDbRowToCategory);

    } catch (error) {
        log.error("Database error in getAll()", { error });
        throw error;
    }
}

/**
 * Получение одной категории по ID.
 */
async function getById(id: string): Promise<Category | null> {
    log.info("Fetching category by ID from database.", { id });
    try {
        const { rows } = await query(`
            SELECT * FROM categories 
            WHERE id = $1 AND deleted_at IS NULL
        `, [id]);

        if (rows.length === 0) return null;

        // ✅ 3. Использование нового маппера, который содержит валидацию
        return mapDbRowToCategory(rows[0]);
    } catch (error) {
        // ✅ 4. Обработка ошибки валидации: отличаем коррумпированные данные от ошибок БД
        if (error instanceof DbValidationError) {
            log.warn("Category validation failed in getById(). Data is corrupted.", { id, details: error.message });
            return null; // Возвращаем null, чтобы UI не падал
        }

        log.error("Database error in getById()", { id, error });
        throw error;
    }
}

/**
 * Создание новой категории.
 */
async function create(categoryData: CategoryCreateInput): Promise<{ success: boolean; message: string; category?: Category }> {
    log.info("Attempting to create category.", { name: categoryData.name });

    try {
        const slug = generateSlug(categoryData.name);

        const { rows } = await query(`
            INSERT INTO categories (name, slug, description, sku_prefix) 
            VALUES ($1, $2, $3, $4)
            RETURNING * `, [
            categoryData.name,
            slug,
            categoryData.description ?? null, // Явно передаем null в БД
            categoryData.sku_prefix,
        ]);

        // ✅ 5. Возвращаем созданную категорию после валидации
        const category = mapDbRowToCategory(rows[0]);
        log.info("Successfully created category", { id: category.id, name: category.name });
        return { success: true, message: "Category created successfully.", category };

    } catch (error) {
        log.error("Database error in create()", { error, categoryData });
        
        // Обработка ошибок уникальности (23505)
        if (isDbError(error) && error.code === "23505") {
            if (error.constraint === 'categories_slug_key' || error.constraint === 'categories_name_key') {
                return { success: false, message: "A category with this name or slug already exists." };
            }
        }
        return { success: false, message: "An unexpected database error occurred." };
    }
}

/**
 * Обновление существующей категории.
 */
async function update(id: string, categoryData: Partial<CategoryUpdateInput>): Promise<{ success: boolean; message: string; category?: Category }> {
    log.info("Updating category in database.", { id, changes: categoryData });

    // ✅ 6. Использование нового хелпера для построения запроса
    const { setClause, values } = prepareCategoryUpdateParams(categoryData);

    if (values.length === 0) {
        log.warn("Update called with no data for category.", { id });
        // Оптимизация: избегаем лишнего запроса
        return { success: true, message: "No changes were made." }; 
    }

    try {
        const queryParams = [...values, id];
        const { rows } = await query(`
            UPDATE categories
            SET ${setClause}
            WHERE id = $${queryParams.length} AND deleted_at IS NULL
            RETURNING *
        `, queryParams);

        if (rows.length === 0) {
            return { success: false, message: "Category not found or already deleted." };
        }

        // ✅ 7. Возвращаем обновленную категорию
        const category = mapDbRowToCategory(rows[0]);
        log.info("Successfully updated category", { id });
        return { success: true, message: "Category updated successfully.", category };

    } catch (error) {
        log.error("Database error in update()", { error, id, categoryData });
        if (isDbError(error) && error.code === "23505") {
            if (error.constraint === 'categories_slug_key' || error.constraint === 'categories_name_key') {
                return { success: false, message: "A category with this name or slug already exists." };
            }
        }
        return { success: false, message: "An unexpected database error occurred." };
    }
}

/**
 * Мягкое удаление категории.
 */
async function remove(id: string): Promise<{ success: boolean; message: string }> {
    log.info("Attempting to soft-delete category in DB.", { id });
    try {
        const { rowCount } = await query(`UPDATE categories SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, [id]);

        if (rowCount === 0) {
            log.warn("Attempted to delete a category that was not found or already deleted.", { id });
            return { success: false, message: "Category not found or already deleted." };
        }

        log.info("Category soft-deleted successfully", { id });
        return { success: true, message: "Category deleted successfully." };
    } catch (error) {
        log.error("Database error in remove()", { error, id });
        return { success: false, message: "An unexpected database error occurred." };
    }
}


export const categoriesService = {
    getAll,
    getById,
    create,
    update,
    delete: remove, 
};

export type CategoriesService = typeof categoriesService;
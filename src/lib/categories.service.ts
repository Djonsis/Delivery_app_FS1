import type { Category, CategoryCreateInput, CategoryUpdateInput } from "@/lib/types";
import { serverLogger } from "@/lib/server-logger";
import { query } from "@/lib/db";
import { validateDbRows, DbValidationError } from "@/lib/utils/validate-db-row";
import { DbCategorySchema } from "@/lib/schemas/category.schema";
import { mapDbRowToCategory, generateSlug, prepareCategoryUpdateParams } from "./categories/helpers";
import { isMockCategories } from "@/lib/config";
import { mockCategory } from "@/lib/mock-data";

const log = serverLogger.withCategory("CATEGORIES_SERVICE");

function isDbError(error: unknown): error is { code: string; constraint: string } {
    return typeof error === "object" && error !== null && "code" in error && "constraint" in error;
}

async function getAll(): Promise<Category[]> {
    if (isMockCategories()) {
        log.info("Running in MOCK mode. Returning mock categories.");
        return [mockCategory, { ...mockCategory, id: 'mock-cat-02', name: 'Фрукты (Тест)', slug: 'fruits-mock' }];
    }
    
    log.info("Fetching all categories from DB.");
    try {
        const { rows } = await query(`SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name ASC`);
        log.debug(`Fetched ${rows.length} raw categories.`);
        const validatedRows = validateDbRows(rows, DbCategorySchema, "categories", { skipInvalid: true });
        return validatedRows.map(mapDbRowToCategory);
    } catch (error) {
        log.error("Database error in getAll()", { error });
        throw error;
    }
}

async function getById(id: string): Promise<Category | null> {
    if (isMockCategories()) {
        log.info(`Running in MOCK mode for getById(${id}).`);
        return id === mockCategory.id ? mockCategory : null;
    }

    log.info("Fetching category by ID from database.", { id });
    try {
        const { rows } = await query(`SELECT * FROM categories WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (rows.length === 0) return null;
        return mapDbRowToCategory(rows[0]);
    } catch (error) {
        if (error instanceof DbValidationError) {
            log.warn("Category validation failed in getById(). Data is corrupted.", { id, details: error.message });
            return null;
        }
        log.error("Database error in getById()", { id, error });
        throw error;
    }
}

async function create(categoryData: CategoryCreateInput): Promise<{ success: boolean; message: string; category?: Category }> {
    if (isMockCategories()) {
        log.info("Running in MOCK mode for create(). Skipping DB call.");
        const newCategory = { ...mockCategory, ...categoryData, id: `mock-cat-${Date.now()}` };
        return { success: true, message: "(Mock) Category created successfully.", category: newCategory };
    }

    log.info("Attempting to create category.", { name: categoryData.name });
    try {
        const slug = generateSlug(categoryData.name);
        const { rows } = await query(
            `INSERT INTO categories (name, slug, description, sku_prefix) VALUES ($1, $2, $3, $4) RETURNING *`,
            [categoryData.name, slug, categoryData.description ?? null, categoryData.sku_prefix]
        );
        const category = mapDbRowToCategory(rows[0]);
        log.info("Successfully created category", { id: category.id, name: category.name });
        return { success: true, message: "Category created successfully.", category };
    } catch (error) {
        log.error("Database error in create()", { error, categoryData });
        if (isDbError(error) && error.code === "23505") {
            if (error.constraint === 'categories_slug_key' || error.constraint === 'categories_name_key') {
                return { success: false, message: "A category with this name or slug already exists." };
            }
        }
        return { success: false, message: "An unexpected database error occurred." };
    }
}

async function update(id: string, categoryData: Partial<CategoryUpdateInput>): Promise<{ success: boolean; message: string; category?: Category }> {
    if (isMockCategories()) {
        log.info(`Running in MOCK mode for update(${id}). Skipping DB call.`);
        if (id !== mockCategory.id) {
            return { success: false, message: "(Mock) Category not found." };
        }
        const updatedCategory = { ...mockCategory, ...categoryData };
        return { success: true, message: "(Mock) Category updated successfully.", category: updatedCategory };
    }

    log.info("Updating category in database.", { id, changes: categoryData });
    const { setClause, values } = prepareCategoryUpdateParams(categoryData);
    if (values.length === 0) {
        return { success: true, message: "No changes were made." }; 
    }

    try {
        const queryParams = [...values, id];
        const { rows } = await query(`UPDATE categories SET ${setClause} WHERE id = $${queryParams.length} AND deleted_at IS NULL RETURNING *`, queryParams);
        if (rows.length === 0) {
            return { success: false, message: "Category not found or already deleted." };
        }
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

async function remove(id: string): Promise<{ success: boolean; message: string }> {
    if (isMockCategories()) {
        log.info(`Running in MOCK mode for remove(${id}). Skipping DB call.`);
        return { success: true, message: "(Mock) Category deleted successfully." };
    }

    log.info("Attempting to soft-delete category in DB.", { id });
    try {
        const { rowCount } = await query(`UPDATE categories SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (rowCount === 0) {
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
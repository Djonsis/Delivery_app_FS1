
import type { Category, CategoryCreateInput, CategoryUpdateInput } from "@/lib/types";
import { serverLogger } from "@/lib/server-logger";
import { query } from "@/lib/db";
import { validateDbRows, DbValidationError } from "@/lib/utils/validate-db-row";
import { DbCategorySchema } from "@/lib/schemas/category.schema";
// ✅ FIX: Убираем импорт удаленных функций
import { mapDbRowToCategory } from "./categories/helpers";
import { randomUUID } from "node:crypto";

const log = serverLogger.withCategory("CATEGORIES_SERVICE");

function isDbError(error: unknown): error is { code: string; constraint: string } {
    return typeof error === "object" && error !== null && "code" in error && "constraint" in error;
}

// ✅ NEW: Локальная реализация функции для генерации slug
function generateSlug(name: string): string {
  const rusToLat: { [key: string]: string } = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
    ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
    я: "ya",
  };

  return name
    .toLowerCase()
    .split("")
    .map((char) => rusToLat[char] || char)
    .join("")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}


async function getAll(): Promise<Category[]> {
    log.info("Fetching categories from DB (adapter will pick SQLite/Postgres)");
    try {
        const { rows } = await query(`SELECT * FROM categories ORDER BY name ASC`);
        log.debug(`Fetched ${rows.length} raw categories from DB`);
        const validatedRows = validateDbRows(rows, DbCategorySchema, "categories", { skipInvalid: true });
        return validatedRows.map(mapDbRowToCategory);
    } catch (error) {
        log.error("Database error in getAll()", { error });
        throw error;
    }
}

async function getById(id: string): Promise<Category | null> {
    log.info("Fetching category by ID from DB (adapter will pick SQLite/Postgres)", { id });
    try {
        const { rows } = await query(`SELECT * FROM categories WHERE id = $1`, [id]);
        if (rows.length === 0) return null;
        // ✅ FIX: Используем mapDbRowToCategory напрямую, если строка одна
        return mapDbRowToCategory(rows[0]);
    } catch (error) {
        if (error instanceof DbValidationError) {
            log.warn("Category validation failed. Data is corrupted.", { id, details: error.message });
            return null;
        }
        log.error("Database error in getById()", { id, error });
        throw error;
    }
}

async function create(categoryData: CategoryCreateInput): Promise<{ success: boolean; message: string; category?: Category }> {
    log.info("Creating category in DB (adapter will pick SQLite/Postgres)", { name: categoryData.name });
    try {
        const id = randomUUID();
        const slug = generateSlug(categoryData.name);
        const { rows } = await query(
            `INSERT INTO categories (id, name, slug, description, sku_prefix) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id, categoryData.name, slug, categoryData.description ?? null, categoryData.sku_prefix]
        );
        const category = mapDbRowToCategory(rows[0]);
        log.info("Successfully created category", { id: category.id, name: category.name });
        return { success: true, message: "Категория успешно создана.", category };
    } catch (error) {
        log.error("Database error in create()", { error, categoryData });
        if (isDbError(error) && error.code === "23505") {
            if (error.constraint === 'categories_slug_key' || error.constraint === 'categories_name_key') {
                return { success: false, message: "Категория с таким именем или slug уже существует." };
            }
             if (error.constraint === 'categories_sku_prefix_key') {
                return { success: false, message: "Категория с таким префиксом артикула уже существует." };
            }
        }
        return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
    }
}

async function update(id: string, categoryData: Partial<CategoryUpdateInput>): Promise<{ success: boolean; message: string; category?: Category }> {
    log.info("Updating category in DB (adapter will pick SQLite/Postgres)", { id, changes: categoryData });
    
    // ✅ FIX: Логика подготовки параметров для обновления перенесена сюда
    const updateableFields: (keyof CategoryUpdateInput)[] = ["name", "description", "is_active", "sku_prefix"];
    const fieldsToUpdate: { key: string, value: any }[] = [];

    // Если обновляется имя, также обновляем и slug
    if (categoryData.name) {
        fieldsToUpdate.push({ key: 'name', value: categoryData.name });
        fieldsToUpdate.push({ key: 'slug', value: generateSlug(categoryData.name) });
    } else {
        // Обрабатываем остальные поля, если имя не меняется
        for (const field of updateableFields) {
            if (field !== 'name' && categoryData[field] !== undefined) {
                fieldsToUpdate.push({ key: field, value: categoryData[field] });
            }
        }
    }
    
    if (fieldsToUpdate.length === 0) {
        return { success: true, message: "Никаких изменений не было сделано." };
    }

    const setClause = fieldsToUpdate.map((f, i) => `${f.key} = $${i + 1}`).join(", ");
    const values = fieldsToUpdate.map(f => f.value);

    try {
        const queryParams = [...values, id];
        const { rows } = await query(
            `UPDATE categories SET ${setClause} WHERE id = $${queryParams.length} RETURNING *`,
            queryParams
        );
        if (rows.length === 0) {
            return { success: false, message: "Категория не найдена." };
        }
        const category = mapDbRowToCategory(rows[0]);
        log.info("Successfully updated category", { id });
        return { success: true, message: "Категория успешно обновлена.", category };
    } catch (error) {
        log.error("Database error in update()", { error, id, categoryData });
        if (isDbError(error) && error.code === "23505") {
            if (error.constraint === 'categories_slug_key' || error.constraint === 'categories_name_key') {
                return { success: false, message: "Категотория с таким именем или slug уже существует." };
            }
        }
        return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
    }
}

async function remove(id: string): Promise<{ success: boolean; message: string }> {
    log.info("Deleting category in DB (adapter will pick SQLite/Postgres)", { id });
    try {
        // Проверяем, есть ли товары, связанные с этой категорией
        const checkRes = await query("SELECT 1 FROM products WHERE category_id = $1 LIMIT 1", [id]);
        if (checkRes.rowCount && checkRes.rowCount > 0) {
            log.warn(`Attempt to delete category with associated products`, { categoryId: id });
            return { success: false, message: "Нельзя удалить категорию, так как к ней привязаны товары." };
        }

        const { rowCount } = await query(
            `DELETE FROM categories WHERE id = $1`,
            [id]
        );

        if (rowCount === 0) {
            return { success: false, message: "Категория не найдена." };
        }
        log.info("Category deleted successfully", { id });
        return { success: true, message: "Категория успешно удалена." };
    } catch (error) {
        log.error("Database error in remove()", { error, id });
        return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
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

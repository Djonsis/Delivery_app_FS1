
import { query } from "./db";
import { serverLogger } from "./server-logger";
import { Category, CategoryCreateInput, CategoryUpdateInput } from "./types";
import { mockCategory } from "./mock-data";
import { runLocalOrDb } from "./env";

const serviceLogger = serverLogger.withCategory("CATEGORIES_SERVICE");

const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

const mapDbRowToCategory = (row: Record<string, unknown>): Category => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    sku_prefix: row.sku_prefix as string,
    description: row.description as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
});

async function getAll(): Promise<Category[]> {
    return runLocalOrDb(
        () => Promise.resolve([mockCategory]),
        async () => {
            serviceLogger.info("Fetching all categories from DB.");
            const { rows } = await query('SELECT * FROM categories ORDER BY name ASC');
            serviceLogger.debug(`Found ${rows.length} categories.`);
            return rows.map(mapDbRowToCategory);
        }
    );
}

async function getById(id: string): Promise<Category | null> {
    return runLocalOrDb(
        () => Promise.resolve(id === mockCategory.id ? mockCategory : null),
        async () => {
            serviceLogger.info(`Fetching category by ID: ${id}`);
            const { rows } = await query('SELECT * FROM categories WHERE id = $1', [id]);
            if (rows.length === 0) {
                serviceLogger.warn(`No category found for ID: ${id}`);
                return null;
            }
            serviceLogger.debug(`Found category with ID: ${id}`);
            return mapDbRowToCategory(rows[0]);
        }
    );
}

// Type guard for database errors
function isDbError(error: unknown): error is { code: string; constraint: string } {
    return typeof error === 'object' && error !== null && 'code' in error && 'constraint' in error;
}

async function create(data: CategoryCreateInput): Promise<{ success: boolean; message: string }> {
    const { name, sku_prefix, description } = data;
    const slug = generateSlug(name);
    serviceLogger.info("Creating a new category in DB", { name, slug });

    return runLocalOrDb(
        () => Promise.resolve({ success: true, message: "Категория успешно создана (мок)." }),
        async () => {
            try {
                await query(
                    'INSERT INTO categories (name, slug, sku_prefix, description) VALUES ($1, $2, $3, $4)',
                    [name, slug, sku_prefix, description || null]
                );
                return { success: true, message: "Категория успешно создана." };
            } catch (error) {
                serviceLogger.error("Failed to create category in DB", error);
                if (isDbError(error) && error.code === '23505') {
                    if (error.constraint?.includes('name')) {
                        return { success: false, message: "Категория с таким названием уже существует." };
                    }
                    if (error.constraint?.includes('slug')) {
                        return { success: false, message: "Категория с таким slug уже существует." };
                    }
                    if (error.constraint?.includes('sku_prefix')) {
                        return { success: false, message: "Категория с таким префиксом артикула уже существует." };
                    }
                }
                return { success: false, message: "Ошибка базы данных. Не удалось создать категорию." };
            }
        }
    );
}

async function update(id: string, data: CategoryUpdateInput): Promise<{ success: boolean; message: string }> {
    serviceLogger.info(`Updating category in DB: ${id}`, { data });
    
    return runLocalOrDb(
        () => Promise.resolve({ success: true, message: "Категория успешно обновлена (мок)." }),
        async () => {
            const category = await getById(id);
            if (!category) {
                return { success: false, message: "Категория не найдена." };
            }

            const newData = { ...category, ...data };
            if (data.name) {
                newData.slug = generateSlug(data.name);
            }
            
            try {
                await query(
                    'UPDATE categories SET name = $1, slug = $2, sku_prefix = $3, description = $4, updated_at = NOW() WHERE id = $5',
                    [newData.name, newData.slug, newData.sku_prefix, newData.description || null, id]
                );
                return { success: true, message: "Категория успешно обновлена." };
            } catch (error) {
                serviceLogger.error(`Failed to update category ${id} in DB`, error);
                if (isDbError(error) && error.code === '23505') {
                    if (error.constraint?.includes('name')) {
                        return { success: false, message: "Категория с таким названием уже существует." };
                    }
                    if (error.constraint?.includes('slug')) {
                        return { success: false, message: "Категория с таким slug уже существует." };
                    }
                    if (error.constraint?.includes('sku_prefix')) {
                        return { success: false, message: "Категория с таким префиксом артикула уже существует." };
                    }
                }
                return { success: false, message: "Ошибка базы данных. Не удалось обновить категорию." };
            }
        }
    );
}

async function del(id: string): Promise<{ success: boolean, message: string }> {
    serviceLogger.info(`Attempting to delete category from DB: ${id}`);
    return runLocalOrDb(
        () => Promise.resolve({ success: true, message: "Категория успешно удалена (мок)." }),
        async () => {
            try {
                const { rows } = await query('SELECT id FROM products WHERE category_id = $1 LIMIT 1', [id]);
                if (rows.length > 0) {
                    serviceLogger.warn(`Attempted to delete category ${id} which is in use by products.`);
                    return { success: false, message: "Нельзя удалить категорию, так как она используется товарами." };
                }

                await query('DELETE FROM categories WHERE id = $1', [id]);
                return { success: true, message: "Категория успешно удалена." };
            } catch (error) {
                serviceLogger.error(`Failed to delete category ${id} from DB`, error as Error);
                return { success: false, message: `Ошибка базы данных. Не удалось удалить категорию.` };
            }
        }
    );
}

export const categoriesService = {
    getAll,
    getById,
    create,
    update,
    delete: del,
};

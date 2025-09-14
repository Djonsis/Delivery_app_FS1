
import { query } from "./db";
import { serverLogger } from "./server-logger";
import { Category } from "./types";
import { revalidatePath } from "next/cache";
import { mockCategory } from "./mock-data";
import { runLocalOrDb } from "./env";

const serviceLogger = serverLogger.withCategory("CATEGORIES_SERVICE");

const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

const mapDbRowToCategory = (row: any): Category => row;

export const categoriesService = {
    async getAll(): Promise<Category[]> {
        return runLocalOrDb(
            async () => [mockCategory],
            async () => {
                serviceLogger.info("Fetching all categories from DB.");
                const { rows } = await query('SELECT * FROM categories ORDER BY name ASC');
                serviceLogger.debug(`Found ${rows.length} categories.`);
                return rows.map(mapDbRowToCategory);
            }
        );
    },

    async getById(id: string): Promise<Category | null> {
        return runLocalOrDb(
            async () => (id === mockCategory.id ? mockCategory : null),
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
    },

    async create(data: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'slug'>): Promise<{ success: boolean; message: string }> {
        const { name, sku_prefix, description } = data;
        const slug = generateSlug(name);
        serviceLogger.info("Creating a new category in DB", { name, slug });

        try {
            await query(
                'INSERT INTO categories (name, slug, sku_prefix, description) VALUES ($1, $2, $3, $4)',
                [name, slug, sku_prefix, description || null]
            );
            revalidatePath('/admin/categories');
            revalidatePath('/admin/products');
            return { success: true, message: "Категория успешно создана." };
        } catch (error) {
            const dbError = error as any;
            serviceLogger.error("Failed to create category in DB", dbError);
            if (dbError.code === '23505') {
                if (dbError.constraint?.includes('name')) {
                    return { success: false, message: "Категория с таким названием уже существует." };
                }
                if (dbError.constraint?.includes('slug')) {
                    return { success: false, message: "Категория с таким slug уже существует." };
                }
                if (dbError.constraint?.includes('sku_prefix')) {
                    return { success: false, message: "Категория с таким префиксом артикула уже существует." };
                }
            }
            return { success: false, message: "Ошибка базы данных. Не удалось создать категорию." };
        }
    },

    async update(id: string, data: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>): Promise<{ success: boolean; message: string }> {
        serviceLogger.info(`Updating category in DB: ${id}`, { data });
        
        const category = await this.getById(id);
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
            revalidatePath('/admin/categories');
            revalidatePath('/admin/products');
            return { success: true, message: "Категория успешно обновлена." };
        } catch (error) {
            const dbError = error as any;
            serviceLogger.error(`Failed to update category ${id} in DB`, dbError);
            if (dbError.code === '23505') {
                 if (dbError.constraint?.includes('name')) {
                    return { success: false, message: "Категория с таким названием уже существует." };
                }
                 if (dbError.constraint?.includes('slug')) {
                    return { success: false, message: "Категория с таким slug уже существует." };
                }
                if (dbError.constraint?.includes('sku_prefix')) {
                    return { success: false, message: "Категория с таким префиксом артикула уже существует." };
                }
            }
            return { success: false, message: "Ошибка базы данных. Не удалось обновить категорию." };
        }
    },

    async delete(id: string): Promise<{ success: boolean, message: string }> {
        serviceLogger.info(`Attempting to delete category from DB: ${id}`);
        try {
            const { rows } = await query('SELECT id FROM products WHERE category_id = $1 LIMIT 1', [id]);
            if (rows.length > 0) {
                serviceLogger.warn(`Attempted to delete category ${id} which is in use by products.`);
                return { success: false, message: "Нельзя удалить категорию, так как она используется товарами." };
            }

            await query('DELETE FROM categories WHERE id = $1', [id]);
            revalidatePath('/admin/categories');
            revalidatePath('/admin/products');
            return { success: true, message: "Категория успешно удалена." };
        } catch (error) {
            serviceLogger.error(`Failed to delete category ${id} from DB`, error as Error);
            return { success: false, message: `Ошибка базы данных. Не удалось удалить категорию.` };
        }
    }
};

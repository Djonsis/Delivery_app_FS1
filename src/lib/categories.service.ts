
"use server";

import { query } from "./db";
import { logger } from "./logger";
import { Category } from "./types";
import { revalidatePath } from "next/cache";

const serviceLogger = logger.withCategory("CATEGORIES_SERVICE");

// Helper function to generate a slug from a name
const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};


export async function getAllCategories(): Promise<Category[]> {
    serviceLogger.info("Fetching all categories from DB.");
    try {
        const { rows } = await query('SELECT * FROM categories ORDER BY name ASC');
        serviceLogger.debug(`Found ${rows.length} categories.`);
        return rows;
    } catch (error) {
        serviceLogger.error("Error fetching categories from DB", error as Error);
        // Re-throw a more generic error to the UI
        throw new Error("Could not fetch categories.");
    }
}

export async function getCategoryById(id: string): Promise<Category | null> {
    serviceLogger.info(`Fetching category by ID: ${id}`);
    try {
        const { rows } = await query('SELECT * FROM categories WHERE id = $1', [id]);
        if (rows.length > 0) {
            serviceLogger.debug(`Found category with ID: ${id}`);
            return rows[0];
        }
        serviceLogger.warn(`No category found for ID: ${id}`);
        return null;
    } catch (error) {
        serviceLogger.error(`Error fetching category ${id} from DB`, error as Error);
        throw new Error(`Could not fetch category ${id}.`);
    }
}


export async function createCategory(data: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; message: string }> {
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
        if (dbError.code === '23505') { // Unique violation
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
}

export async function updateCategory(id: string, data: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>): Promise<{ success: boolean; message: string }> {
    serviceLogger.info(`Updating category in DB: ${id}`, { data });
    
    const category = await getCategoryById(id);
    if (!category) {
        return { success: false, message: "Категория не найдена." };
    }

    const newData = { ...category, ...data };
    // If name is updated, slug should be updated too
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
        if (dbError.code === '23505') { // Unique violation
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
}

export async function deleteCategory(id: string): Promise<{ success: boolean, message: string }> {
    serviceLogger.info(`Attempting to delete category from DB: ${id}`);
    try {
        // First, check if any products are using this category
        const { rows } = await query('SELECT id FROM products WHERE category_id = $1 LIMIT 1', [id]);
        if (rows.length > 0) {
            serviceLogger.warn(`Attempted to delete category ${id} which is in use by products.`);
            return { success: false, message: "Нельзя удалить категорию, так как она используется товарами." };
        }

        // If not in use, proceed with deletion
        await query('DELETE FROM categories WHERE id = $1', [id]);
        revalidatePath('/admin/categories');
        revalidatePath('/admin/products');
        return { success: true, message: "Категория успешно удалена." };
    } catch (error) {
        serviceLogger.error(`Failed to delete category ${id} from DB`, error as Error);
        return { success: false, message: `Ошибка базы данных. Не удалось удалить категорию.` };
    }
}

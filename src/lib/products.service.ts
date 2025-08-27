
"use server";

import type { Product, ProductData } from "./types";
import { logger } from "./logger";
import { query } from "./db";
import { getCategoryById } from "./categories.service";

const productsServiceLogger = logger.withCategory("PRODUCTS_SERVICE");

// Helper to convert a JS array to a PostgreSQL array literal string
function toPostgresArray(arr: string[] | undefined | null): string | null {
    if (!arr || arr.length === 0) {
        return null;
    }
    const escapedElements = arr.map(el => `"${el.replace(/\\/g, '\\\\').replace(/"/g, '""')}"`);
    return `{${escapedElements.join(',')}}`;
}

function mapDbProductToProduct(dbProduct: any): Product {
    const title = dbProduct.title || 'Безымянный товар';
    return {
        ...dbProduct,
        name: title,
        imageUrl: dbProduct.image_url || `https://placehold.co/600x400.png?text=${encodeURIComponent(title)}`,
        rating: dbProduct.rating ?? 4.5,
        reviews: dbProduct.reviews ?? Math.floor(Math.random() * 100),
        min_order_quantity: dbProduct.min_order_quantity ?? 1,
        step_quantity: dbProduct.step_quantity ?? 1,
        weight_category: 'middle', // This can be calculated based on weight later
    };
}

async function generateSkuForCategory(categoryId: string): Promise<string> {
    const category = await getCategoryById(categoryId);
    if (!category || !category.sku_prefix) {
        productsServiceLogger.warn("Cannot generate SKU. Category or SKU prefix not found.", { categoryId });
        throw new Error("Категория или префикс для артикула не найдены.");
    }
    
    // Count existing products in this category
    const countResult = await query(
        'SELECT COUNT(*) FROM products WHERE category_id = $1',
        [categoryId]
    );
    const productCount = parseInt(countResult.rows[0].count, 10);
    const nextNumber = productCount + 1;
    
    // Format number with leading zeros (e.g., 1 -> 001)
    const paddedNumber = nextNumber.toString().padStart(3, '0');
    
    const sku = `${category.sku_prefix}-${paddedNumber}`;
    productsServiceLogger.info("Generated new SKU", { sku, categoryId });
    return sku;
}


export async function getProducts(): Promise<Product[]> {
    productsServiceLogger.info("Fetching all products from DB.");
    try {
        const { rows } = await query(`
            SELECT p.*, c.name as category 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.deleted_at IS NULL 
            ORDER BY p.created_at DESC
        `);
        productsServiceLogger.debug(`Fetched ${rows.length} products.`);
        return rows.map(mapDbProductToProduct);
    } catch (error) {
        productsServiceLogger.error("Error fetching products from DB", error as Error);
        throw new Error("Could not fetch products.");
    }
}

export async function getProductById(id: string): Promise<Product | null> {
    productsServiceLogger.info(`Fetching product by ID: ${id}`);
    try {
       const { rows } = await query(`
        SELECT p.*, c.name as category 
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1 AND p.deleted_at IS NULL
       `, [id]);
       const product = rows[0];
       
        if (product) {
            productsServiceLogger.debug(`Product found for ID: ${id}`);
            return mapDbProductToProduct(product);
        } else {
            productsServiceLogger.warn(`No product found for ID: ${id}`);
            return null;
        }
    } catch (error) {
        productsServiceLogger.error(`Error fetching product ${id} from DB`, error as Error);
        throw new Error(`Could not fetch product ${id}.`);
    }
}

export async function getProductsByCategory(categoryName: string | null, limitCount: number = 5): Promise<Product[]> {
    productsServiceLogger.info(`Fetching products by category from DB: ${categoryName}`, { limit: limitCount });
    if (!categoryName) return [];
    try {
        const { rows } = await query(
            `SELECT p.*, c.name as category
             FROM products p
             JOIN categories c ON p.category_id = c.id
             WHERE c.name = $1 AND p.deleted_at IS NULL 
             ORDER BY p.created_at DESC LIMIT $2`, 
            [categoryName, limitCount]
        );
        productsServiceLogger.debug(`Fetched and filtered ${rows.length} products for category ${categoryName}.`);
        return rows.map(mapDbProductToProduct);
    } catch (error) {
         productsServiceLogger.error(`Error fetching products for category ${categoryName}`, error as Error);
         throw new Error(`Could not fetch products for category ${categoryName}.`);
    }
}


export async function createProduct(data: ProductData): Promise<void> {
    const { title, description, price, categoryId, tags, imageUrl } = data;
    
    if (!categoryId) {
        productsServiceLogger.error("Cannot create product without categoryId", { data });
        throw new Error("Для создания товара необходимо указать категорию.");
    }

    const sku = await generateSkuForCategory(categoryId);

    const finalDescription = description || null;
    const finalCategoryId = categoryId || null;
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    const tagsForDb = toPostgresArray(tagsArray);
    const finalImageUrl = imageUrl || null;

    productsServiceLogger.info("Creating a new product in DB", { title, sku });
    try {
        await query(
            `INSERT INTO products (title, sku, description, price, currency, category_id, tags, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [title, sku, finalDescription, price, 'RUB', finalCategoryId, tagsForDb, finalImageUrl]
        );
    } catch (error) {
        const dbError = error as any;
        if (dbError.code === '23505' && dbError.constraint === 'products_sku_key') {
            productsServiceLogger.error("SKU conflict detected on create", { sku, title });
            throw new Error("Конфликт артикулов. Попробуйте сохранить товар еще раз.");
        }
        productsServiceLogger.error("Failed to create product in DB", error as Error);
        throw new Error("Database error. Could not create product.");
    }
}

export async function updateProduct(id: string, data: ProductData): Promise<void> {
    const { title, description, price, categoryId, tags, imageUrl } = data;
    
    const finalDescription = description || null;
    const finalCategoryId = categoryId || null;
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    const tagsForDb = toPostgresArray(tagsArray);
    const finalImageUrl = imageUrl || null;

    productsServiceLogger.info(`Updating product in DB: ${id}`, { data });
    try {
        await query(
            `UPDATE products SET 
                title = $1, 
                description = $2, 
                price = $3, 
                category_id = $4, 
                tags = $5, 
                image_url = $6, 
                updated_at = NOW()
             WHERE id = $7`,
            [title, finalDescription, price, finalCategoryId, tagsForDb, finalImageUrl, id]
        );
    } catch (error) {
        productsServiceLogger.error(`Failed to update product ${id} in DB`, error as Error);
        throw new Error(`Database error. Could not update product ${id}.`);
    }
}

export async function deleteProduct(id: string): Promise<void> {
    productsServiceLogger.info(`Attempting to soft-delete product in DB: ${id}`);
    try {
        // Soft delete by setting deleted_at
        await query(
            `UPDATE products SET deleted_at = NOW() WHERE id = $1`,
            [id]
        );
    } catch (error) {
        productsServiceLogger.error(`Failed to delete product ${id} from DB`, error as Error);
        throw new Error(`Database error. Could not delete product ${id}.`);
    }
}


export async function getCategories(): Promise<string[]> {
  productsServiceLogger.info("Fetching distinct category names from DB.");
  try {
    const { rows } = await query(
      `SELECT DISTINCT c.name 
       FROM categories c
       INNER JOIN products p ON c.id = p.category_id
       WHERE p.deleted_at IS NULL
       ORDER BY c.name ASC`
    );
    const categoryNames = rows.map(row => row.name);
    productsServiceLogger.debug(`Found ${categoryNames.length} distinct categories with active products.`);
    return categoryNames;
  } catch (error) {
    productsServiceLogger.error("Error fetching distinct category names from DB", error as Error);
    throw new Error("Could not fetch category names.");
  }
}

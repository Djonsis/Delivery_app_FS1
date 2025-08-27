
"use server";

import type { Product } from "./types";
import { serverLogger } from "./server-logger";
import { query } from "./db";

const productsServiceLogger = serverLogger.withCategory("PRODUCTS_SERVICE");

// Helper to map DB product to frontend Product type
function mapDbProductToProduct(dbProduct: any): Product {
    const p: Product = {
        ...dbProduct,
        name: dbProduct.title, // Map title from DB to name for frontend
        // Mock data for fields not in DB yet
        imageUrl: `https://placehold.co/600x400.png?text=${encodeURIComponent(dbProduct.title)}`,
        rating: 4.5,
        reviews: Math.floor(Math.random() * 100),
        weight_category: 'middle',
        min_order_quantity: 1,
        step_quantity: 1,
    };
    return p;
}


export async function getProducts(): Promise<Product[]> {
    productsServiceLogger.info("Fetching all products from DB.");
    try {
        const { rows } = await query('SELECT * FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC');
        productsServiceLogger.debug(`Fetched ${rows.length} products.`);
        return rows.map(mapDbProductToProduct);
    } catch (error) {
        productsServiceLogger.error("Error fetching products from DB", error as Error);
        return []; // Return empty array on error
    }
}

export async function getProductById(id: string): Promise<Product | null> {
    productsServiceLogger.info(`Fetching product by ID: ${id}`);
    try {
       const { rows } = await query('SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL', [id]);
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
        return null;
    }
}

export async function getProductsByCategory(category: string, limitCount: number = 5): Promise<Product[]> {
    productsServiceLogger.info(`Fetching products by category from DB: ${category}`, { limit: limitCount });
    try {
        const { rows } = await query(
            'SELECT * FROM products WHERE category = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2', 
            [category, limitCount]
        );
        productsServiceLogger.debug(`Fetched and filtered ${rows.length} products for category ${category}.`);
        return rows.map(mapDbProductToProduct);
    } catch (error) {
         productsServiceLogger.error(`Error fetching products for category ${category}`, error as Error);
         return [];
    }
}

export async function getCategories(): Promise<string[]> {
    productsServiceLogger.info("Fetching all categories from DB.");
    try {
        const { rows } = await query('SELECT DISTINCT category FROM products WHERE deleted_at IS NULL AND category IS NOT NULL');
        const categories = rows.map(r => r.category);
        productsServiceLogger.debug(`Found ${categories.length} unique categories.`);
        return categories;
    } catch (error) {
         productsServiceLogger.error("Error fetching categories from DB", error as Error);
        return [];
    }
}


"use server";

import { products } from "./products";
import type { Product } from "./types";
import { serverLogger } from "./server-logger";

const productsServiceLogger = serverLogger.withCategory("PRODUCTS_SERVICE");

// Helper function to simulate async fetching
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getProducts(): Promise<Product[]> {
    productsServiceLogger.info("Fetching all products from static data.");
    await delay(200); // Simulate network latency
    productsServiceLogger.debug(`Fetched ${products.length} products.`);
    return products;
}

export async function getProductById(id: string): Promise<Product | null> {
    productsServiceLogger.info(`Fetching product by ID: ${id}`);
    await delay(100); // Simulate network latency
    const product = products.find(p => p.id === id) || null;
    if (product) {
        productsServiceLogger.debug(`Product found for ID: ${id}`);
    } else {
        productsServiceLogger.warn(`No product found for ID: ${id}`);
    }
    return product;
}

export async function getProductsByCategory(category: string, limitCount: number = 5): Promise<Product[]> {
    productsServiceLogger.info(`Fetching products by category: ${category}`, { limit: limitCount });
    await delay(150); // Simulate network latency
    const filteredProducts = products.filter(p => p.category === category).slice(0, limitCount);
    productsServiceLogger.debug(`Fetched ${filteredProducts.length} products for category ${category}.`);
    return filteredProducts;
}

export async function getCategories(): Promise<string[]> {
    productsServiceLogger.info("Fetching all categories from static data.");
    await delay(50); // Simulate network latency
    const categories = [...new Set(products.map(p => p.category))];
    productsServiceLogger.debug(`Found ${categories.length} unique categories.`);
    return categories;
}

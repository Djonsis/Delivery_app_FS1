
"use server";

import type { Product } from "./types";
import { serverLogger } from "./server-logger";

const productsServiceLogger = serverLogger.withCategory("PRODUCTS_SERVICE");

// Helper function to simulate async fetching
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  // Assume localhost for development
  return `http://localhost:${process.env.PORT || 9003}`;
};

export async function getProducts(): Promise<Product[]> {
    productsServiceLogger.info("Fetching all products from API.");
    try {
        const res = await fetch(`${getBaseUrl()}/api/products`);
        if (!res.ok) {
            throw new Error(`Failed to fetch products: ${res.statusText}`);
        }
        const products = await res.json();
        productsServiceLogger.debug(`Fetched ${products.length} products.`);
        return products;
    } catch (error) {
        productsServiceLogger.error("Error fetching products from API", error as Error);
        return []; // Return empty array on error
    }
}

export async function getProductById(id: string): Promise<Product | null> {
    productsServiceLogger.info(`Fetching product by ID: ${id}`);
    try {
        const res = await fetch(`${getBaseUrl()}/api/products/${id}`);
        if (!res.ok) {
             if (res.status === 404) {
                return null;
            }
            throw new Error(`Failed to fetch product ${id}: ${res.statusText}`);
        }
        const product = await res.json();
        if (product) {
            productsServiceLogger.debug(`Product found for ID: ${id}`);
        } else {
            productsServiceLogger.warn(`No product found for ID: ${id}`);
        }
        return product;
    } catch (error) {
        productsServiceLogger.error(`Error fetching product ${id} from API`, error as Error);
        return null;
    }
}

export async function getProductsByCategory(category: string, limitCount: number = 5): Promise<Product[]> {
    productsServiceLogger.info(`Fetching products by category: ${category}`, { limit: limitCount });
    // This will be replaced by an API call that supports category filtering.
    // For now, we fetch all and filter, which is inefficient.
    try {
        const products = await getProducts();
        const filteredProducts = products.filter(p => p.category === category).slice(0, limitCount);
        productsServiceLogger.debug(`Fetched and filtered ${filteredProducts.length} products for category ${category}.`);
        return filteredProducts;
    } catch (error) {
         productsServiceLogger.error(`Error fetching products for category ${category}`, error as Error);
         return [];
    }
}

export async function getCategories(): Promise<string[]> {
    productsServiceLogger.info("Fetching all categories from API.");
    try {
        const res = await fetch(`${getBaseUrl()}/api/products/categories`);
        if (!res.ok) {
            throw new Error(`Failed to fetch categories: ${res.statusText}`);
        }
        const categories = await res.json();
        productsServiceLogger.debug(`Found ${categories.length} unique categories.`);
        return categories;
    } catch (error) {
         productsServiceLogger.error("Error fetching categories from API", error as Error);
        return [];
    }
}

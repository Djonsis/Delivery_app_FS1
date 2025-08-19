
"use server";

import { collection, getDocs, doc, getDoc, query, where, limit } from "firebase/firestore";
import { db } from "./firebase";
import type { Product } from "./types";
import { serverLogger } from "./server-logger";

const productsServiceLogger = serverLogger.withCategory("PRODUCTS_SERVICE");

// Helper function to convert Firestore doc to Product
const fromFirestore = (doc: any): Product => {
    const data = doc.data();
    // Firestore Timestamps need to be converted, but for now we can assume they are handled correctly by components
    return { id: doc.id, ...data } as Product;
}


export async function getProducts(): Promise<Product[]> {
    productsServiceLogger.info("Fetching all products from Firestore.");
    try {
        const snapshot = await getDocs(collection(db, "products"));
        const products = snapshot.docs.map(fromFirestore);
        productsServiceLogger.debug(`Fetched ${products.length} products.`);
        return products;
    } catch (error) {
        productsServiceLogger.error("Error fetching all products", error as Error);
        throw new Error("Не удалось загрузить товары.");
    }
}

export async function getProductById(id: string): Promise<Product | null> {
    productsServiceLogger.info(`Fetching product by ID: ${id}`);
    try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            productsServiceLogger.debug(`Product found for ID: ${id}`);
            return fromFirestore(docSnap);
        } else {
            productsServiceLogger.warn(`No product found for ID: ${id}`);
            return null;
        }
    } catch (error) {
        productsServiceLogger.error(`Error fetching product by ID: ${id}`, error as Error);
        throw new Error("Не удалось загрузить товар.");
    }
}

export async function getProductsByCategory(category: string, limitCount: number = 5): Promise<Product[]> {
    productsServiceLogger.info(`Fetching products by category: ${category}`, { limit: limitCount });
     try {
        const q = query(collection(db, "products"), where("category", "==", category), limit(limitCount));
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(fromFirestore);
        productsServiceLogger.debug(`Fetched ${products.length} products for category ${category}.`);
        return products;
    } catch (error) {
        productsServiceLogger.error(`Error fetching products by category: ${category}`, error as Error);
        throw new Error("Не удалось загрузить похожие товары.");
    }
}

export async function getCategories(): Promise<string[]> {
    productsServiceLogger.info("Fetching all categories.");
    try {
        const products = await getProducts();
        const categories = [...new Set(products.map(p => p.category))];
        productsServiceLogger.debug(`Found ${categories.length} unique categories.`);
        return categories;
    } catch (error) {
        productsServiceLogger.error("Error fetching categories", error as Error);
        throw new Error("Не удалось загрузить категории.");
    }
}



"use server";

import type { Product } from "./types";
import { serverLogger } from "./server-logger";
import { query } from "./db";
import { getCategoryById } from "./categories.service";
import { mockProduct } from "./mock-data";
import { isLocal } from "./env";
import { v4 as uuidv4 } from 'uuid';

const productsServiceLogger = serverLogger.withCategory("PRODUCTS_SERVICE");

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
        id: dbProduct.id,
        sku: dbProduct.sku,
        title: title,
        description: dbProduct.description,
        price: parseFloat(dbProduct.price),
        currency: dbProduct.currency || 'RUB',
        category_id: dbProduct.category_id,
        category: dbProduct.category_name,
        tags: dbProduct.tags || [],
        imageUrl: dbProduct.image_url || `https://placehold.co/600x400.png?text=${encodeURIComponent(title)}`,
        rating: dbProduct.rating ? parseFloat(dbProduct.rating) : 4.5,
        reviews: dbProduct.reviews || 0,
        brand: dbProduct.brand,
        manufacturer: dbProduct.manufacturer,
        nutrition: dbProduct.nutrition,
        created_at: dbProduct.created_at,
        updated_at: dbProduct.updated_at,
        deleted_at: dbProduct.deleted_at,
        
        is_weighted: dbProduct.is_weighted || false,
        weight_category: dbProduct.weight_category,
        unit: dbProduct.unit || 'pcs',
        price_per_unit: dbProduct.price_per_unit ? parseFloat(dbProduct.price_per_unit) : undefined,
        price_unit: dbProduct.price_unit,
        min_order_quantity: dbProduct.min_order_quantity ? parseFloat(dbProduct.min_order_quantity) : 1,
        step_quantity: dbProduct.step_quantity ? parseFloat(dbProduct.step_quantity) : 1,
        weight_template_id: dbProduct.weight_template_id,
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

const mockProducts: Product[] = [mockProduct, {...mockProduct, id: 'mock-prod-02', title: "Огурцы (Тест)"}];

export async function getProducts(filters?: any): Promise<Product[]> {
    if (isLocal()) {
        productsServiceLogger.warn("Running in local/studio environment. Returning mock products.");
        return mockProducts.filter(product => !product.deleted_at);
    }
    productsServiceLogger.info("Fetching products from DB with filters.", { filters });
    
    let baseQuery = `
        SELECT p.*, c.name as category 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
    `;
    const whereClauses: string[] = ['p.deleted_at IS NULL'];
    const queryParams: any[] = [];

    if (filters?.query) {
        queryParams.push(`%${filters.query}%`);
        whereClauses.push(`(p.title ILIKE $${queryParams.length} OR p.description ILIKE $${queryParams.length})`);
    }

    if (filters?.category && filters.category !== 'Все') {
        queryParams.push(filters.category);
        whereClauses.push(`c.name = $${queryParams.length}`);
    }

    if(filters?.minPrice !== undefined) {
        queryParams.push(filters.minPrice);
        whereClauses.push(`p.price >= $${queryParams.length}`);
    }

    if(filters?.maxPrice !== undefined) {
        queryParams.push(filters.maxPrice);
        whereClauses.push(`p.price <= $${queryParams.length}`);
    }

    if (whereClauses.length > 0) {
        baseQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    let orderByClause = ' ORDER BY p.created_at DESC';
    switch (filters?.sort) {
        case 'price_asc':
            orderByClause = ' ORDER BY p.price ASC';
            break;
        case 'price_desc':
            orderByClause = ' ORDER BY p.price DESC';
            break;
        case 'rating_desc':
            orderByClause = ' ORDER BY p.rating DESC';
            break;
        case 'popularity':
             orderByClause = ' ORDER BY p.reviews DESC';
            break;
    }
    baseQuery += orderByClause;

    try {
        const { rows } = await query(baseQuery, queryParams);
        productsServiceLogger.debug(`Fetched ${rows.length} products.`);
        return rows.map(mapDbProductToProduct);
    } catch (error) {
        productsServiceLogger.error("Error fetching products from DB", error);
        throw new Error("Could not fetch products.");
    }
}

export async function getProductById(id: string): Promise<Product | null> {
    if (isLocal()) {
        const product = mockProducts.find(p => p.id === id && !p.deleted_at);
        return product || null;
    }

    productsServiceLogger.info("Fetching product by ID from database.", { id });
    try {
        const { rows } = await query(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.id = $1 AND p.deleted_at IS NULL
        `, [id]);
        
        if (rows.length === 0) {
        return null;
        }

        return mapDbProductToProduct(rows[0]);
    } catch (error) {
        productsServiceLogger.error("Error fetching product by ID from database", error as Error, { id });
        throw new Error("Could not fetch product.");
    }
}

export async function getProductsByCategory(categoryName: string | null, limitCount: number = 5): Promise<Product[]> {
    if (isLocal()) {
        productsServiceLogger.warn(`Running in local/studio environment. Mocking getProductsByCategory for: ${categoryName}`);
        return categoryName === mockProduct.category ? mockProducts : [];
    }
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


export async function createProduct(productData: any): Promise<Product> {
  if (isLocal()) {
    productsServiceLogger.warn("Running in local/studio environment. Simulating product creation.");
    
    const newProduct: Product = {
      id: uuidv4(),
      title: productData.title,
      description: productData.description || '',
      price: productData.price || 0,
      currency: 'RUB',
      category_id: productData.categoryId,
      category: '',
      tags: productData.tags ? productData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
      imageUrl: productData.imageUrl || '',
      rating: 4.5,
      reviews: 0,
      brand: productData.brand,
      manufacturer: productData.manufacturer,
      nutrition: productData.nutrition,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      sku: null,
      
      is_weighted: productData.is_weighted || false,
      weight_category: productData.weight_category,
      unit: productData.unit || 'pcs',
      price_per_unit: productData.price_per_unit,
      price_unit: productData.price_unit,
      min_order_quantity: productData.min_order_quantity || 1,
      step_quantity: productData.step_quantity || 1,
      weight_template_id: productData.weight_template_id,
    };
    
    mockProducts.push(newProduct);
    return newProduct;
  }

  productsServiceLogger.info("Creating product in database.", { title: productData.title });
  
  try {
    const sku = await generateSkuForCategory(productData.categoryId);
    const tags = productData.tags 
      ? productData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
      : [];

    const { rows } = await query(`
      INSERT INTO products (
        title, sku, description, price, currency, category_id, tags, image_url,
        rating, reviews, brand, manufacturer, nutrition,
        is_weighted, weight_category, unit, price_per_unit, price_unit,
        min_order_quantity, step_quantity, weight_template_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `, [
      productData.title,
      sku,
      productData.description,
      productData.price,
      productData.currency || 'RUB',
      productData.categoryId,
      toPostgresArray(tags),
      productData.imageUrl,
      productData.rating || 4.5,
      productData.reviews || 0,
      productData.brand,
      productData.manufacturer,
      productData.nutrition,
      productData.is_weighted || false,
      productData.weight_category,
      productData.unit || 'pcs',
      productData.price_per_unit,
      productData.price_unit,
      productData.min_order_quantity || 1,
      productData.step_quantity || 1,
      productData.weight_template_id || null
    ]);

    const createdProduct = mapDbProductToProduct(rows[0]);
    productsServiceLogger.info("Product created successfully.", { id: createdProduct.id, title: createdProduct.title });
    
    return createdProduct;
  } catch (error) {
    productsServiceLogger.error("Error creating product in database", error as Error);
    throw new Error("Could not create product.");
  }
}

export async function updateProduct(id: string, productData: any): Promise<Product> {
  if (isLocal()) {
    productsServiceLogger.warn("Running in local/studio environment. Simulating product update.");
    
    const productIndex = mockProducts.findIndex(p => p.id === id);
    if (productIndex === -1) {
      throw new Error("Product not found in mock data");
    }

    const tags = productData.tags 
      ? productData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
      : mockProducts[productIndex].tags;

    mockProducts[productIndex] = {
      ...mockProducts[productIndex],
      title: productData.title || mockProducts[productIndex].title,
      description: productData.description ?? mockProducts[productIndex].description,
      price: productData.price ?? mockProducts[productIndex].price,
      category_id: productData.categoryId ?? mockProducts[productIndex].category_id,
      tags,
      imageUrl: productData.imageUrl ?? mockProducts[productIndex].imageUrl,
      brand: productData.brand ?? mockProducts[productIndex].brand,
      manufacturer: productData.manufacturer ?? mockProducts[productIndex].manufacturer,
      nutrition: productData.nutrition ?? mockProducts[productIndex].nutrition,
      updated_at: new Date().toISOString(),
      
      is_weighted: productData.is_weighted ?? mockProducts[productIndex].is_weighted,
      weight_category: productData.weight_category ?? mockProducts[productIndex].weight_category,
      unit: productData.unit ?? mockProducts[productIndex].unit,
      price_per_unit: productData.price_per_unit ?? mockProducts[productIndex].price_per_unit,
      price_unit: productData.price_unit ?? mockProducts[productIndex].price_unit,
      min_order_quantity: productData.min_order_quantity ?? mockProducts[productIndex].min_order_quantity,
      step_quantity: productData.step_quantity ?? mockProducts[productIndex].step_quantity,
      weight_template_id: productData.weight_template_id ?? mockProducts[productIndex].weight_template_id,
    };

    return mockProducts[productIndex];
  }

  productsServiceLogger.info("Updating product in database.", { id, title: productData.title });
  
  try {
    const tags = productData.tags 
      ? productData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
      : null;

    const { rows } = await query(`
      UPDATE products SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        price = COALESCE($4, price),
        currency = COALESCE($5, currency),
        category_id = COALESCE($6, category_id),
        tags = COALESCE($7, tags),
        image_url = COALESCE($8, image_url),
        brand = COALESCE($9, brand),
        manufacturer = COALESCE($10, manufacturer),
        nutrition = COALESCE($11, nutrition),
        is_weighted = COALESCE($12, is_weighted),
        weight_category = COALESCE($13, weight_category),
        unit = COALESCE($14, unit),
        price_per_unit = COALESCE($15, price_per_unit),
        price_unit = COALESCE($16, price_unit),
        min_order_quantity = COALESCE($17, min_order_quantity),
        step_quantity = COALESCE($18, step_quantity),
        weight_template_id = COALESCE($19, weight_template_id),
        updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [
      id,
      productData.title,
      productData.description,
      productData.price,
      productData.currency,
      productData.categoryId,
      toPostgresArray(tags),
      productData.imageUrl,
      productData.brand,
      productData.manufacturer,
      productData.nutrition,
      productData.is_weighted,
      productData.weight_category,
      productData.unit,
      productData.price_per_unit,
      productData.price_unit,
      productData.min_order_quantity,
      productData.step_quantity,
      productData.weight_template_id || null
    ]);

    if (rows.length === 0) {
      throw new Error("Product not found or already deleted");
    }

    const updatedProduct = mapDbProductToProduct(rows[0]);
    productsServiceLogger.info("Product updated successfully.", { id: updatedProduct.id, title: updatedProduct.title });
    
    return updatedProduct;
  } catch (error) {
    productsServiceLogger.error("Error updating product in database", error as Error, { id });
    throw new Error("Could not update product.");
  }
}

export async function deleteProduct(id: string): Promise<void> {
     if (isLocal()) {
        productsServiceLogger.warn(`Running in local/studio environment. Mocking deleteProduct for ID: ${id}`);
        const productIndex = mockProducts.findIndex(p => p.id === id);
        if (productIndex !== -1) {
            mockProducts[productIndex].deleted_at = new Date().toISOString();
        }
        return;
    }
    productsServiceLogger.info(`Attempting to soft-delete product in DB: ${id}`);
    try {
        await query(
            `UPDATE products SET deleted_at = NOW() WHERE id = $1`,
            [id]
        );
    } catch (error) {
        productsServiceLogger.error(`Failed to delete product ${id} from DB`, error as Error);
        throw new Error(`Database error. Could not delete product ${id}.`);
    }
}

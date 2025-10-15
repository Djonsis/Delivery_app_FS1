
import type { Product, ProductFilter, ProductCreateInput, ProductUpdateInput } from "./types";
import { serverLogger } from "./server-logger";
import { query } from "./db";
import { categoriesService } from "./categories.service";
import { v4 as uuidv4 } from 'uuid';
import { isCloud } from "./config";

const productsServiceLogger = serverLogger.withCategory("PRODUCTS_SERVICE");

// Helper to convert a JS array to a PostgreSQL array literal string
function toPostgresArray(arr: string[] | undefined | null): string | null {
    if (!arr || arr.length === 0) {
        return null;
    }
    const escapedElements = arr.map(el => `"${el.replace(/\\/g, '\\\\').replace(/"/g, '""')}"`);
    return `{${escapedElements.join(',')}}`;
}

function mapDbProductToProduct(dbProduct: Record<string, unknown>): Product {
    const title = (dbProduct.title as string) || 'Безымянный товар';
    return {
        id: dbProduct.id as string,
        sku: dbProduct.sku as string | null,
        title: title,
        description: dbProduct.description as string | null,
        price: parseFloat(dbProduct.price as string),
        currency: (dbProduct.currency as string) || 'RUB',
        category_id: dbProduct.category_id as string | null,
        category: dbProduct.category_name as string | null,
        tags: (dbProduct.tags as string[]) || [],
        imageUrl: (dbProduct.image_url as string) || `https://placehold.co/600x400.png?text=${encodeURIComponent(title)}`,
        rating: dbProduct.rating ? parseFloat(dbProduct.rating as string) : 4.5,
        reviews: (dbProduct.reviews as number) || 0,
        brand: dbProduct.brand as string | undefined,
        manufacturer: dbProduct.manufacturer as string | undefined,
        nutrition: dbProduct.nutrition as Product['nutrition'] | null,
        created_at: dbProduct.created_at as string,
        updated_at: dbProduct.updated_at as string,
        deleted_at: dbProduct.deleted_at as string | null,
        
        is_weighted: (dbProduct.is_weighted as boolean) || false,
        weight_category: dbProduct.weight_category as Product['weight_category'],
        unit: (dbProduct.unit as Product['unit']) || 'pcs',
        price_per_unit: dbProduct.price_per_unit ? parseFloat(dbProduct.price_per_unit as string) : undefined,
        price_unit: dbProduct.price_unit as Product['price_unit'],
        min_order_quantity: dbProduct.min_order_quantity ? parseFloat(dbProduct.min_order_quantity as string) : 1,
        step_quantity: dbProduct.step_quantity ? parseFloat(dbProduct.step_quantity as string) : 1,
        weight_template_id: dbProduct.weight_template_id as string | null | undefined,
    };
}


async function generateSkuForCategory(categoryId: string): Promise<string> {
    const category = await categoriesService.getById(categoryId);
    if (!category || !category.sku_prefix) {
        productsServiceLogger.warn("Cannot generate SKU. Category or SKU prefix not found.", { categoryId });
        throw new Error("Категория или префикс для артикула не найдены.");
    }
    
    const countResult = await query(
        'SELECT COUNT(*) FROM products WHERE category_id = $1',
        [categoryId]
    );
    const productCount = parseInt(countResult.rows[0].count, 10);
    const nextNumber = productCount + 1;
    const paddedNumber = nextNumber.toString().padStart(3, '0');
    
    const sku = `${category.sku_prefix}-${paddedNumber}`;
    productsServiceLogger.info("Generated new SKU", { sku, categoryId });
    return sku;
}

async function getAll(filters?: ProductFilter): Promise<Product[]> {
    productsServiceLogger.info("Fetching products from DB with filters.", { filters });

    let baseQuery = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
    `;
    const whereClauses: string[] = ['p.deleted_at IS NULL'];
    const queryParams: unknown[] = [];

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
        case 'price_asc': orderByClause = ' ORDER BY p.price ASC'; break;
        case 'price_desc': orderByClause = ' ORDER BY p.price DESC'; break;
        case 'rating_desc': orderByClause = ' ORDER BY p.rating DESC'; break;
        case 'popularity': orderByClause = ' ORDER BY p.reviews DESC'; break;
    }
    baseQuery += orderByClause;

    const { rows } = await query(baseQuery, queryParams);
    productsServiceLogger.debug(`Fetched ${rows.length} products.`);
    return rows.map(mapDbProductToProduct);
}

async function getById(id: string): Promise<Product | null> {
    productsServiceLogger.info("Fetching product by ID from database.", { id });
    const { rows } = await query(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.id = $1 AND p.deleted_at IS NULL
    `, [id]);
    
    if (rows.length === 0) return null;

    return mapDbProductToProduct(rows[0]);
}

async function getByCategory(categoryName: string | null, limitCount: number = 5): Promise<Product[]> {
    productsServiceLogger.info(`Fetching products by category from DB: ${categoryName}`, { limit: limitCount });
    if (!categoryName) return [];
    
    const { rows } = await query(
        `SELECT p.*, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE c.name = $1 AND p.deleted_at IS NULL 
         ORDER BY p.created_at DESC LIMIT $2`, 
        [categoryName, limitCount]
    );
    productsServiceLogger.debug(`Fetched and filtered ${rows.length} products for category ${categoryName}.`);
    return rows.map(mapDbProductToProduct);
}

async function create(productData: ProductCreateInput): Promise<Product> {
    productsServiceLogger.info("Creating product in database.", { title: productData.title });
    
    if (!productData.category_id) {
        throw new Error('Category ID is required to create a product.');
    }

    const sku = await generateSkuForCategory(productData.category_id);

    const { rows } = await query(`
        INSERT INTO products (
            title, sku, description, price, currency, category_id, tags, image_url,
            rating, reviews, 
            is_weighted, unit, price_per_unit, price_unit,
            min_order_quantity, step_quantity, weight_template_id
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING *
    `, [
        productData.title, 
        sku, 
        productData.description,
        productData.price,
        productData.currency || 'RUB', 
        productData.category_id, 
        toPostgresArray(productData.tags), 
        productData.imageUrl,
        productData.rating || 4.5, 
        productData.reviews || 0, 
        productData.is_weighted || false, 
        productData.unit || 'pcs', 
        productData.price_per_unit,
        productData.price_unit, 
        productData.min_order_quantity || 1, 
        productData.step_quantity || 1, 
        productData.weight_template_id || null
    ]);

    return mapDbProductToProduct(rows[0]);
}

async function update(id: string, productData: ProductUpdateInput): Promise<Product> {
    productsServiceLogger.info("Updating product in database.", { id, title: productData.title });

    // The COALESCE function is used to only update fields that are not null.
    // Note that `weight_template_id` is handled differently to allow setting it to NULL.
    const { rows } = await query(`
        UPDATE products SET
            title = COALESCE($2, title), 
            description = COALESCE($3, description), 
            price = COALESCE($4, price),
            currency = COALESCE($5, currency), 
            category_id = COALESCE($6, category_id), 
            tags = COALESCE($7, tags),
            image_url = COALESCE($8, image_url), 
            is_weighted = COALESCE($9, is_weighted),
            unit = COALESCE($10, unit),
            price_per_unit = COALESCE($11, price_per_unit), 
            price_unit = COALESCE($12, price_unit),
            min_order_quantity = COALESCE($13, min_order_quantity), 
            step_quantity = COALESCE($14, step_quantity),
            weight_template_id = $15, 
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
    `, [
        id, 
        productData.title, 
        productData.description, 
        productData.price, 
        productData.currency,
        productData.category_id, 
        toPostgresArray(productData.tags), 
        productData.imageUrl, 
        productData.is_weighted,
        productData.unit, 
        productData.price_per_unit, 
        productData.price_unit,
        productData.min_order_quantity, 
        productData.step_quantity, 
        productData.weight_template_id
    ]);

    if (rows.length === 0) throw new Error("Product not found or already deleted");
    return mapDbProductToProduct(rows[0]);
}

async function del(id: string): Promise<void> {
    productsServiceLogger.info(`Attempting to soft-delete product in DB: ${id}`);
    await query(`UPDATE products SET deleted_at = NOW() WHERE id = $1`, [id]);
}


export const productsService = {
    getAll,
    getById,
    getByCategory,
    create,
    update,
    delete: del,
};

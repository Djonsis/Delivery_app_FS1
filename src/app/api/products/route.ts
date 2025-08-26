
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { serverLogger } from '@/lib/server-logger';

const apiLogger = serverLogger.withCategory("API_PRODUCTS");

export async function GET(request: Request) {
  try {
    apiLogger.info("Received request for all products.");
    // NOTE: This query assumes the SQL schema from docs/S3_SQL_instruction.md has been applied.
    const productsQuery = `
        SELECT
            p.id,
            p.title as name,
            p.description,
            p.price,
            p.tags,
            p.created_at,
            p.updated_at,
            -- For simplicity, we are hardcoding category and other fields not in the db
            'Овощи' as category, -- TODO: Replace with actual category from DB if schema changes
            4.5 as rating, -- Placeholder
            100 as reviews, -- Placeholder
            'https://placehold.co/600x400.png' as "imageUrl", -- Placeholder
            '1 кг' as weight, -- Placeholder
            'middle' as weight_category,
            1 as min_order_quantity,
            1 as step_quantity
        FROM products p
        WHERE p.deleted_at IS NULL
    `;
    const { rows: products } = await query(productsQuery);
    
    apiLogger.info(`Returning ${products.length} products.`);
    return NextResponse.json(products);
  } catch (error) {
    apiLogger.error("Failed to fetch products from database.", error as Error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

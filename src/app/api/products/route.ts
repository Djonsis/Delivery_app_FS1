
import { NextResponse } from 'next/server';
import { serverLogger } from '@/lib/server-logger';
import { query } from '@/lib/db';
import type { Product } from '@/lib/types';

const apiLogger = serverLogger.withCategory("API_PRODUCTS");

export async function GET(request: Request) {
  try {
    apiLogger.info("Received request for all products (from DB).");
    
    // Выполняем реальный запрос к базе данных
    const { rows: products } = await query('SELECT * FROM products WHERE deleted_at IS NULL');

    apiLogger.info(`Returning ${products.length} products from database.`);
    return NextResponse.json(products);

  } catch (error) {
    apiLogger.error("Failed to fetch products from database.", error as Error);
    return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
  }
}

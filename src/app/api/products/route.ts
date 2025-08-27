
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';
import type { Product } from '@/lib/types';
import { getProducts } from '@/lib/products.service';

const apiLogger = logger.withCategory("API_PRODUCTS");

export async function GET(request: Request) {
  try {
    apiLogger.info("Received request for all products (from DB via service).");
    
    const products = await getProducts();

    apiLogger.info(`Returning ${products.length} products from database.`);
    return NextResponse.json(products);

  } catch (error) {
    apiLogger.error("Failed to fetch products from database.", error as Error);
    return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
  }
}

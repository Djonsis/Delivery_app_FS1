
import { NextResponse } from 'next/server';
import { serverLogger } from '@/lib/server-logger';
import { getCategories } from '@/lib/products.service';

const apiLogger = serverLogger.withCategory("API_CATEGORIES");

export async function GET(request: Request) {
  try {
    apiLogger.info("Received request for product categories (from DB via service).");
    
    const categories = await getCategories();

    apiLogger.info(`Returning ${categories.length} categories from database.`);
    return NextResponse.json(categories);
  } catch (error) {
    apiLogger.error("Failed to fetch categories from database.", error as Error);
    return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
  }
}

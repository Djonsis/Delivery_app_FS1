
import { NextResponse } from 'next/server';
import { serverLogger } from '@/lib/server-logger';
import { query } from '@/lib/db';

const apiLogger = serverLogger.withCategory("API_CATEGORIES");

export async function GET(request: Request) {
  try {
    apiLogger.info("Received request for product categories (from DB).");
    
    const { rows } = await query('SELECT DISTINCT category FROM products WHERE deleted_at IS NULL AND category IS NOT NULL');
    const categories = rows.map(r => r.category);

    apiLogger.info(`Returning ${categories.length} categories from database.`);
    return NextResponse.json(categories);
  } catch (error) {
    apiLogger.error("Failed to fetch categories from database.", error as Error);
    return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
  }
}

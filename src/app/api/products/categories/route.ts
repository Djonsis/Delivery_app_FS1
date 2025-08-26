
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { serverLogger } from '@/lib/server-logger';

const apiLogger = serverLogger.withCategory("API_CATEGORIES");

export async function GET(request: Request) {
  try {
    apiLogger.info("Received request for product categories.");
    // This is a placeholder. In a real scenario, you'd have a `categories` table.
    // For now, we return a hardcoded list to keep the UI functional.
    const categories = ["Фрукты", "Молочные продукты", "Выпечка", "Сыры", "Яйца", "Овощи"];
    apiLogger.info(`Returning ${categories.length} categories.`);
    return NextResponse.json(categories);
  } catch (error) {
    apiLogger.error("Failed to fetch categories.", error as Error);
    // Even though it's hardcoded, good to have error handling for the future.
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

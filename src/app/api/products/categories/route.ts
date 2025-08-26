
import { NextResponse } from 'next/server';
import { serverLogger } from '@/lib/server-logger';
import { products } from '@/lib/products'; // Импортируем статичные данные

const apiLogger = serverLogger.withCategory("API_CATEGORIES");

export async function GET(request: Request) {
  try {
    apiLogger.info("Received request for product categories (MOCKED).");
    
    // Временно извлекаем категории из файла
    const categories = [...new Set(products.map(p => p.category))];

    apiLogger.info(`Returning ${categories.length} mock categories.`);
    return NextResponse.json(categories);
  } catch (error) {
    apiLogger.error("Failed to fetch mock categories.", error as Error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { serverLogger } from '@/lib/server-logger';
import { products } from '@/lib/products'; // Импортируем статичные данные
import type { Product } from '@/lib/types';

const apiLogger = serverLogger.withCategory("API_PRODUCTS");

export async function GET(request: Request) {
  try {
    apiLogger.info("Received request for all products (MOCKED).");
    
    // Временно возвращаем данные из файла
    const mockProducts: Product[] = products;

    apiLogger.info(`Returning ${mockProducts.length} mock products.`);
    return NextResponse.json(mockProducts);

  } catch (error) {
    apiLogger.error("Failed to fetch mock products.", error as Error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

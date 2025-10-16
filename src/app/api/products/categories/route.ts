
"use server";
// This file is deprecated and will be removed in a future refactoring.
// Please use `categoriesService.getAll` from `categories.service.ts` instead.

import { NextResponse } from 'next/server';
import { serverLogger } from '@/lib/server-logger';
import { categoriesService } from '@/lib/categories.service';

const apiLogger = serverLogger.withCategory("API_CATEGORIES");

export async function GET(_request: Request) {
  try {
    apiLogger.info("Received request for product categories (from DB via service).");
    
    const categories = await categoriesService.getAll();
    const categoryNames = categories.map(c => c.name);

    apiLogger.info(`Returning ${categoryNames.length} category names from database.`);
    return NextResponse.json(categoryNames);
  } catch (error) {
    apiLogger.error("Failed to fetch categories from database.", error as Error);
    return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
  }
}

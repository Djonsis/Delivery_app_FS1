
"use server";

import { z } from "zod";
import { query } from "@/lib/db";
import { serverLogger } from "@/lib/server-logger";
import { revalidatePath } from "next/cache";

const productActionLogger = serverLogger.withCategory("PRODUCT_ACTION");

const productSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  category: z.string().optional(),
  tags: z.string().optional(),
});

// Helper function to convert a JS array to a PostgreSQL array literal string
function toPostgresArray(arr: string[] | undefined | null): string | null {
    if (!arr || arr.length === 0) {
        return null; // Return SQL NULL if array is empty or not provided
    }
    // Escape double quotes and backslashes, then wrap each element in double quotes
    const escapedElements = arr.map(el => `"${el.replace(/\\/g, '\\\\').replace(/"/g, '\"\"')}"`);
    return `{${escapedElements.join(',')}}`;
}

export async function createProductAction(values: unknown) {
  const validatedFields = productSchema.safeParse(values);

  if (!validatedFields.success) {
    productActionLogger.error("Product creation failed due to validation errors", { errors: validatedFields.error.flatten().fieldErrors });
    throw new Error("Invalid form data.");
  }

  const { title, description, price, category, tags } = validatedFields.data;
  
  // Explicitly handle optional fields: convert empty strings or undefined to null
  const finalDescription = description || null;
  const finalCategory = category || null;
  const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
  const tagsForDb = tagsArray.length > 0 ? toPostgresArray(tagsArray) : null;

  try {
    productActionLogger.info("Creating a new product in DB", { title });
    await query(
      `INSERT INTO products (title, description, price, currency, category, tags) VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, finalDescription, price, 'RUB', finalCategory, tagsForDb]
    );
    productActionLogger.info("Successfully created product.", { title });
    
    revalidatePath("/admin/products");
    revalidatePath("/catalog");

  } catch (error) {
    productActionLogger.error("Failed to create product in DB", error as Error, { queryData: { title, finalDescription, price, finalCategory, tagsForDb } });
    throw new Error("Database error. Could not create product.");
  }
}

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

export async function createProductAction(values: unknown) {
  const validatedFields = productSchema.safeParse(values);

  if (!validatedFields.success) {
    productActionLogger.error("Product creation failed due to validation errors", { errors: validatedFields.error.flatten().fieldErrors });
    throw new Error("Invalid form data.");
  }

  const { title, description, price, category, tags } = validatedFields.data;
  const tagsArray = tags?.split(',').map(tag => tag.trim()).filter(Boolean);

  try {
    productActionLogger.info("Creating a new product in DB", { title });
    await query(
      `INSERT INTO products (title, description, price, currency, category, tags) VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, description, price, 'RUB', category, tagsArray]
    );
    productActionLogger.info("Successfully created product.", { title });
    
    revalidatePath("/admin/products");
    revalidatePath("/catalog");

  } catch (error) {
    productActionLogger.error("Failed to create product in DB", error as Error);
    throw new Error("Database error. Could not create product.");
  }
}

import { z } from 'zod';

/**
 * Schema for RAW data from the PostgreSQL 'categories' table.
 * 
 * This schema validates and transforms raw DB data into a format
 * that can be safely used by the application.
 */
export const DbCategorySchema = z.object({
    // Required fields
    id: z.string().uuid("DB: Invalid category UUID"),
    name: z.string().min(1, "DB: Category name cannot be empty"),
    slug: z.string().min(1, "DB: Category slug cannot be empty"),
    sku_prefix: z.string().min(1, "DB: SKU prefix cannot be empty"),
    
    // Nullable field, matches the `Category` type which expects `string | null`.
    description: z.string().nullable(),

    // Timestamps (from node-postgres as ISO strings)
    created_at: z.string().datetime("DB: created_at must be a valid ISO datetime"),
    updated_at: z.string().datetime("DB: updated_at must be a valid ISO datetime"),
});

/**
 * Type of a validated and transformed Category row from the database.
 * This type is identical to the domain `Category` type.
 */
export type DbCategory = z.infer<typeof DbCategorySchema>;

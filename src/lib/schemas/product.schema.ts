import { z } from 'zod';

/**
 * Schema for RAW data from PostgreSQL products table.
 * 
 * CRITICAL: node-postgres returns:
 * - NUMERIC/DECIMAL as string ("199.99")
 * - TIMESTAMP as ISO string ("2024-12-24T10:30:00.000Z")
 * - INTEGER as number (42)
 * - BOOLEAN as boolean (true)
 * - NULL as null (not undefined)
 * - Missing joined fields as undefined
 * 
 * This schema validates and transforms raw DB data into Product-compatible types.
 */
export const DbProductSchema = z.object({
    // ---- Core fields (always present) ----
    id: z.string().uuid("Invalid product UUID from DB"),
    sku: z.string().nullable(),  // Keep null for SQL semantics
    title: z.string().min(1, "DB: Title cannot be empty"),
    description: z.string().nullable(),

    // ⚠️ NUMERIC columns come as strings
    price: z.string()
        .transform(val => parseFloat(val))
        .refine(val => !isNaN(val) && val >= 0, "DB: Invalid or negative price"),

    currency: z.string().length(3, "DB: Currency must be 3 characters"),
    category_id: z.string().uuid("DB: Invalid category UUID").nullable(),
    
    // Arrays: null if column is NULL, never undefined
    tags: z.array(z.string()).nullable(),
    
    image_url: z.string().url("DB: Invalid image URL").nullable(),

    // ⚠️ NUMERIC as string
    rating: z.string()
        .transform(val => parseFloat(val))
        .refine(val => !isNaN(val) && val >= 0 && val <= 5, "DB: Rating must be 0-5"),

    // ✅ INTEGER as number
    reviews: z.number().int().nonnegative("DB: Reviews must be non-negative"),

    // ---- Joined field (undefined if JOIN finds nothing) ----
    category_name: z.string().min(1).optional(),

    // ---- Weighted product fields ----
    is_weighted: z.boolean(),
    
    unit: z.enum(['kg', 'g', 'pcs'], {
        errorMap: () => ({ message: "DB: Unit must be kg, g, or pcs" })
    }),
    
    // ⚠️ MISSING in your original schema!
    weight_category: z.enum(['light', 'middle', 'heavy', 'none'])
        .nullable()
        .transform(val => val ?? undefined),
    
    // ⚠️ Careful with NaN from parseFloat
    price_per_unit: z.string().nullable()
        .transform(val => {
            if (val === null) return undefined;
            const parsed = parseFloat(val);
            if (isNaN(parsed)) {
                throw new Error("DB: price_per_unit is not a valid number");
            }
            return parsed;
        })
        .refine(
            val => val === undefined || val >= 0,
            "DB: price_per_unit must be non-negative"
        ),
        
    price_unit: z.enum(['kg', 'g', 'pcs'])
        .nullable()
        .transform(val => val ?? undefined),

    min_order_quantity: z.string()
        .transform(val => {
            const parsed = parseFloat(val);
            if (isNaN(parsed)) {
                throw new Error("DB: min_order_quantity is not a valid number");
            }
            return parsed;
        })
        .refine(val => val > 0, "DB: min_order_quantity must be positive"),

    step_quantity: z.string()
        .transform(val => {
            const parsed = parseFloat(val);
            if (isNaN(parsed)) {
                throw new Error("DB: step_quantity is not a valid number");
            }
            return parsed;
        })
        .refine(val => val > 0, "DB: step_quantity must be positive"),

    weight_template_id: z.string().uuid()
        .nullable()
        .transform(val => val ?? undefined),

    // ⚠️ Timestamps as ISO strings
    created_at: z.string().datetime("DB: created_at must be valid ISO datetime"),
    updated_at: z.string().datetime("DB: updated_at must be valid ISO datetime"),
    deleted_at: z.string().datetime("DB: deleted_at must be valid ISO datetime").nullable(),

    // ---- Optional fields ----
    brand: z.string().nullable().transform(val => val ?? undefined),
    manufacturer: z.string().nullable().transform(val => val ?? undefined),
    
    // ✅ Improved: no more z.any()
    nutrition: z.record(z.union([z.string(), z.number()]))
        .nullable()
        .transform(val => val ?? null),  // Keep null for consistency
});

/**
 * Type of validated and transformed DB row.
 * 
 * After Zod processing:
 * - Numeric fields (price, rating, etc.) → number
 * - Nullable strings → string | null (NOT undefined, for SQL semantics)
 * - Optional joined fields → string | undefined
 * - Timestamps → string (ISO format)
 */
export type DbProduct = z.infer<typeof DbProductSchema>;
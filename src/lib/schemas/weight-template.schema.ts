
import { z } from 'zod';

/**
 * Schema for RAW data from the PostgreSQL 'weight_templates' table.
 * This validates the data as it comes from node-postgres, where numeric types are strings.
 */
export const DbWeightTemplateSchema = z.object({
    id: z.string().uuid("DB: Invalid template UUID"),
    name: z.string().min(1, "DB: Template name cannot be empty"),
    description: z.string().nullable(),
    
    unit: z.enum(['kg', 'g', 'pcs'], { 
        errorMap: () => ({ message: "DB: Unit must be kg, g, or pcs" })
    }),

    // Numeric columns are returned as strings from the DB
    min_order_quantity: z.string()
        .transform(val => parseFloat(val))
        .refine(val => !isNaN(val) && val > 0, "DB: min_order_quantity must be a positive number"),
        
    step_quantity: z.string()
        .transform(val => parseFloat(val))
        .refine(val => !isNaN(val) && val > 0, "DB: step_quantity must be a positive number"),

    is_active: z.boolean(),

    created_at: z.string().datetime("DB: created_at must be a valid ISO datetime"),
    updated_at: z.string().datetime("DB: updated_at must be a valid ISO datetime"),
});

export type DbWeightTemplate = z.infer<typeof DbWeightTemplateSchema>;


import { z } from 'zod';
import { PortableNumber, PortableBoolean } from './schema-helpers';

/**
 * Schema for data from the 'weight_templates' table.
 * Compatible with both PostgreSQL (numeric as string) and SQLite (numeric as number).
 */
export const DbWeightTemplateSchema = z.object({
    id: z.string().uuid("DB: Invalid template UUID"),
    name: z.string().min(1, "DB: Template name cannot be empty"),
    description: z.string().nullable(),
    
    unit: z.enum(['kg', 'g', 'pcs'], { 
        errorMap: () => ({ message: "DB: Unit must be kg, g, or pcs" })
    }),

    min_order_quantity: PortableNumber.refine(val => val > 0, "DB: min_order_quantity must be a positive number"),
        
    step_quantity: PortableNumber.refine(val => val > 0, "DB: step_quantity must be a positive number"),

    is_active: PortableBoolean,

    created_at: z.string().datetime("DB: created_at must be a valid ISO datetime"),
    updated_at: z.string().datetime("DB: updated_at must be a valid ISO datetime"),
});

export type DbWeightTemplate = z.infer<typeof DbWeightTemplateSchema>;

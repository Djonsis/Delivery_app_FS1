
import { z } from "zod";
import { PortableNumber, PortableBoolean, PortableJson } from "./schema-helpers";

/**
 * Финальная схема продукта из базы данных.
 * Полностью совместима с SQLite и PostgreSQL.
 */
export const DbProductSchema = z.object({
    // --- Основные поля ---
    id: z.string().uuid(),
    sku: z.string().nullable(),
    title: z.string().min(1),
    description: z.string().nullable(),

    price: PortableNumber.refine(val => val >= 0),
    currency: z.string().length(3),

    category_id: z.string().uuid().nullable(),

    rating: PortableNumber.refine(val => val >= 0 && val <= 5),
    reviews: PortableNumber.refine(val => val >= 0).transform(val => Math.round(val)), // Ensure integer

    image_url: z.string().url().nullable(),

    tags: PortableJson, // Handles both array (PG) and string (SQLite)

    // --- Присоединённая информация о категории ---
    category_name: z.string().min(1).optional(),

    // --- Весовые товары ---
    is_weighted: PortableBoolean,

    unit: z.enum(["kg", "g", "pcs"]),

    weight_category: z.enum(['light', 'middle', 'heavy', 'none']).nullable().optional(),

    price_per_unit: PortableNumber.nullable().optional().default(null),

    price_unit: z.enum(["kg", "g", "pcs"]).nullable().optional().default(null),

    weight_template_id: z.string().uuid().nullable().optional().default(null),

    // --- Количество ---
    min_order_quantity: PortableNumber.refine(val => val > 0),
    step_quantity: PortableNumber.refine(val => val > 0),

    // --- Доп. инфо ---
    brand: z.string().nullable(),
    manufacturer: z.string().nullable(),

    nutrition: PortableJson,

    // --- Метаданные ---
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    deleted_at: z.string().datetime().nullable(),
});

export type DbProduct = z.infer<typeof DbProductSchema>;


// src/lib/schemas/product.schema.ts

import { z } from "zod";

/**
 * Универсальные утилиты для PostgreSQL и SQLite.
 */

// number или строка → число
const PortableNumber = z.coerce.number();

// boolean или 0/1 → boolean (Предпочтительно для JS-модели)
const PortableBoolean = z.union([z.boolean(), z.number()]).transform(v => Boolean(v));

// JSON-объект или строка → объект/null
const PortableJson = z
    .union([
        z.record(z.union([z.string(), z.number()])).nullable(),
        z.string().nullable()
    ])
    .transform(val => {
        if (typeof val === "string") {
            try {
                return JSON.parse(val);
            } catch {
                return null;
            }
        }
        return val;
    });

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

    price: PortableNumber.nonnegative(),
    currency: z.string().length(3),

    category_id: z.string().uuid().nullable(),

    rating: PortableNumber.gte(0).lte(5),
    // Использование PortableNumber для reviews (улучшение)
    reviews: PortableNumber.int().nonnegative(),

    image_url: z.string().url().nullable(),

    // tags: JSON array (PG) или JSON-string (SQLite)
    tags: z
        .union([z.array(z.string()), z.string()])
        .nullable()
        .transform(val => {
            if (typeof val === "string") {
                try {
                    return JSON.parse(val);
                } catch {
                    return [];
                }
            }
            return val ?? [];
        }),

    // --- Присоединённая информация о категории ---
    category_name: z.string().min(1).optional(),

    // --- Весовые товары ---
    // Используем PortableBoolean для вывода типа 'boolean' (Ваше оригинальное, более чистое решение)
    is_weighted: PortableBoolean,

    unit: z.enum(["kg", "g", "pcs"]),

    weight_category: z.string().nullable().optional().default(null),

    // ИСПРАВЛЕНО: Сначала проверяем на null, потом на число
    price_per_unit: z
        .union([z.null(), PortableNumber.nonnegative()])
        .optional()
        .default(null),

    price_unit: z
        .union([z.enum(["kg", "g", "pcs"]), z.null()])
        .optional()
        .default(null),

    weight_template_id: z.string().uuid().nullable().optional().default(null),

    // --- Количество ---
    min_order_quantity: PortableNumber.positive(),
    step_quantity: PortableNumber.positive(),

    // --- Доп. инфо ---
    brand: z.string().nullable(),
    manufacturer: z.string().nullable(),

    // Используем утилиту PortableJson (уличшение)
    nutrition: PortableJson,

    // --- Метаданные ---
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    deleted_at: z.string().datetime().nullable(),
});

export type DbProduct = z.infer<typeof DbProductSchema>;

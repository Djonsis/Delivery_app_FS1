// src/lib/schemas/portable.ts
import { z } from "zod";

/**
 * -------------------------------------------------------------------
 *  PortableNumber
 * -------------------------------------------------------------------
 * Универсальный числовой тип для SQLite и PostgreSQL.
 *
 * ✔ SQLite возвращает число как number
 * ✔ PostgreSQL (NUMERIC/DECIMAL) возвращает строку "123.45"
 *
 * Мы приводим оба варианта к нормальному числу:
 *    Number("123.45")  → 123.45
 *
 * При этом:
 * - запрещаем NaN
 * - запрещаем Infinity и -Infinity
 */
export const PortableNumber = z
    .union([z.string(), z.number()])
    .transform((val) => {
        const num = Number(val);
        return num;
    })
    .refine((val) => !isNaN(val), { message: "Must be a valid number" })
    .refine((val) => Number.isFinite(val), { message: "Number must be finite" });

/**
 * -------------------------------------------------------------------
 *  PortableBoolean
 * -------------------------------------------------------------------
 * Универсальный булев тип:
 *
 * ✔ PostgreSQL возвращает true/false
 * ✔ SQLite возвращает 1/0
 *
 * Мы приводим:
 *    true  → true
 *    false → false
 *    1     → true
 *    0     → false
 */
export const PortableBoolean = z
    .union([z.boolean(), z.number()])
    .transform((v) => Boolean(v));

/**
 * -------------------------------------------------------------------
 *  PortableJson
 * -------------------------------------------------------------------
 * Универсальный JSON тип для SQLite и PostgreSQL.
 *
 * ✔ PostgreSQL возвращает объект или массив
 * ✔ SQLite возвращает JSON как строку
 *
 * Мы делаем:
 *     JSON.parse("...") → объект
 *
 * И допускаем И ЛЮБОЙ формат JSON:
 * - массивы
 * - объекты
 * - строки
 * - числа
 * - boolean
 * - null
 *
 * Если строка не парсится — возвращаем null.
 */
export const PortableJson = z
    .union([z.string(), z.any()])
    .transform((val) => {
        if (typeof val === "string") {
            try {
                return JSON.parse(val);
            } catch {
                return null;
            }
        }
        return val;
    });

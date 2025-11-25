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

/**
 * -------------------------------------------------------------------
 *  PortableDatetime
 * -------------------------------------------------------------------
 * Универсальный datetime тип для SQLite и PostgreSQL.
 *
 * ✔ PostgreSQL возвращает ISO 8601: "2025-11-24T14:02:33.000Z"
 * ✔ SQLite возвращает: "2025-11-24 14:02:33" (без T и Z)
 *
 * Мы нормализуем оба формата в ISO 8601 строку для единообразия:
 *    "2025-11-24 14:02:33"    → "2025-11-24T14:02:33.000Z"
 *    "2025-11-24T14:02:33Z"   → "2025-11-24T14:02:33.000Z"
 *
 * При этом:
 * - Валидируем корректность даты
 * - Отклоняем невалидные форматы с понятной ошибкой
 */
export const PortableDatetime = z
    .string()
    .transform((val, ctx) => {
        // Попытка 1: Парсим как есть (работает для ISO 8601)
        let date = new Date(val);

        // Попытка 2: Если не получилось, пробуем SQLite формат
        if (isNaN(date.getTime())) {
            // Проверяем паттерн "YYYY-MM-DD HH:MM:SS"
            const sqlitePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
            if (sqlitePattern.test(val)) {
                // Преобразуем "2025-11-24 14:02:33" -> "2025-11-24T14:02:33Z"
                date = new Date(val.replace(' ', 'T') + 'Z');
            }
        }

        // Если все еще невалидно — возвращаем ошибку
        if (isNaN(date.getTime())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Invalid datetime format: "${val}". Expected ISO 8601 or SQLite format (YYYY-MM-DD HH:MM:SS).`,
            });
            return z.NEVER;
        }

        // Возвращаем нормализованную ISO 8601 строку
        return date.toISOString();
    });
    
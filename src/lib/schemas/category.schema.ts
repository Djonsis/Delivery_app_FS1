import { z } from "zod";

/**
 * Схема для данных категории, приходящих из базы данных.
 * Валидирует "сырые" данные.
 */
export const DbCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  sku_prefix: z.string().min(1),
  description: z.string().nullable(),
  is_active: z.boolean(), // ✅ FIX: Добавляем поле в схему валидации
  created_at: z.string(), // Предполагаем, что даты приходят как строки
  updated_at: z.string(),
});

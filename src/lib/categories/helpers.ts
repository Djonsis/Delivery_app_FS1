import type { Category } from "@/lib/types";
import { validateDbRow } from "@/lib/utils/validate-db-row";
import { DbCategorySchema } from "@/lib/schemas/category.schema";
import { normalizeDbDate } from "@/lib/db/utils/normalize-db-date";

export function mapDbRowToCategory(row: unknown): Category {
  const validated = validateDbRow(row, DbCategorySchema, "categories");

  return {
    id: validated.id,
    name: validated.name,
    slug: validated.slug,
    sku_prefix: validated.sku_prefix,
    description: validated.description,
    is_active: validated.is_active, // ✅ FIX: Добавляем недостающее поле

    created_at: normalizeDbDate(validated.created_at),
    updated_at: normalizeDbDate(validated.updated_at),
  };
}

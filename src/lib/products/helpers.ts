import { DbProductSchema } from '@/lib/schemas/product.schema';
import { Product } from '@/lib/types';
import { validateDbRow } from '@/lib/utils/validate-db-row';
import { normalizeDbDate } from '@/lib/db/utils/normalize-db-date';

export function mapDbRowToProduct(row: unknown): Product {
  const validated = validateDbRow(row, DbProductSchema, 'mapDbRowToProduct');

  return {
    id: validated.id,
    sku: validated.sku,
    title: validated.title,
    description: validated.description ?? null,
    price: validated.price,
    currency: validated.currency,

    category_id: validated.category_id ?? null,
    category: validated.category_name ?? "",

    tags: validated.tags ?? [],
    imageUrl: validated.image_url ?? "",

    rating: validated.rating,
    reviews: validated.reviews,

    brand: validated.brand ?? undefined,
    manufacturer: validated.manufacturer ?? undefined,
    nutrition: validated.nutrition ?? undefined,

    is_weighted: validated.is_weighted,
    unit: validated.unit,
    weight_category: validated.weight_category ?? undefined,
    price_per_unit: validated.price_per_unit ?? undefined,
    price_unit: validated.price_unit ?? undefined,
    min_order_quantity: validated.min_order_quantity,
    step_quantity: validated.step_quantity,
    weight_template_id: validated.weight_template_id ?? undefined,

    created_at: normalizeDbDate(validated.created_at),
    updated_at: normalizeDbDate(validated.updated_at),
    deleted_at: validated.deleted_at 
      ? normalizeDbDate(validated.deleted_at)
      : null,
  };
}

import type { WeightTemplate } from "@/lib/types";
import { validateDbRow } from "@/lib/utils/validate-db-row";
import { DbWeightTemplateSchema } from "@/lib/schemas/weight-template.schema";
import { normalizeDbDate } from "@/lib/db/utils/normalize-db-date";

export function mapDbRowToWeightTemplate(row: unknown): WeightTemplate {
  const validated = validateDbRow(row, DbWeightTemplateSchema, "weight_templates");

  return {
    id: validated.id,
    name: validated.name,
    description: validated.description,
    unit: validated.unit,
    min_order_quantity: validated.min_order_quantity,
    step_quantity: validated.step_quantity,
    is_active: validated.is_active,

    created_at: normalizeDbDate(validated.created_at),
    updated_at: normalizeDbDate(validated.updated_at),
  };
}

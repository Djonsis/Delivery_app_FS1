import type { WeightTemplate, WeightTemplateUpdateInput } from "@/lib/types";
import { validateDbRow } from "@/lib/utils/validate-db-row";
import { DbWeightTemplateSchema } from "@/lib/schemas/weight-template.schema";

/**
 * Safely maps a raw database row to the application's WeightTemplate type.
 * Performs runtime validation using DbWeightTemplateSchema.
 * 
 * @throws {DbValidationError} if validation fails.
 */
export function mapDbRowToWeightTemplate(row: unknown): WeightTemplate {
    return validateDbRow(row, DbWeightTemplateSchema, "weight_templates");
}

/**
 * Prepares a safe, type-checked SQL SET clause and parameters for UPDATE queries.
 * Dynamically updates only provided fields.
 */
export function prepareWeightTemplateUpdateParams(
    data: Partial<WeightTemplateUpdateInput>
): { setClause: string; values: unknown[] } {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    const mapping: Partial<Record<keyof WeightTemplateUpdateInput, string>> = {
        name: "name",
        description: "description",
        unit: "unit",
        min_order_quantity: "min_order_quantity",
        step_quantity: "step_quantity",
        is_active: "is_active",
    };

    let index = 1;
    for (const key of Object.keys(data) as (keyof WeightTemplateUpdateInput)[]) {
        const value = data[key];
        if (value !== undefined && key in mapping) {
            setClauses.push(`${mapping[key]} = $${index++}`);
            // Explicitly convert undefined → null to ensure valid SQL params
            values.push(value ?? null);
        }
    }

    if (setClauses.length === 0) {
        return { setClause: "", values: [] };
    }

    setClauses.push("updated_at = NOW()");
    return { setClause: setClauses.join(", "), values };
}

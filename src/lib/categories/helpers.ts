import type { Category, CategoryUpdateInput } from "@/lib/types";
import { validateDbRow } from "@/lib/utils/validate-db-row";
import { DbCategorySchema } from "@/lib/schemas/category.schema";

/**
 * Generates a URL-friendly slug from a string.
 * @param name The string to convert.
 * @returns The generated slug.
 */
export const generateSlug = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

/**
 * Safely maps a raw database row (unknown) to the application's Category type.
 * @param row The raw object from the database.
 * @returns The fully validated Category object.
 * @throws {DbValidationError} if validation fails.
 */
export function mapDbRowToCategory(row: unknown): Category {
    // Validation is the mapping, since DbCategory and Category are identical.
    return validateDbRow(row, DbCategorySchema, "categories");
}

/**
 * Prepares the SET clause and values for a category UPDATE statement.
 * @param categoryData The partial data for the category.
 * @returns An object with the SET clause string and an array of values.
 */
export function prepareCategoryUpdateParams(categoryData: Partial<CategoryUpdateInput>): { setClause: string; values: unknown[] } {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    const mapping: Record<keyof CategoryUpdateInput, string> = {
        name: 'name',
        description: 'description',
        sku_prefix: 'sku_prefix',
    };

    let valueIndex = 1;
    (Object.keys(categoryData) as (keyof CategoryUpdateInput)[]).forEach(key => {
        const rawValue = categoryData[key];
        if (rawValue !== undefined) {
            const finalValue: unknown = rawValue;

            // If name is being updated, we must also update the slug.
            if (key === 'name') {
                const newName = String(finalValue).trim();
                if (newName) {
                    setClauses.push(`name = $${valueIndex++}`);
                    values.push(newName);
                    setClauses.push(`slug = $${valueIndex++}`);
                    values.push(generateSlug(newName));
                } // Do not process if name is an empty string
            } else if (key in mapping) {
                setClauses.push(`${mapping[key]} = $${valueIndex++}`);
                values.push(finalValue ?? null);
            }
        }
    });

    if (setClauses.length === 0) {
        // This case is handled in the service to avoid unnecessary DB calls,
        // but we can throw here as a safeguard.
        throw new Error('No valid fields provided for update.');
    }

    // Always update the timestamp
    setClauses.push(`updated_at = NOW()`);

    return {
        setClause: setClauses.join(', '),
        values
    };
}


import { query } from "@/lib/db";
import { serverLogger } from "@/lib/server-logger";
import type { WeightTemplate, WeightTemplateCreateInput, WeightTemplateUpdateInput } from "@/lib/types";
import { validateDbRows, DbValidationError } from "@/lib/utils/validate-db-row";
import { DbWeightTemplateSchema } from "@/lib/schemas/weight-template.schema";
// ✅ FIX: Убираем импорт удаленной функции
import { mapDbRowToWeightTemplate } from "@/lib/weight-templates/helpers";

const log = serverLogger.withCategory("WEIGHT_TEMPLATES_SERVICE");

// Type guard for PostgreSQL errors
function isDbError(error: unknown): error is { code: string; constraint?: string } {
    return typeof error === "object" && error !== null && "code" in error;
}

/**
 * Получение всех активных шаблонов веса.
 */
async function getActive(): Promise<WeightTemplate[]> {
    log.info("💾 Fetching active weight templates from DB.");
    try {
        const { rows } = await query(`
            SELECT * FROM weight_templates
            WHERE is_active = true
            ORDER BY name ASC
        `);

        const validatedRows = validateDbRows(rows, DbWeightTemplateSchema, "weight_templates", { skipInvalid: true });
        return validatedRows.map(mapDbRowToWeightTemplate);
    } catch (error: unknown) {
        log.error("Database error in getActive()", { error });
        throw error;
    }
}

/**
 * Получение всех шаблонов (для админки).
 */
async function getAll(): Promise<WeightTemplate[]> {
    log.info("💾 Fetching all weight templates from DB (admin).");
    try {
        const { rows } = await query(`
            SELECT * FROM weight_templates
            ORDER BY is_active DESC, name ASC
        `);

        const validatedRows = validateDbRows(rows, DbWeightTemplateSchema, "weight_templates", { skipInvalid: true });
        return validatedRows.map(mapDbRowToWeightTemplate);
    } catch (error: unknown) {
        log.error("Database error in getAll()", { error });
        throw error;
    }
}

/**
 * Получение шаблона по ID.
 */
async function getById(id: string): Promise<WeightTemplate | null> {
    log.info("💾 Fetching weight template by ID.", { id });
    try {
        const { rows } = await query(
            `SELECT * FROM weight_templates WHERE id = $1`,
            [id]
        );

        if (rows.length === 0) return null;
        return mapDbRowToWeightTemplate(rows[0]);
    } catch (error: unknown) {
        if (error instanceof DbValidationError) {
            log.warn("Weight template validation failed in getById()", { id, details: error.message });
            return null;
        }
        log.error("Database error in getById()", { id, error });
        throw error;
    }
}

/**
 * Создание нового шаблона веса.
 */
async function create(
    data: WeightTemplateCreateInput
): Promise<{ success: boolean; message: string; template?: WeightTemplate }> {
    log.info("💾 Creating new weight template.", { name: data.name });
    try {
        const { rows } = await query(
            `
            INSERT INTO weight_templates (name, description, unit, min_order_quantity, step_quantity, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING *
        `,
            [data.name, data.description ?? null, data.unit, data.min_order_quantity, data.step_quantity]
        );

        const template = mapDbRowToWeightTemplate(rows[0]);
        log.info("Weight template created successfully.", { id: template.id });
        return { success: true, message: "Шаблон успешно создан.", template };
    } catch (error: unknown) {
        log.error("Database error in create()", { error, data });

        if (isDbError(error) && error.code === "23505" && error.constraint === "weight_templates_name_key") {
            return { success: false, message: "Шаблон с таким названием уже существует." };
        }

        return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
    }
}

/**
 * Обновление шаблона веса.
 */
async function update(
    id: string,
    data: Partial<WeightTemplateUpdateInput>
): Promise<{ success: boolean; message: string; template?: WeightTemplate }> {
    log.info("💾 Updating weight template.", { id, changes: data });

    // ✅ FIX: Логика подготовки параметров для обновления перенесена сюда
    const updateableFields: (keyof WeightTemplateUpdateInput)[] = ["name", "description", "unit", "min_order_quantity", "step_quantity", "is_active"];
    const fieldsToUpdate = updateableFields
        .map(key => data[key] !== undefined ? { key, value: data[key] } : null)
        .filter(Boolean) as { key: string, value: any }[];

    if (fieldsToUpdate.length === 0) {
        log.warn("Update called with no data.", { id });
        return { success: true, message: "Никаких изменений не было сделано." };
    }

    const setClause = fieldsToUpdate.map((f, i) => `${f.key} = $${i + 1}`).join(", ");
    const values = fieldsToUpdate.map(f => f.value);

    try {
        const queryParams = [...values, id];
        const { rows } = await query(
            `
            UPDATE weight_templates
            SET ${setClause}, updated_at = NOW()
            WHERE id = $${queryParams.length}
            RETURNING *
        `,
            queryParams
        );

        if (rows.length === 0) {
            return { success: false, message: "Шаблон не найден." };
        }

        const template = mapDbRowToWeightTemplate(rows[0]);
        log.info("Weight template updated successfully.", { id });
        return { success: true, message: "Шаблон успешно обновлен.", template };
    } catch (error: unknown) {
        log.error("Database error in update()", { error, id, data });

        if (isDbError(error) && error.code === "23505" && error.constraint === "weight_templates_name_key") {
            return { success: false, message: "Шаблон с таким названием уже существует." };
        }

        return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
    }
}

/**
 * Удаление шаблона (на самом деле деактивация).
 */
async function remove(id: string): Promise<{ success: boolean; message: string }> {
    log.info("💾 Deactivating weight template.", { id });
    try {
        const { rowCount } = await query(
            `UPDATE weight_templates SET is_active = false, updated_at = NOW() WHERE id = $1 AND is_active = true`,
            [id]
        );

        if (rowCount === 0) {
            return { success: false, message: "Шаблон не найден или уже неактивен." };
        }

        log.info("Weight template deactivated successfully.", { id });
        return { success: true, message: "Шаблон успешно деактивирован." };
    } catch (error: unknown) {
        log.error("Database error in remove()", { id, error });
        return { success: false, message: "Произошла непредвиденная ошибка в базе данных." };
    }
}

export const weightTemplatesService = {
    getAll,
    getActive,
    getById,
    create,
    update,
    delete: remove,
};

export type WeightTemplatesService = typeof weightTemplatesService;

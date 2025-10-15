
import { v4 as uuidv4 } from 'uuid';
import { query } from "./db";
import { serverLogger } from "./server-logger";
import { WeightTemplate, WeightTemplateCreateInput, WeightTemplateUpdateInput } from "./types";
import { runLocalOrDb } from "./env";
import { mockTemplates } from './mock-data';

const serviceLogger = serverLogger.withCategory("WEIGHT_TEMPLATES_SERVICE");

const mapDbRowToWeightTemplate = (row: Record<string, unknown>): WeightTemplate => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null | undefined,
    unit: row.unit as WeightTemplate['unit'],
    min_order_quantity: parseFloat(row.min_order_quantity as string),
    step_quantity: parseFloat(row.step_quantity as string),
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
});

async function getActive(): Promise<WeightTemplate[]> {
    return runLocalOrDb(
        () => Promise.resolve(mockTemplates.filter(t => t.is_active)),
        async () => {
            serviceLogger.info("Fetching all active weight templates from DB.");
            const { rows } = await query(
                'SELECT * FROM weight_templates WHERE is_active = true ORDER BY name ASC'
            );
            serviceLogger.debug(`Found ${rows.length} active weight templates.`);
            return rows.map(mapDbRowToWeightTemplate);
        }
    );
}

async function getAll(): Promise<WeightTemplate[]> {
    return runLocalOrDb(
        () => Promise.resolve(mockTemplates),
        async () => {
            serviceLogger.info("Fetching all weight templates from DB for admin.");
            const { rows } = await query(
                'SELECT * FROM weight_templates ORDER BY is_active DESC, name ASC'
            );
            return rows.map(mapDbRowToWeightTemplate);
        }
    );
}

async function getById(id: string): Promise<WeightTemplate | null> {
    return runLocalOrDb(
        () => Promise.resolve(mockTemplates.find(t => t.id === id) || null),
        async () => {
            serviceLogger.info("Fetching weight template by ID from DB.", { id });
            const { rows } = await query(
                'SELECT * FROM weight_templates WHERE id = $1',
                [id]
            );
            if (rows.length === 0) return null;
            return mapDbRowToWeightTemplate(rows[0]);
        }
    );
}

async function create(data: WeightTemplateCreateInput): Promise<WeightTemplate> {
    return runLocalOrDb(
        () => {
            const newTemplate: WeightTemplate = {
                id: uuidv4(),
                ...data,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            mockTemplates.push(newTemplate);
            serviceLogger.warn("Running in local mode. Created mock weight template.", { newTemplate });
            return Promise.resolve(newTemplate);
        },
        async () => {
            serviceLogger.info("Creating new weight template.", { name: data.name });
            const { rows } = await query(`
                INSERT INTO weight_templates (name, description, unit, min_order_quantity, step_quantity, is_active)
                VALUES ($1, $2, $3, $4, $5, true)
                RETURNING *
            `, [data.name, data.description, data.unit, data.min_order_quantity, data.step_quantity]);
            
            serviceLogger.info("Weight template created successfully.", { id: rows[0].id });
            return mapDbRowToWeightTemplate(rows[0]);
        }
    );
}

async function update(id: string, data: WeightTemplateUpdateInput): Promise<WeightTemplate> {
    return runLocalOrDb(
        () => {
            const templateIndex = mockTemplates.findIndex(t => t.id === id);
            if (templateIndex === -1) throw new Error("Template not found in mock data");
            mockTemplates[templateIndex] = { ...mockTemplates[templateIndex], ...data, updated_at: new Date().toISOString() };
            return Promise.resolve(mockTemplates[templateIndex]);
        },
        async () => {
            serviceLogger.info("Updating weight template.", { id });
            
            const fields: string[] = [];
            const values: unknown[] = [];
            let paramCounter = 1;
            
            const updatableFields: (keyof WeightTemplateUpdateInput)[] = ['name', 'description', 'unit', 'min_order_quantity', 'step_quantity', 'is_active'];
            
            for (const field of updatableFields) {
                if (data[field] !== undefined) {
                    fields.push(`${field} = $${paramCounter}`);
                    values.push(data[field]);
                    paramCounter++;
                }
            }
            
            if (fields.length === 0) {
                serviceLogger.warn("Update called with no fields to update for template", { id });
                const template = await getById(id);
                if (!template) throw new Error("Template not found");
                return template;
            }

            fields.push(`updated_at = NOW()`);
            values.push(id);
            
            const { rows } = await query(`
                UPDATE weight_templates 
                SET ${fields.join(', ')}
                WHERE id = $${paramCounter}
                RETURNING *
            `, values);
            
            if (rows.length === 0) throw new Error("Weight template not found");
            
            serviceLogger.info("Weight template updated successfully.", { id });
            return mapDbRowToWeightTemplate(rows[0]);
        }
    );
}

export const weightTemplatesService = {
    getAll,
    getActive,
    getById,
    create,
    update,
};

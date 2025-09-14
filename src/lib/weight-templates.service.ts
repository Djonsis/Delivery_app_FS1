
import { v4 as uuidv4 } from 'uuid';
import { query } from "./db";
import { serverLogger } from "./server-logger";
import { WeightTemplate } from "./types";
import { runLocalOrDb } from "./env";
import { mockTemplates } from './mock-data';

const serviceLogger = serverLogger.withCategory("WEIGHT_TEMPLATES_SERVICE");

const mapDbRowToWeightTemplate = (row: any): WeightTemplate => ({
    ...row,
    min_order_quantity: parseFloat(row.min_order_quantity),
    step_quantity: parseFloat(row.step_quantity),
});

export const weightTemplatesService = {
    async getActive(): Promise<WeightTemplate[]> {
        return runLocalOrDb(
            () => mockTemplates.filter(t => t.is_active),
            async () => {
                serviceLogger.info("Fetching all active weight templates from DB.");
                const { rows } = await query(
                    'SELECT * FROM weight_templates WHERE is_active = true ORDER BY name ASC'
                );
                serviceLogger.debug(`Found ${rows.length} active weight templates.`);
                return rows.map(mapDbRowToWeightTemplate);
            }
        );
    },

    async getAll(): Promise<WeightTemplate[]> {
        return runLocalOrDb(
            () => mockTemplates,
            async () => {
                serviceLogger.info("Fetching all weight templates from DB for admin.");
                const { rows } = await query(
                    'SELECT * FROM weight_templates ORDER BY is_active DESC, name ASC'
                );
                return rows.map(mapDbRowToWeightTemplate);
            }
        );
    },

    async getById(id: string): Promise<WeightTemplate | null> {
        return runLocalOrDb(
            () => mockTemplates.find(t => t.id === id) || null,
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
    },

    async create(data: Omit<WeightTemplate, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<WeightTemplate> {
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
                return newTemplate;
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
    },

    async update(id: string, data: Partial<Omit<WeightTemplate, 'id' | 'created_at' | 'updated_at'>>): Promise<WeightTemplate> {
        return runLocalOrDb(
            () => {
                const templateIndex = mockTemplates.findIndex(t => t.id === id);
                if (templateIndex === -1) throw new Error("Template not found in mock data");
                mockTemplates[templateIndex] = { ...mockTemplates[templateIndex], ...data, updated_at: new Date().toISOString() };
                return mockTemplates[templateIndex];
            },
            async () => {
                serviceLogger.info("Updating weight template.", { id });
                
                const fields = [];
                const values = [];
                let paramCounter = 1;
                
                const updatableFields: (keyof typeof data)[] = ['name', 'description', 'unit', 'min_order_quantity', 'step_quantity', 'is_active'];
                
                for (const field of updatableFields) {
                    if (data[field] !== undefined) {
                        fields.push(`${field} = $${paramCounter}`);
                        values.push(data[field]);
                        paramCounter++;
                    }
                }
                
                if (fields.length === 0) {
                    serviceLogger.warn("Update called with no fields to update for template", { id });
                    const template = await this.getById(id);
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
};


"use server";

import { v4 as uuidv4 } from 'uuid';
import { query } from "./db";
import { serverLogger } from "./server-logger";
import { WeightTemplate, UnitType } from "./types";
import { isLocal } from "./env";

const serviceLogger = serverLogger.withCategory("WEIGHT_TEMPLATES_SERVICE");

// Mock данные для локальной разработки
const mockTemplates: WeightTemplate[] = [
    {
        id: uuidv4(),
        name: 'Овощи/фрукты (кг)',
        description: 'Стандартные весовые товары в килограммах',
        unit: 'kg',
        min_order_quantity: 0.5,
        step_quantity: 0.1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Специи/приправы (г)',
        description: 'Мелкие весовые товары в граммах',
        unit: 'g',
        min_order_quantity: 10,
        step_quantity: 10,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Штучные дробные',
        description: 'Товары, продающиеся дробными штуками',
        unit: 'pcs',
        min_order_quantity: 0.5,
        step_quantity: 0.5,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Крупы/сыпучие (кг)',
        description: 'Сыпучие товары в килограммах',
        unit: 'kg',
        min_order_quantity: 1.0,
        step_quantity: 0.5,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

/**
 * Получить все активные шаблоны весовых товаров
 */
export async function getActiveWeightTemplates(): Promise<WeightTemplate[]> {
    if (isLocal()) {
        serviceLogger.warn("Running in local/studio environment. Returning mock weight templates.");
        return mockTemplates.filter(t => t.is_active);
    }
   
    serviceLogger.info("Fetching all active weight templates from DB.");
    try {
        const { rows } = await query(
            'SELECT * FROM weight_templates WHERE is_active = true ORDER BY name ASC'
        );
        
        serviceLogger.debug(`Found ${rows.length} active weight templates.`);
        return rows.map(row => ({
            ...row,
            min_order_quantity: parseFloat(row.min_order_quantity),
            step_quantity: parseFloat(row.step_quantity),
        }));
    } catch (error) {
        serviceLogger.error("Error fetching weight templates from DB", error as Error);
        throw new Error("Could not fetch weight templates.");
    }
}

/**
 * Получить все шаблоны (включая неактивные) для админки
 */
export async function getAllWeightTemplates(): Promise<WeightTemplate[]> {
    if (isLocal()) {
        serviceLogger.warn("Running in local/studio environment. Returning all mock weight templates.");
        return mockTemplates;
    }
   
    serviceLogger.info("Fetching all weight templates from DB for admin.");
    try {
        const { rows } = await query(
            'SELECT * FROM weight_templates ORDER BY is_active DESC, name ASC'
        );
        
        return rows.map(row => ({
            ...row,
            min_order_quantity: parseFloat(row.min_order_quantity),
            step_quantity: parseFloat(row.step_quantity),
        }));
    } catch (error) {
        serviceLogger.error("Error fetching all weight templates from DB", error as Error);
        throw new Error("Could not fetch weight templates.");
    }
}

/**
 * Получить шаблон по ID
 */
export async function getWeightTemplateById(id: string): Promise<WeightTemplate | null> {
    if (isLocal()) {
        const template = mockTemplates.find(t => t.id === id);
        return template || null;
    }
   
    serviceLogger.info("Fetching weight template by ID from DB.", { id });
    try {
        const { rows } = await query(
            'SELECT * FROM weight_templates WHERE id = $1',
            [id]
        );
        
        if (rows.length === 0) {
            return null;
        }

        const row = rows[0];
        return {
            ...row,
            min_order_quantity: parseFloat(row.min_order_quantity),
            step_quantity: parseFloat(row.step_quantity),
        };
    } catch (error) {
        serviceLogger.error("Error fetching weight template by ID from DB", error as Error, { id });
        throw new Error("Could not fetch weight template.");
    }
}

export interface CreateWeightTemplateInput {
    name: string;
    description?: string;
    unit: UnitType;
    min_order_quantity: number;
    step_quantity: number;
}

/**
 * Создать новый шаблон
 */
export async function createWeightTemplate(data: CreateWeightTemplateInput): Promise<WeightTemplate> {
    if (isLocal()) {
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
    }
   
    serviceLogger.info("Creating new weight template.", { name: data.name });
    try {
        const { rows } = await query(`
            INSERT INTO weight_templates (name, description, unit, min_order_quantity, step_quantity, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING *
        `, [data.name, data.description, data.unit, data.min_order_quantity, data.step_quantity]);
        
        const row = rows[0];
        serviceLogger.info("Weight template created successfully.", { id: row.id, name: data.name });
        
        return {
            ...row,
            min_order_quantity: parseFloat(row.min_order_quantity),
            step_quantity: parseFloat(row.step_quantity),
        };
    } catch (error) {
        serviceLogger.error("Error creating weight template", error as Error);
        throw new Error("Could not create weight template.");
    }
}

export interface UpdateWeightTemplateInput extends Partial<CreateWeightTemplateInput> {
    is_active?: boolean;
}

/**
 * Обновить существующий шаблон
 */
export async function updateWeightTemplate(id: string, data: UpdateWeightTemplateInput): Promise<WeightTemplate> {
    if (isLocal()) {
       serviceLogger.warn("Running in local mode. Simulating template update.");
        const templateIndex = mockTemplates.findIndex(t => t.id === id);
        if (templateIndex === -1) {
            throw new Error("Template not found in mock data");
        }
        mockTemplates[templateIndex] = { ...mockTemplates[templateIndex], ...data, updated_at: new Date().toISOString() };
        return mockTemplates[templateIndex];
    }
   
    serviceLogger.info("Updating weight template.", { id });
    
    const fields = [];
    const values = [];
    let paramCounter = 1;
    
    const updatableFields: (keyof UpdateWeightTemplateInput)[] = ['name', 'description', 'unit', 'min_order_quantity', 'step_quantity', 'is_active'];
    
    for (const field of updatableFields) {
        if (data[field] !== undefined) {
            fields.push(`${field} = $${paramCounter}`);
            values.push(data[field]);
            paramCounter++;
        }
    }
    
    if (fields.length === 0) {
        serviceLogger.warn("Update called with no fields to update for template", { id });
        return getWeightTemplateById(id).then(t => {
            if (!t) throw new Error("Template not found");
            return t;
        });
    }

    fields.push(`updated_at = NOW()`);
    
    values.push(id); // ID для WHERE условия
    
    try {
        const { rows } = await query(`
            UPDATE weight_templates 
            SET ${fields.join(', ')}
            WHERE id = $${paramCounter}
            RETURNING *
        `, values);
        
        if (rows.length === 0) {
            throw new Error("Weight template not found");
        }
        
        const row = rows[0];
        serviceLogger.info("Weight template updated successfully.", { id });
        
        return {
            ...row,
            min_order_quantity: parseFloat(row.min_order_quantity),
            step_quantity: parseFloat(row.step_quantity),
        };
    } catch (error) {
        serviceLogger.error("Error updating weight template", error as Error, { id });
        throw new Error("Could not update weight template.");
    }
}

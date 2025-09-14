
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
        return mockTemplates;
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
        serviceLogger.warn("Running in local mode. Cannot create weight template in mock data.");
        throw new Error("Cannot create templates in local mode");
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
        serviceLogger.warn("Running in local mode. Cannot update weight template in mock data.");
        throw new Error("Cannot update templates in local mode");
    }
   
    serviceLogger.info("Updating weight template.", { id });
    
    const fields = [];
    const values = [];
    let paramCounter = 1;
    
    if (data.name !== undefined) {
        fields.push(`name = $${paramCounter}`);
        values.push(data.name);
        paramCounter++;
    }
    
    if (data.description !== undefined) {
        fields.push(`description = $${paramCounter}`);
        values.push(data.description);
        paramCounter++;
    }
    
    if (data.unit !== undefined) {
        fields.push(`unit = $${paramCounter}`);
        values.push(data.unit);
        paramCounter++;
    }
    
    if (data.min_order_quantity !== undefined) {
        fields.push(`min_order_quantity = $${paramCounter}`);
        values.push(data.min_order_quantity);
        paramCounter++;
    }
    
    if (data.step_quantity !== undefined) {
        fields.push(`step_quantity = $${paramCounter}`);
        values.push(data.step_quantity);
        paramCounter++;
    }
    
    if (data.is_active !== undefined) {
        fields.push(`is_active = $${paramCounter}`);
        values.push(data.is_active);
        paramCounter++;
    }
    
    fields.push(`updated_at = $${paramCounter}`);
    values.push(new Date().toISOString());
    paramCounter++;
    
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

/**
 * Деактивировать шаблон (мягкое удаление)
 */
export async function deactivateWeightTemplate(id: string): Promise<void> {
    await updateWeightTemplate(id, { is_active: false });
    serviceLogger.info("Weight template deactivated.", { id });
}

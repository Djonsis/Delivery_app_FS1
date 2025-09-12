
"use server";

import { v4 as uuidv4 } from 'uuid';
import { query } from "./db";
import { serverLogger } from "./server-logger";
import { WeightTemplate, UnitType } from "./types";
import { isLocal } from "./env";

const serviceLogger = serverLogger.withCategory("WEIGHT_TEMPLATES_SERVICE");

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
    }
];

export async function getActiveWeightTemplates(): Promise<WeightTemplate[]> {
    if (isLocal()) {
        serviceLogger.warn("Running in local/studio environment. Returning mock weight templates.");
        return mockTemplates;
    }
    
    serviceLogger.info("Fetching all active weight templates from DB.");
    try {
        const { rows } = await query('SELECT * FROM weight_templates WHERE is_active = true ORDER BY name ASC');
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

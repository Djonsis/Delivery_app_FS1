// src/lib/actions/db.actions.ts
"use server";

import { getDbStatus } from "@/lib/db.service";
import { logger } from "../logger";
import { DbStatus } from "../types";
import { query } from "../db";

// Re-exporting the type to be used in client components
export type { DbStatus } from "../types";

const dbActionLogger = logger.withCategory("DB_ACTION");

export async function getDbStatusAction(): Promise<DbStatus> {
    try {
        const status = await getDbStatus();
        dbActionLogger.info("Successfully fetched DB status via service.");
        return status;
    } catch (error) {
        dbActionLogger.error("Failed to get DB status via service", error as Error);
        return {
            connected: false,
            error: (error as Error).message,
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
        };
    }
}

const TABLES_TO_CHECK = ['users', 'categories', 'products', 'orders', 'order_items', 'weight_templates'];

export async function checkTablesAction(): Promise<{ name: string, exists: boolean }[]> {
    dbActionLogger.info("Checking for table existence.");
    const results = [];
    
    // Определяем используется ли SQLite
    const useSqlite = process.env.USE_SQLITE_DEV === 'true';
    
    try {
        for (const tableName of TABLES_TO_CHECK) {
            let exists = false;

            if (useSqlite) {
                // SQLite: используем sqlite_master
                const res = await query(
                    `SELECT name FROM sqlite_master 
                     WHERE type='table' AND name = ?`,
                    [tableName]
                );
                exists = res.rows.length > 0;
            } else {
                // Postgres: используем information_schema
                const res = await query(
                    `SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = $1
                    )`,
                    [tableName]
                );
                exists = res.rows[0].exists;
            }

            results.push({ name: tableName, exists });
        }

        dbActionLogger.info("Table existence check completed.", { results });
        return results;
    } catch (error) {
        dbActionLogger.error("Failed to check tables", error as Error);
        return TABLES_TO_CHECK.map(name => ({ name, exists: false }));
    }
}

export async function initializeDbAction(): Promise<{ success: boolean, error?: string }> {
    dbActionLogger.warn("Attempting to initialize database schema.");
    
    const schemaSql = `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email TEXT UNIQUE NOT NULL,
          display_name TEXT,
          auth_provider TEXT NOT NULL DEFAULT 'firebase',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS roles (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_roles (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, role_id)
        );

        CREATE TABLE IF NOT EXISTS media (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
          bucket TEXT NOT NULL,
          object_key TEXT NOT NULL UNIQUE,
          mime_type TEXT,
          size_bytes BIGINT,
          checksum_md5 TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS categories (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL UNIQUE,
          slug TEXT NOT NULL UNIQUE,
          sku_prefix VARCHAR(10) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS weight_templates (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            unit VARCHAR(10) NOT NULL,
            min_order_quantity NUMERIC(10, 3) NOT NULL,
            step_quantity NUMERIC(10, 3) NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          sku TEXT UNIQUE,
          owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
          title TEXT NOT NULL,
          description TEXT,
          price NUMERIC(12, 2) NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'RUB',
          category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
          tags TEXT[] NULL,
          image_url TEXT NULL,
          rating REAL DEFAULT 4.5,
          reviews INT DEFAULT 0,
          brand TEXT NULL,
          manufacturer TEXT NULL,
          nutrition JSONB NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMPTZ,

          -- Поля для весовых товаров
          is_weighted BOOLEAN DEFAULT false,
          weight_category VARCHAR(10),
          unit VARCHAR(10) DEFAULT 'pcs'::character varying NOT NULL,
          price_per_unit NUMERIC(10, 2),
          price_unit VARCHAR(10),
          min_order_quantity NUMERIC(10, 3) DEFAULT 1.0,
          step_quantity NUMERIC(10, 3) DEFAULT 1.0,
          weight_template_id UUID REFERENCES weight_templates(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            customer_name TEXT NOT NULL,
            total_amount NUMERIC(12, 2) NOT NULL,
            status TEXT NOT NULL DEFAULT 'Новый заказ',
            cancellation_reason TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
            quantity NUMERIC(10, 3) NOT NULL,
            unit_price NUMERIC(12, 2) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS product_media (
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
          position INT NOT NULL DEFAULT 0,
          PRIMARY KEY (product_id, media_id)
        );
    `;

    try {
        await query(schemaSql);
        dbActionLogger.info("Database schema initialization script executed successfully.");
        return { success: true };
    } catch (error) {
        dbActionLogger.error("Failed to execute database schema initialization", error as Error);
        return { success: false, error: (error as Error).message };
    }
}
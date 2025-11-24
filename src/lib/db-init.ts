
import { serverLogger } from "./server-logger";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";

const log = serverLogger.withCategory("DB_INIT");

export function initializeSQLiteSchema(db: Database.Database): Promise<void> {
    return new Promise((resolve, reject) => {
        log.info("🔧 Checking if SQLite schema needs initialization...");

        try {
            const productsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get();

            if (productsTable) {
                log.info("✅ SQLite schema already exists — skipping initialization");
                return resolve();
            }

            log.info("🏗️ Creating SQLite schema and seeding data (first run)...");
            
            db.exec("BEGIN");

            try {
                createSchema(db);
                seedInitialData(db);
                db.exec("COMMIT");

                log.info("🎉 SQLite initialization complete!");
                resolve();

            } catch (error) {
                log.error("❌ Transaction failed, rolling back.", { error });
                db.exec("ROLLBACK");
                reject(error); 
            }

        } catch (error) {
            log.error("❌ A critical error occurred during DB initialization check.", { error });
            reject(error);
        }
    });
}

function createSchema(db: Database.Database): void {
    log.info("   - Creating tables...");
    db.exec(`
        CREATE TABLE categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            slug TEXT NOT NULL UNIQUE,
            sku_prefix TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );

        CREATE TABLE weight_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            unit TEXT NOT NULL CHECK(unit IN ('kg', 'g', 'pcs')),
            min_order_quantity REAL NOT NULL,
            step_quantity REAL NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );

        CREATE TABLE products (
            id TEXT PRIMARY KEY,
            sku TEXT UNIQUE,
            owner_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'RUB',
            category_id TEXT,
            tags TEXT,
            image_url TEXT,
            rating REAL DEFAULT 4.5,
            reviews INTEGER DEFAULT 0,
            brand TEXT,
            manufacturer TEXT,
            nutrition TEXT,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            deleted_at TEXT,
            is_weighted INTEGER DEFAULT 0,
            weight_category TEXT,
            unit TEXT NOT NULL DEFAULT 'pcs' CHECK(unit IN ('kg', 'g', 'pcs')),
            price_per_unit REAL,
            price_unit TEXT CHECK(price_unit IN ('kg', 'g', 'pcs')),
            min_order_quantity REAL DEFAULT 1.0,
            step_quantity REAL DEFAULT 1.0,
            weight_template_id TEXT,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY (weight_template_id) REFERENCES weight_templates(id) ON DELETE SET NULL
        );

        CREATE TABLE orders (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            customer_name TEXT NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'Новый заказ',
            cancellation_reason TEXT,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );

        CREATE TABLE order_items (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
        );
    `);

    log.info("   - Creating indexes...");
    db.exec(`
        CREATE INDEX idx_products_category ON products(category_id);
        CREATE INDEX idx_products_deleted ON products(deleted_at);
        CREATE INDEX idx_orders_user ON orders(user_id);
        CREATE INDEX idx_order_items_order ON order_items(order_id);
    `);

    log.info("   - Schema creation complete.");
}

function seedInitialData(db: Database.Database): void {
    log.info("   - Seeding initial data...");

    const categoryId = randomUUID();
    const templateId = randomUUID();

    db.prepare("INSERT INTO categories (id, name, slug, sku_prefix, description) VALUES (?, ?, ?, ?, ?)")
      .run(categoryId, "Овощи", "ovoschi", "VEG", "Свежие овощи и зелень");

    db.prepare("INSERT INTO weight_templates (id, name, description, unit, min_order_quantity, step_quantity, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(templateId, "Овощи (кг, шаг 0.1)", "Шаблон веса для овощей", "kg", 0.1, 0.1, 1);

    log.info("   - Seeding complete.");
}

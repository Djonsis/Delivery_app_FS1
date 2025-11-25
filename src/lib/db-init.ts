// src/lib/db-init.ts
import { serverLogger } from "./server-logger";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";

const log = serverLogger.withCategory("DB_INIT");

// Текущая версия схемы - увеличивайте вручную при изменениях DDL, требующих миграции.
const EXPECTED_SCHEMA_VERSION = 1;

/**
 * Инициализация схемы SQLite в безопасном, идемпотентном режиме.
 * Возвращает Promise<void> для совместимости с async getSqliteDb().
 */
export function initializeSQLiteSchema(db: Database.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    log.info("🔧 Checking and initializing SQLite schema (idempotent)...");

    try {
      // Начинаем транзакцию — атомарность DDL + seed
      db.exec("BEGIN");

      // 1) Создаём таблицы (IF NOT EXISTS)
      createSchema(db);

      // 2) Создаём meta-таблицу и проверяем версию схемы
      ensureMetaTable(db);

      const currentVersion = getSchemaVersion(db);
      if (currentVersion < EXPECTED_SCHEMA_VERSION) {
        // Если версия ниже, не пытаемся автоматически делать сложные миграции.
        // Выводим информативный лог и откатываем транзакцию — разработчик должен принять решение.
        db.exec("ROLLBACK");
        const msg = `SQLite schema version is outdated (current=${currentVersion}, expected=${EXPECTED_SCHEMA_VERSION}). Please run migration or reset dev DB (npm run db:reset-sqlite).`;
        log.error(msg);
        // Явно reject, чтобы вызывающий код понял, что схема несоответствует.
        return reject(new Error(msg));
      }

      // 3) Выполняем безопасные (мягкие) миграции: добавление колонок, если их нет
      applySoftMigrations(db);

      // 4) Сидим начальные данные (ON CONFLICT DO NOTHING)
      seedInitialData(db);

      // 5) Если всё ок, коммитим
      db.exec("COMMIT");
      log.info("🎉 SQLite initialization complete (idempotent).");
      resolve();
    } catch (err) {
      try {
        db.exec("ROLLBACK");
      } catch (rollbackErr) {
        log.error("Rollback failed", { rollbackErr });
      }
      log.error("❌ Failed to initialize SQLite schema", { error: err });
      reject(err);
    }
  });
}

/* -------------------------
   Schema creation helpers
   ------------------------- */

function createSchema(db: Database.Database): void {
  log.info("   - Ensuring tables exist (CREATE TABLE IF NOT EXISTS) ...");

  // Создаём таблицы по частям — меньше шансов получить частичный результат.
  // Используем DEFAULT с ISO-подходом strftime(..., 'now') чтобы получать UTC-like ISO timestamps.
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      sku_prefix TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\',\'now\')),
      updated_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\',\'now\'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS weight_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      unit TEXT NOT NULL CHECK(unit IN (\'kg\',\'g\',\'pcs\')),
      min_order_quantity REAL NOT NULL,
      step_quantity REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\',\'now\')),
      updated_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\',\'now\'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE,
      owner_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT \'RUB\',
      category_id TEXT,
      tags TEXT,
      image_url TEXT,
      rating REAL DEFAULT 4.5,
      reviews INTEGER DEFAULT 0,
      brand TEXT,
      manufacturer TEXT,
      nutrition TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\',\'now\')),
      updated_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\',\'now\')),
      deleted_at TEXT,
      is_weighted INTEGER DEFAULT 0,
      weight_category TEXT,
      unit TEXT NOT NULL DEFAULT \'pcs\' CHECK(unit IN (\'kg\',\'g\',\'pcs\')),
      price_per_unit REAL,
      price_unit TEXT CHECK(price_unit IN (\'kg\',\'g\',\'pcs\')),
      min_order_quantity REAL DEFAULT 1.0,
      step_quantity REAL DEFAULT 1.0,
      weight_template_id TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (weight_template_id) REFERENCES weight_templates(id) ON DELETE SET NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      customer_name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT \'Новый заказ\',
      cancellation_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\',\'now\')),
      updated_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\',\'now\'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
  `);

  log.info("   - Ensuring indexes...");
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  `);

  log.info("   - Table creation checks done.");
}

/* -------------------------
   Meta / version helpers
   ------------------------- */

function ensureMetaTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Если нет записи schema_version — создаём её с нулём (0)
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get();
  if (!row) {
    db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)`).run(String(EXPECTED_SCHEMA_VERSION));
    log.info(`   - meta.schema_version not found; setting to expected=${EXPECTED_SCHEMA_VERSION}`);
  }
}

function getSchemaVersion(db: Database.Database): number {
  try {
    const row = db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get();
    if (row && row.value) {
      const n = parseInt(String(row.value), 10);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  } catch (err) {
    log.warn("   - Cannot read schema_version from meta", { err });
    return 0;
  }
}

/* -------------------------
   Soft migrations (non-destructive)
   - добавляем колонки, если их нет (safe ALTER TABLE ADD COLUMN)
   ------------------------- */

function columnExists(db: Database.Database, table: string, column: string): boolean {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    return cols.some((c: any) => String(c.name) === column);
  } catch {
    return false;
  }
}

function addColumnIfNotExists(db: Database.Database, table: string, columnSql: string): void {
  // columnSql — часть вида "col_name TYPE DEFAULT ...", пример: "deleted_at TEXT"
  const colName = columnSql.trim().split(/\s+/)[0];
  if (!columnExists(db, table, colName)) {
    const sql = `ALTER TABLE ${table} ADD COLUMN ${columnSql};`;
    log.info(`   - Adding missing column ${table}.${colName}`);
    db.exec(sql);
  }
}

function applySoftMigrations(db: Database.Database): void {
  log.info("   - Applying soft (non-destructive) migrations if necessary...");

  // Примеры колонок, которые могли отсутствовать в старой базе — добавляем безопасно.
  // Пополняйте этот список по мере необходимости, при изменениях схемы.
  addColumnIfNotExists(db, "products", "tags TEXT");
  addColumnIfNotExists(db, "products", "image_url TEXT");
  addColumnIfNotExists(db, "products", "deleted_at TEXT");
  addColumnIfNotExists(db, "products", "weight_template_id TEXT");
  addColumnIfNotExists(db, "categories", "sku_prefix TEXT");
  addColumnIfNotExists(db, "weight_templates", "is_active INTEGER DEFAULT 1");

  log.info("   - Soft migrations complete.");
}

/* -------------------------
   Seeding (idempotent)
   ------------------------- */

function seedInitialData(db: Database.Database): void {
  log.info("   - Seeding initial data (idempotent checks)...");

  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, slug, sku_prefix, description)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO NOTHING
  `);

  const insertWeightTemplate = db.prepare(`
    INSERT INTO weight_templates (id, name, description, unit, min_order_quantity, step_quantity, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO NOTHING
  `);

  // Вставляем только если нет
  const catId = randomUUID();
  const resCat = insertCategory.run(catId, "Овощи", "ovoschi", "VEG", "Свежие овощи и зелень");
  if (resCat.changes > 0) log.info("     - Seeded category 'Овощи'");

  const tempId = randomUUID();
  const resTemp = insertWeightTemplate.run(tempId, "Овощи (кг, шаг 0.1)", "Шаблон веса для овощей", "kg", 0.1, 0.1, 1);
  if (resTemp.changes > 0) log.info("     - Seeded weight_template 'Овощи (кг, шаг 0.1)'");

  log.info("   - Seeding finished.");
}

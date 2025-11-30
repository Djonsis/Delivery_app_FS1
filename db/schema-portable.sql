-- db/schema-portable.sql
-- Portable schema for SQLite (Dev) and PostgreSQL (Prod)
-- Version: 1

-- ============================================================================
-- 0. Config & Meta (Инфраструктура)
-- ============================================================================

-- Включаем Foreign Keys для SQLite (критично для целостности данных)
PRAGMA foreign_keys = ON;

-- Таблица метаданных для версионирования схемы
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Фиксируем версию схемы (для будущих миграций)
INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '1');

-- ============================================================================
-- 1. Auth & Users (Пользователи и Роли)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- UUID
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'firebase',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ============================================================================
-- 2. Media (Файловое хранилище)
-- ============================================================================

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,  -- UUID
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  size_bytes INTEGER,
  checksum_md5 TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  deleted_at TEXT
);

-- ============================================================================
-- 3. Catalog (Товары и Категории)
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,  -- UUID
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sku_prefix TEXT NOT NULL UNIQUE CHECK(length(sku_prefix) <= 10),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS weight_templates (
  id TEXT PRIMARY KEY,  -- UUID
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  unit TEXT NOT NULL CHECK(length(unit) <= 10),
  min_order_quantity REAL NOT NULL,
  step_quantity REAL NOT NULL,
  is_active INTEGER DEFAULT 1,  -- 1=true, 0=false
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,  -- UUID
  sku TEXT UNIQUE,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RUB',
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  
  tags TEXT,      -- JSON Array as String
  image_url TEXT,
  nutrition TEXT, -- JSON Object as String
  
  rating REAL DEFAULT 4.5,
  reviews INTEGER DEFAULT 0,
  brand TEXT,
  manufacturer TEXT,
  
  -- Весовые параметры
  is_weighted INTEGER DEFAULT 0, -- 1=true, 0=false
  weight_category TEXT CHECK(length(weight_category) <= 10),
  unit TEXT NOT NULL DEFAULT 'pcs' CHECK(length(unit) <= 10),
  price_per_unit REAL,
  price_unit TEXT CHECK(length(price_unit) <= 10),
  min_order_quantity REAL DEFAULT 1.0,
  step_quantity REAL DEFAULT 1.0,
  weight_template_id TEXT REFERENCES weight_templates(id) ON DELETE SET NULL,
  
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS product_media (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);

-- ============================================================================
-- 4. Orders (Заказы)
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,  -- UUID
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Новый заказ',
    cancellation_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,  -- UUID
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL
);

-- ============================================================================
-- 5. Indexes (Производительность)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
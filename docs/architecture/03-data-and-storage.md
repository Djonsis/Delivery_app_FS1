# 🗄️ Данные и Хранилище

Этот документ содержит исчерпывающую информацию о схеме базы данных PostgreSQL и настройке объектного хранилища Google Cloud Storage.

---

## 1. Решение по архитектуре данных

В начале проекта был проведен анализ двух вариантов развития архитектуры хранения данных:

1.  **Поэтапная миграция:** Использовать `Firestore` на старте, с последующей миграцией на `Cloud SQL`.
2.  **Прямая реализация:** Сразу внедрить связку `PostgreSQL + Google Cloud Storage`.

**Принятое решение:** Был выбран **второй вариант**. Это более зрелый и дальновидный подход, который позволяет избежать двойной работы и сразу закладывает масштабируемый фундамент, необходимый для e-commerce (сложные запросы, аналитика, реляционные данные).

---

## 2. Настройка базы данных Google Cloud SQL for PostgreSQL

### Шаг 1: Создание инстанса и базы данных

1.  В консоли Google Cloud Platform перейдите в раздел **Cloud SQL**.
2.  Создайте новый инстанс, выбрав **PostgreSQL** (версия 12+).
3.  Внутри инстанса создайте новую базу данных. Рекомендуемое имя: `appdb`.
4.  Создайте пользователя с правами на эту базу данных.

### Шаг 2: Применение схемы

Подключитесь к созданной базе данных с помощью Cloud Shell или любого другого SQL-клиента и выполните следующий скрипт. Этот скрипт создаст все необходимые таблицы и расширения.

```sql
-- Включаем расширение для генерации UUID, если его еще нет
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'firebase',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица ролей
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL -- например, 'admin', 'editor'
);

-- Связующая таблица для пользователей и ролей
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Таблица для хранения метаданных о медиафайлах в Cloud Storage
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

-- Таблица категорий
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sku_prefix VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица шаблонов весовых товаров
CREATE TABLE IF NOT EXISTS weight_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- "Овощи (кг, 0.5-0.1)", "Специи (г, 10-10)"
  description TEXT,
  unit VARCHAR(10) NOT NULL, -- "kg", "g", "pcs"
  min_order_quantity NUMERIC(10, 3) NOT NULL,
  step_quantity NUMERIC(10, 3) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Основная таблица товаров
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

-- Таблица заказов
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

-- Таблица позиций в заказе
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 3) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL
);


-- Связующая таблица для товаров и медиафайлов (для галереи)
CREATE TABLE IF NOT EXISTS product_media (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);
```

---

## 3. Локальная среда разработки (SQLite)

**Статус:** ✅ **Актуально**

Для локальной разработки и E2E-тестирования используется файловая база данных **SQLite** (`dev.sqlite`), которая полностью эмулирует рабочую среду PostgreSQL. Ранее использовавшийся подход с mock-данными был признан устаревшим.

### Автоматическая и безопасная инициализация

При каждом запуске dev-сервера (`npm run dev:sqlite`) автоматически выполняется скрипт инициализации `src/lib/db-init.ts`, который работает по **идемпотентному** принципу — он **никогда не удаляет существующие данные**.

**Ключевые особенности:**
- **Создание схемы:** Таблицы и индексы создаются только в том случае, если они отсутствуют (`CREATE TABLE IF NOT EXISTS`).
- **Наполнение данными (сидинг):** Начальные данные (категории, шаблоны) добавляются, только если их еще нет (`INSERT ... ON CONFLICT DO NOTHING`).
- **Сохранность данных:** Все созданные вами записи (товары, заказы) полностью сохраняются между перезапусками сервера.
- **Версионирование:** Скрипт отслеживает версию схемы, предотвращая запуск на устаревшей структуре БД.

### Полезные команды

Для управления локальной базой данных в `package.json` предусмотрены следующие скрипты:
- `npm run db:reset-sqlite`: **Полностью удаляет** и очищает локальную базу данных. Полезна, если нужно начать с чистого листа.
- `npm run db:cli-sqlite`: Открывает интерактивную консоль SQLite для выполнения прямых SQL-запросов к `dev.sqlite`. Удобно для отладки.

> Подробное пошаговое руководство по настройке и использованию локальной среды находится в документе **`docs/recipes/sqlite-dev.md`**.

# Инструкция по настройке PostgreSQL и S3

> **Версия:** 1.0.0
> **Дата:** 2024-08-26

Этот документ содержит пошаговые инструкции для настройки базы данных **Google Cloud SQL for PostgreSQL** и объектного хранилища **Google Cloud Storage (GCS)**, необходимых для запуска этого проекта. Выбор продуктов Google Cloud обусловлен текущей интеграцией проекта с экосистемой Firebase.

---

## 1. Настройка базы данных Google Cloud SQL for PostgreSQL

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

-- Таблица пользователей (для будущего использования)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'firebase',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица ролей (для будущего использования)
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

-- Основная таблица товаров
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RUB',
  category TEXT NULL,
  tags TEXT[] NULL, -- Поле для SEO-тегов
  image_url TEXT NULL, -- Поле для основной картинки товара
  rating REAL DEFAULT 4.5,
  reviews INT DEFAULT 0,
  weight TEXT NULL,
  brand TEXT NULL,
  manufacturer TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
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
    unit_price NUMERIC(12, 2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);


-- Связующая таблица для товаров и медиафайлов (для галереи)
CREATE TABLE IF NOT EXISTS product_media (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);
```

### Шаг 3: Настройка переменных окружения

В вашем файле `.env` укажите данные для подключения к базе данных.

```env
# Переменные для подключения к Google Cloud SQL
PG_HOST="<INSTANCE_CONNECTION_NAME>" # Например, my-project:us-central1:my-instance
PG_PORT="5432"
PG_USER="<USER>"
PG_PASSWORD="<PASSWORD>"
PG_DATABASE="<DB_NAME>"
```

---

## 2. Настройка Google Cloud Storage (GCS)

### Шаг 1: Создание бакета

1.  В консоли Google Cloud Platform перейдите в раздел **Cloud Storage**.
2.  Создайте новый бакет.
3.  **Важно:** Сделайте бакет публично доступным для чтения. Это делается путем назначения роли `Storage Object Viewer` для участника `allUsers` на вкладке "Разрешения".

### Шаг 2: Настройка CORS

Для того чтобы браузер мог напрямую загружать файлы в бакет, необходимо настроить CORS (Cross-Origin Resource Sharing).

Примените следующую JSON-конфигурацию к вашему бакету (это можно сделать через gcloud CLI):
```json
[
  {
    "origin": [
      "http://localhost:9003",
      "https://your-production-domain.com"
    ],
    "method": [
      "PUT",
      "GET",
      "HEAD"
    ],
    "responseHeader": [
      "Content-Type",
      "ETag"
    ],
    "maxAgeSeconds": 3600
  }
]
```
**Примечание:** Не забудьте заменить домен разработки и `https://your-production-domain.com` на ваш реальный домен.

### Шаг 3: Настройка переменных окружения

В вашем файле `.env` укажите данные для доступа к GCS. Для аутентификации на сервере рекомендуется использовать сервисный аккаунт, настроенный для вашей среды выполнения (например, в Firebase App Hosting).

```env
# Имя вашего бакета в Google Cloud Storage
S3_BUCKET_NAME="<YOUR_BUCKET_NAME>"

# Публичный URL для доступа к файлам в бакете (например https://storage.googleapis.com/your-bucket-name)
NEXT_PUBLIC_S3_PUBLIC_URL="<YOUR_BUCKET_PUBLIC_URL>"

# Для S3-совместимого API эндпоинт Google Cloud Storage
S3_ENDPOINT_URL="https://storage.googleapis.com"
S3_REGION="auto"

# Ключи доступа (рекомендуется для локальной разработки, в проде использовать сервисный аккаунт)
S3_ACCESS_KEY_ID="<YOUR_ACCESS_KEY>"
S3_SECRET_ACCESS_KEY="<YOUR_SECRET_KEY>"
```

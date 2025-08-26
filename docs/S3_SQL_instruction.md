# Инструкция по настройке PostgreSQL и S3

> **Версия:** 1.0.0
> **Дата:** 2024-08-26

Этот документ содержит пошаговые инструкции для настройки базы данных PostgreSQL и S3-совместимого объектного хранилища, необходимых для запуска этого проекта.

---

## 1. Настройка базы данных PostgreSQL

### Шаг 1: Создание базы данных

1.  Убедитесь, что у вас есть доступ к инстансу PostgreSQL (версия 12+).
2.  Создайте новую базу данных. Рекомендуемое имя: `appdb`.
3.  Создайте пользователя с правами на эту базу данных.

### Шаг 2: Применение схемы

Выполните следующий SQL-скрипт в вашей новой базе данных. Этот скрипт создаст все необходимые таблицы и расширения.

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

-- Таблица для хранения метаданных о медиафайлах в S3
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
  currency TEXT NOT NULL DEFAULT 'USD',
  tags TEXT[] NULL, -- Поле для SEO-тегов
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Связующая таблица для товаров и медиафайлов
CREATE TABLE IF NOT EXISTS product_media (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);
```

### Шаг 3: Настройка переменных окружения

В вашем файле `.env` укажите данные для подключения к базе данных.

**Для Payload CMS (используется в `apps/cms`):**
```env
DATABASE_URI="postgres://<USER>:<PASSWORD>@<HOST>:<PORT>/<DB_NAME>"
```

**Для прямого подключения из Next.js (используется в `apps/web`):**
```env
PG_HOST="<HOST>"
PG_PORT="<PORT>"
PG_USER="<USER>"
PG_PASSWORD="<PASSWORD>"
PG_DATABASE="<DB_NAME>"
```

---

## 2. Настройка S3-совместимого хранилища

### Шаг 1: Создание бакета

1.  Создайте новый бакет в вашем S3-провайдере (например, Google Cloud Storage, AWS S3, Yandex Object Storage).
2.  **Важно:** Сделайте бакет публично доступным для чтения. Это необходимо, чтобы изображения товаров отображались на витрине.
    *   В Google Cloud Storage это делается путем назначения роли `Storage Object Viewer` для `allUsers`.

### Шаг 2: Настройка CORS

Для того чтобы браузер мог напрямую загружать файлы в бакет, необходимо настроить CORS (Cross-Origin Resource Sharing).

Примените следующую JSON-конфигурацию к вашему бакету:
```json
[
  {
    "AllowedOrigins": [
      "http://localhost:9002",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "PUT",
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```
**Примечание:** Не забудьте заменить `https://your-production-domain.com` на ваш реальный домен.

### Шаг 3: Настройка переменных окружения

В вашем файле `.env` укажите данные для доступа к S3-хранилищу:
```env
S3_ENDPOINT_URL="<ENDPOINT_URL>" # например, https://storage.googleapis.com
S3_BUCKET_NAME="<YOUR_BUCKET_NAME>"
S3_REGION="auto" # или ваш регион, например, us-east-1
S3_ACCESS_KEY_ID="<YOUR_ACCESS_KEY>"
S3_SECRET_ACCESS_KEY="<YOUR_SECRET_KEY>"
```

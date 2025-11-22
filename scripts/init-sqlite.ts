import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const SQLITE_FILE = path.resolve(__dirname, '..', 'dev.sqlite');
const SCHEMA_FILE = path.resolve(__dirname, '..', 'db', 'schema-portable.sql');

console.log('\n🗄️  SQLite Database Initialization');
console.log('=====================================\n');

// Проверка существования файла схемы
if (!fs.existsSync(SCHEMA_FILE)) {
    console.error(`❌ ОШИБКА: Файл схемы не найден!`);
    console.error(`   Ожидается: ${SCHEMA_FILE}`);
    console.error(`\n📝 Создайте файл db/schema-portable.sql согласно документации.`);
    process.exit(1);
}

// Удаление старой БД если существует
if (fs.existsSync(SQLITE_FILE)) {
    console.log(`🗑️  Удаление существующей БД: ${SQLITE_FILE}`);
    fs.unlinkSync(SQLITE_FILE);
}

// Создание новой БД
console.log(`📦 Создание новой БД: ${SQLITE_FILE}`);
const db = new Database(SQLITE_FILE);

// Включение оптимизаций
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

console.log('✅ Настройки SQLite применены (WAL mode, foreign keys)');

// Чтение и применение схемы
console.log(`\n📋 Применение схемы из: ${SCHEMA_FILE}`);
const schema = fs.readFileSync(SCHEMA_FILE, 'utf-8');

try {
    db.exec(schema);
    console.log('✅ Схема успешно применена');
} catch (error) {
    console.error('❌ Ошибка при применении схемы:', error);
    db.close();
    process.exit(1);
}

// Опционально: Добавление начальных данных (seed)
console.log('\n🌱 Добавление тестовых данных...');

try {
    const seedTimestamp = new Date().toISOString();

    // Seed: Категории
    const categoryId = randomUUID();
    db.prepare(`
        INSERT INTO categories (id, name, slug, sku_prefix, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(categoryId, 'Овощи', 'vegetables', 'VEG', 'Свежие овощи', seedTimestamp, seedTimestamp);

    console.log('   ✓ Категория "Овощи" создана');

    // Seed: Тестовый продукт
    const productId = randomUUID();
    db.prepare(`
        INSERT INTO products (
            id, sku, title, description, price, category_id, 
            unit, rating, reviews, brand, manufacturer, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        productId,
        'VEG001',
        'Помидоры',
        'Свежие красные помидоры',
        150.00,
        categoryId,
        'kg',
        4.5,
        42,
        'Местный фермер',
        'Казахстан',
        seedTimestamp,
        seedTimestamp
    );

    console.log('   ✓ Тестовый продукт "Помидоры" создан');

    // Seed: Weight template
    const templateId = randomUUID();
    db.prepare(`
        INSERT INTO weight_templates (
            id, name, description, unit, min_order_quantity, step_quantity, is_active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        templateId,
        'Овощи (кг, 0.5-0.1)',
        'Шаблон для весовых овощей',
        'kg',
        0.5,
        0.1,
        1,
        seedTimestamp,
        seedTimestamp
    );

    console.log('   ✓ Шаблон весовых товаров создан');

    console.log('✅ Тестовые данные добавлены');

} catch (error) {
    console.error('⚠️  Предупреждение: Ошибка при добавлении тестовых данных:', error);
    console.log('   (БД создана, но без начальных данных)');
}

// Закрытие соединения
db.close();

console.log('\n=====================================');
console.log('✅ Инициализация завершена успешно!');
console.log('=====================================');
console.log('\n📝 Следующие шаги:');
console.log('   1. Запустите: npm run dev:sqlite');
console.log('   2. Проверьте UI и CRUD операции');
console.log('   3. При необходимости: npm run db:reset-sqlite\n');

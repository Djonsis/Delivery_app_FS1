
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения из файла .env в корне проекта
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('--- Тест подключения к базе данных ---');
console.log('Попытка подключения со следующей конфигурацией:');
console.log(`Хост (PG_HOST): ${process.env.PG_HOST}`);
console.log(`Порт (PG_PORT): ${process.env.PG_PORT}`);
console.log(`Пользователь (PG_USER): ${process.env.PG_USER}`);
console.log(`База данных (PG_DATABASE): ${process.env.PG_DATABASE}`);
console.log('Пароль (PG_PASSWORD): [СКРЫТО]');
console.log('---------------------------------');

const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    // Короткий таймаут для быстрого ответа
    connectionTimeoutMillis: 5000,
    // Важно для Cloud SQL: отключаем SSL для прямого подключения по IP,
    // так как обычно для этого используется Cloud SQL Auth Proxy.
    // Для локального теста это наиболее частый сценарий.
    ssl: false,
});

async function testConnection() {
    let client;
    try {
        console.log('\nПодключение к базе данных...');
        client = await pool.connect();
        console.log('✅ УСПЕХ! Соединение с базой данных установлено.');
        
        console.log('\nПроверка выполнения простого запроса...');
        const timeResult = await client.query('SELECT NOW()');
        console.log('Текущее время на сервере базы данных:', timeResult.rows[0].now);
        console.log('✅ УСПЕХ! Запрос выполнен.');

    } catch (error) {
        console.error('\n❌ ОШИБКА! Не удалось подключиться к базе данных.');
        if (error instanceof Error) {
            console.error('Детали ошибки:', error.message);
            console.error('Код ошибки:', (error as any).code);
        } else {
            console.error('Произошла неизвестная ошибка:', error);
        }
    } finally {
        if (client) {
            client.release();
            console.log('\nСоединение с клиентом закрыто.');
        }
        await pool.end();
        console.log('Пул соединений закрыт.');
    }
}

testConnection();

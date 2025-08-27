
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения из файла .env в корне проекта
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('--- Тест подключения к S3/GCS ---');
console.log('Попытка подключения со следующей конфигурацией:');
console.log(`Имя бакета (S3_BUCKET_NAME): ${process.env.S3_BUCKET_NAME}`);
console.log(`Эндпоинт (S3_ENDPOINT_URL): ${process.env.S3_ENDPOINT_URL}`);
console.log(`Регион (S3_REGION): ${process.env.S3_REGION}`);
console.log(`Ключ доступа (S3_ACCESS_KEY_ID): ${process.env.S3_ACCESS_KEY_ID ? `***${process.env.S3_ACCESS_KEY_ID.slice(-4)}` : 'Не задан'}`);
console.log('Секретный ключ (S3_SECRET_ACCESS_KEY): [СКРЫТО]');
console.log('---------------------------------');

async function testS3Connection() {
    const { S3_BUCKET_NAME, S3_ENDPOINT_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;

    if (!S3_BUCKET_NAME || !S3_ENDPOINT_URL || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
        console.error('\n❌ ОШИБКА! Одна или несколько переменных окружения для S3 не установлены.');
        console.error('Проверьте S3_BUCKET_NAME, S3_ENDPOINT_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY в вашем .env файле.');
        return;
    }

    try {
        console.log('\nПодключение к хранилищу...');
        const s3Client = new S3Client({
            endpoint: S3_ENDPOINT_URL,
            region: S3_REGION,
            credentials: {
                accessKeyId: S3_ACCESS_KEY_ID,
                secretAccessKey: S3_SECRET_ACCESS_KEY,
            },
            forcePathStyle: true, // Важно для совместимости с GCS
        });

        console.log(`Проверка доступа к бакету "${S3_BUCKET_NAME}"...`);
        const command = new HeadBucketCommand({ Bucket: S3_BUCKET_NAME });
        await s3Client.send(command);

        console.log('\n✅ УСПЕХ! Соединение с хранилищем установлено и бакет доступен.');

    } catch (error) {
        console.error('\n❌ ОШИБКА! Не удалось подключиться к хранилищу или получить доступ к бакету.');
        if (error instanceof Error) {
            console.error('Детали ошибки:', error.message);
            console.error('Код ошибки:', (error as any).code || 'N/A');
            console.error('Тип ошибки:', error.name);
        } else {
            console.error('Произошла неизвестная ошибка:', error);
        }
    }
}

testS3Connection();

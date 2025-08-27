
"use server";

import * as dotenv from 'dotenv';
import { serverLogger } from './server-logger';

// Загружаем переменные окружения из файла .env в корне проекта
// Это нужно сделать один раз в центральном месте
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '.env' });
}

const configLogger = serverLogger.withCategory('CONFIG');

function getEnvVar(key: string, required: boolean = true): string {
    const value = process.env[key];
    if (!value && required) {
        const errorMessage = `Missing required environment variable: ${key}`;
        configLogger.error(errorMessage, new Error(errorMessage));
        throw new Error(errorMessage);
    }
    return value || '';
}

export const appConfig = {
    db: {
        host: getEnvVar('PG_HOST'),
        port: parseInt(getEnvVar('PG_PORT', false) || '5432', 10),
        user: getEnvVar('PG_USER'),
        password: getEnvVar('PG_PASSWORD'),
        database: getEnvVar('PG_DATABASE'),
    },
    s3: {
        bucketName: getEnvVar('S3_BUCKET_NAME'),
        publicUrl: getEnvVar('NEXT_PUBLIC_S3_PUBLIC_URL'),
        endpoint: getEnvVar('S3_ENDPOINT_URL'),
        region: getEnvVar('S3_REGION'),
        accessKeyId: getEnvVar('S3_ACCESS_KEY_ID'),
        secretAccessKey: getEnvVar('S3_SECRET_ACCESS_KEY'),
    },
};

configLogger.info('Application configuration loaded successfully.');


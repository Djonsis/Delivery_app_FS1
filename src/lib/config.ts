// Ensure this module is server-only
import 'dotenv/config'
import { serverLogger } from './server-logger';

const configLogger = serverLogger.withCategory('CONFIG');

function getEnvVar(key: string, required: boolean = true): string {
    const value = process.env[key];
    if (!value && required) {
        const errorMessage = `Missing required environment variable: ${key}`;
        configLogger.error(errorMessage, new Error(errorMessage));
        // This will only throw on the server, preventing build failures.
        if (typeof window === 'undefined') {
            throw new Error(errorMessage);
        }
    }
    return value || '';
}

export const serverConfig = {
    db: {
        host: getEnvVar('PG_HOST'),
        port: parseInt(getEnvVar('PG_PORT', false) || '5432', 10),
        user: getEnvVar('PG_USER'),
        password: getEnvVar('PG_PASSWORD'),
        database: getEnvVar('PG_DATABASE'),
    },
    s3: {
        bucketName: getEnvVar('S3_BUCKET_NAME'),
        endpoint: getEnvVar('S3_ENDPOINT_URL'),
        region: getEnvVar('S3_REGION'),
        accessKeyId: getEnvVar('S3_ACCESS_KEY_ID'),
        secretAccessKey: getEnvVar('S3_SECRET_ACCESS_KEY'),
    },
};

configLogger.info('Server configuration loaded.');

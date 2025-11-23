
/**
 * Централизованная конфигурация приложения.
 * 
 * Принципы:
 * - Единственный источник истины для всех env переменных
 * - Приватная функция getEnvVar (не экспортируется)
 * - Умные fallback значения для dev/test окружений
 * - Строгая валидация в production
 */

/**
 * Приватная функция для чтения переменных окружения.
 * НЕ экспортируется - используется только внутри этого модуля.
 */
function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  
  if (value === undefined) {
    if (fallback !== undefined) {
      if (process.env.NODE_ENV !== 'test') {
        // Не логируем в тестах, чтобы не замусоривать вывод
      }
      return fallback;
    }
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    
    return '';
  }
  
  return value;
}

// ========== ПУБЛИЧНЫЕ ЭКСПОРТЫ ==========

/**
 * Определяет, запущено ли приложение в Google Cloud.
 * Проверяет наличие переменной K_SERVICE (Cloud Run/App Hosting).
 */
export function isCloud(): boolean {
  return !!process.env.K_SERVICE;
}

/**
 * Получает ID проекта Google Cloud.
 */
export function getProjectId(): string {
  return getEnvVar('GCLOUD_PROJECT', 'local-project');
}

/**
 * Получает уровень логирования.
 */
export function getLogLevel(): string {
  return getEnvVar('LOG_LEVEL', 'info');
}

/**
 * Получает текущее окружение.
 */
export function getNodeEnv(): string {
  return getEnvVar('NODE_ENV', 'development');
}

/**
 * Конфигурация PostgreSQL базы данных.
 */
export const dbConfig = {
  host: getEnvVar('PG_HOST'),
  port: parseInt(getEnvVar('PG_PORT', '5432'), 10),
  user: getEnvVar('PG_USER'),
  password: getEnvVar('PG_PASSWORD'),
  database: getEnvVar('PG_DATABASE'),
  // Используется для соединений через сокет в Cloud
  connectionName: getEnvVar('CLOUD_SQL_CONNECTION_NAME'),
} as const;

/**
 * Конфигурация S3 хранилища.
 */
export const s3Config = {
  bucketName: getEnvVar('S3_BUCKET_NAME'),
  endpoint: getEnvVar('S3_ENDPOINT_URL'),
  region: getEnvVar('S3_REGION'),
  accessKeyId: getEnvVar('S3_ACCESS_KEY_ID'),
  secretAccessKey: getEnvVar('S3_SECRET_ACCESS_KEY'),
} as const;

/**
 * Конфигурация путей логирования.
 */
export const loggingConfig = {
  logDir: 'logs',
  logFile: 'debug.log',
} as const;

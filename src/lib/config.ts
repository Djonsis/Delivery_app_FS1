
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
 * 
 * @param key - Имя переменной окружения
 * @param fallback - Значение по умолчанию (делает переменную опциональной)
 * @returns Значение переменной или fallback
 * @throws Error в production если обязательная переменная не задана
 */
function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  
  if (!value) {
    if (fallback !== undefined) {
      // Не спамить в тестах
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`⚠️ Using fallback for ${key}=${fallback}`);
      }
      return fallback;
    }
    
    // Строгая проверка в production
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    
    // Не спамить в тестах
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`⚠️ Missing env var: ${key}, using empty string`);
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
 * В dev/test окружении возвращает 'local-project'.
 */
export function getProjectId(): string {
  return getEnvVar('GCLOUD_PROJECT', 'local-project');
}

/**
 * Получает уровень логирования.
 * По умолчанию 'info'.
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

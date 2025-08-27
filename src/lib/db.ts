
import { Pool } from 'pg';
import { serverLogger } from './server-logger';
import path from 'path';

const dbLogger = serverLogger.withCategory("DATABASE");

// --- Улучшенная логика подключения к Google Cloud SQL ---

const pgHost = process.env.PG_HOST || '';
// Имя инстанса Cloud SQL обычно содержит два двоеточия (project:region:instance)
const isCloudSql = pgHost.split(':').length === 3;

dbLogger.info(`DB Connection check: Is Cloud SQL? ${isCloudSql}`, { pgHost });

// Конфигурация подключения
const config = {
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  // Рекомендуемые настройки для продакшена
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Если это Cloud SQL, используем специальный путь к сокету.
  // App Hosting и другие среды Google Cloud автоматически создают этот сокет.
  // В противном случае, используем стандартное подключение по хосту/порту.
  host: isCloudSql ? path.join('/cloudsql', pgHost) : pgHost,
  port: isCloudSql ? undefined : (process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432),
};

// Этот пул соединений безопасен для использования во всем приложении.
const pool = new Pool(config);

pool.on('connect', (client) => {
    dbLogger.info('Новый клиент успешно подключился к базе данных.', { isCloudSql });
});

pool.on('error', (err, client) => {
    dbLogger.error('Неожиданная ошибка в пуле соединений', err);
    process.exit(-1);
});

export const query = (text: string, params?: any[]) => {
    const start = Date.now();
    dbLogger.debug('Выполнение запроса', { text, params });
    const res = pool.query(text, params);
    const duration = Date.now() - start;
    dbLogger.debug(`Запрос выполнен за ${duration}ms`);
    return res;
};

export const getClient = () => {
    dbLogger.info('Получение клиента из пула');
    return pool.connect();
};

export default pool;

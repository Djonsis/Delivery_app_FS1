
import { Pool } from 'pg';
import { serverLogger } from './server-logger';

const dbLogger = serverLogger.withCategory("DATABASE");

// This creates a connection pool. It's safe to use this single instance
// across your application. The pool will manage multiple connections.
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  // Recommended settings for production environment
  max: 20, // max number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection to be established
});

pool.on('connect', (client) => {
    dbLogger.info('New client connected to the database');
});

pool.on('error', (err, client) => {
    dbLogger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export const query = (text: string, params?: any[]) => {
    const start = Date.now();
    dbLogger.debug('Executing query', { text, params });
    const res = pool.query(text, params);
    const duration = Date.now() - start;
    dbLogger.debug(`Executed query in ${duration}ms`);
    return res;
};

export const getClient = () => {
    dbLogger.info('Acquiring client from pool');
    return pool.connect();
};

export default pool;

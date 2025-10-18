import 'server-only';
import { Pool } from 'pg';
import { logger } from './logger';
import { dbConfig, isCloud as isGoogleCloud } from './config';

const dbLogger = logger("DATABASE");

const { user, password, database } = dbConfig;

// Check if running in a Google Cloud environment (like App Hosting or Cloud Run)
dbLogger.info(`DB Connection check: Is Google Cloud? ${isGoogleCloud()}`);


// This configuration is robust for both local development and App Hosting.
const poolConfig = {
    user,
    password,
    database,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // If it's a Cloud SQL instance running in a Google Cloud environment, connect via the Unix socket.
    // Otherwise, use the standard host/port for local connections (e.g., via Cloud SQL Proxy).
    host: isGoogleCloud() 
        ? `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}` 
        : dbConfig.host,
    port: isGoogleCloud() ? undefined : dbConfig.port,
};

dbLogger.info('Initializing connection pool with config:', {
    user: poolConfig.user,
    database: poolConfig.database,
    host: poolConfig.host,
    port: poolConfig.port || 'default (socket)',
    isGoogleCloud: isGoogleCloud(),
});


let pool: Pool;

try {
    pool = new Pool(poolConfig);

    pool.on('connect', (_client) => {
        dbLogger.info('A client has successfully connected to the database.');
    });

    pool.on('error', (err, _client) => {
        dbLogger.error('Unexpected error on idle client in the pool', err);
    });

} catch (error) {
    dbLogger.error('Failed to initialize connection pool', error as Error);
    // If the pool fails to initialize, we need to throw to prevent the app from starting in a broken state.
    throw new Error('Database pool could not be initialized.');
}


export const query = async (text: string, params?: unknown[]) => {
    const start = Date.now();
    let client;
    try {
        client = await pool.connect();
        dbLogger.debug('Executing query', { text });
        const res = await client.query(text, params);
        const duration = Date.now() - start;
        dbLogger.debug(`Query executed successfully in ${duration}ms`);
        return res;
    } catch (error) {
        dbLogger.error('Error executing query', error as Error);
        throw error; // Re-throw the error to be handled by the caller
    } finally {
        if (client) {
            client.release(); // Ensure the client is always released back to the pool
        }
    }
};

export async function getClient() {
    dbLogger.info('Acquiring a client from the pool.');
    return pool.connect();
};

export function getPoolStatus() {
    if (!pool) {
        return {
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
        }
    }
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
    }
}

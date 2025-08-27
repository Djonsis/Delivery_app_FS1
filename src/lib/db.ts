
import { Pool } from 'pg';
import path from 'path';
import { logger } from './logger';
import { serverConfig } from './config';

const dbLogger = logger.withCategory("DATABASE");

const { host, port, user, password, database } = serverConfig.db;

// Check if running in a Google Cloud environment (like App Hosting or Cloud Run)
const isGoogleCloud = !!process.env.K_SERVICE;
const instanceConnectionName = "fastbasket:europe-west10:delivery";

dbLogger.info(`DB Connection check: Is Google Cloud? ${isGoogleCloud}`);

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
    host: isGoogleCloud ? path.join('/cloudsql', instanceConnectionName) : host,
    port: isGoogleCloud ? undefined : port,
};

const pool = new Pool(poolConfig);

pool.on('connect', (client) => {
    dbLogger.info('A client has successfully connected to the database.');
});

pool.on('error', (err, client) => {
    dbLogger.error('Unexpected error on idle client in the pool', err);
    // It's critical to handle this to prevent the app from crashing.
    // In a real production app, you might have more sophisticated logic here.
});

export const query = async (text: string, params?: any[]) => {
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
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
    }
}


"use server";

import { Pool } from 'pg';
import path from 'path';
import { logger } from './logger'; // ИЗМЕНЕНО: Использование универсального логгера
import { appConfig } from './config';

const dbLogger = logger.withCategory("DATABASE"); // ИЗМЕНЕНО: Использование универсального логгера

const { host, port, user, password, database } = appConfig.db;

// Check if the host is a Cloud SQL connection name (e.g., "project:region:instance")
const isCloudSql = host.includes(':');

dbLogger.info(`DB Connection check: Is Cloud SQL? ${isCloudSql}`, { pgHost: host });

// This configuration is robust for both local development and App Hosting.
const poolConfig = {
    user,
    password,
    database,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Increased timeout for Cloud SQL
    // If it's a Cloud SQL instance, connect via the Unix socket provided by App Hosting.
    // Otherwise, use the standard host/port for local or direct connections.
    host: isCloudSql ? path.join('/cloudsql', host) : host,
    port: isCloudSql ? undefined : port,
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

export const getClient = async () => {
    dbLogger.info('Acquiring a client from the pool.');
    return pool.connect();
};

export const getPoolStatus = async () => {
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
    }
}

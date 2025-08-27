
"use server";

import pool from "@/lib/db";
import { serverLogger } from "../server-logger";

const dbActionLogger = serverLogger.withCategory("DB_ACTION");

export interface DbStatus {
    // Connection parameters
    host?: string;
    port?: number;
    user?: string;
    database?: string;
    // Pool stats
    totalCount: number;
    idleCount: number;
    waitingCount: number;
    // Status
    connected: boolean;
    error?: string;
}

export async function getDbStatusAction(): Promise<DbStatus> {
    const config = {
        host: process.env.PG_HOST,
        port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : undefined,
        user: process.env.PG_USER,
        database: process.env.PG_DATABASE,
    }
    
    try {
        const client = await pool.connect();
        const status: DbStatus = {
            ...config,
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
            connected: true
        };
        client.release();
        dbActionLogger.info("Successfully fetched DB status.", status);
        return status;
    } catch (error) {
        dbActionLogger.error("Failed to get DB status", error as Error);
        return {
            ...config,
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
            connected: false,
            error: (error as Error).message,
        };
    }
}


"use server";

import pool from "@/lib/db";
import { appConfig } from "@/lib/config";
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
    const { host, port, user, database } = appConfig.db;
    const config = { host, port, user, database };
    
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

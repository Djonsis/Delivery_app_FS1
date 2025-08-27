
"use server";

import { getPoolStatus } from "@/lib/db";
import { serverConfig } from "@/lib/config";
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
    const { host, port, user, database } = serverConfig.db;
    
    try {
        // Attempt a connection to verify
        const status = await getPoolStatus();
        dbActionLogger.info("Successfully fetched DB status.", status);
        return {
            host,
            port,
            user,
            database,
            totalCount: status.totalCount,
            idleCount: status.idleCount,
            waitingCount: status.waitingCount,
            connected: true
        };
    } catch (error) {
        dbActionLogger.error("Failed to get DB status", error as Error);
        const status = await getPoolStatus();
        return {
            host,
            port,
            user,
            database,
            totalCount: status.totalCount,
            idleCount: status.idleCount,
            waitingCount: status.waitingCount,
            connected: false,
            error: (error as Error).message,
        };
    }
}

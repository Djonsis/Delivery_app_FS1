
"use server";

import { getPoolStatus } from "@/lib/db";
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
        // Attempt a connection to verify
        const status = getPoolStatus();
        dbActionLogger.info("Successfully fetched DB status.", status);
        return {
            ...config,
            totalCount: status.totalCount,
            idleCount: status.idleCount,
            waitingCount: status.waitingCount,
            connected: true
        };
    } catch (error) {
        dbActionLogger.error("Failed to get DB status", error as Error);
        const status = getPoolStatus();
        return {
            ...config,
            totalCount: status.totalCount,
            idleCount: status.idleCount,
            waitingCount: status.waitingCount,
            connected: false,
            error: (error as Error).message,
        };
    }
}

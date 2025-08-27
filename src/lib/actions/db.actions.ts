
"use server";

import pool from "@/lib/db";
import { serverLogger } from "../server-logger";

const dbActionLogger = serverLogger.withCategory("DB_ACTION");

export interface DbStatus {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
    connected: boolean;
    error?: string;
}

export async function getDbStatusAction(): Promise<DbStatus> {
    try {
        const client = await pool.connect();
        const status: DbStatus = {
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
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
            connected: false,
            error: (error as Error).message,
        };
    }
}

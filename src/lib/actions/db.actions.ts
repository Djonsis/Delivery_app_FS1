
"use server";

import { getDbStatus } from "@/lib/db.service";
import { logger } from "../logger";
import { DbStatus } from "../types";

const dbActionLogger = logger.withCategory("DB_ACTION");

export async function getDbStatusAction(): Promise<DbStatus> {
    try {
        const status = await getDbStatus();
        dbActionLogger.info("Successfully fetched DB status via service.");
        return status;
    } catch (error) {
        dbActionLogger.error("Failed to get DB status via service", error as Error);
        return {
            connected: false,
            error: (error as Error).message,
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
        };
    }
}

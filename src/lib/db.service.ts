
import { getPoolStatus as getRawPoolStatus } from "@/lib/db";
import { dbConfig } from "@/lib/config";
import type { DbStatus } from "./types";

export async function getDbStatus(): Promise<DbStatus> {
    const { host, port, user, database } = dbConfig;

    const poolStats = getRawPoolStatus();

    // To truly check connectivity, we perform a simple query.
    // This will catch authentication errors, connection refused, etc.
    try {
        const { query } = await import("@/lib/db");
        await query('SELECT 1'); // A simple, fast query to test the connection.
        
        return {
            host,
            port,
            user,
            database,
            ...poolStats,
            connected: true,
        };
    } catch (error) {
        const err = error as Error & { code?: string };
        const errorMessage = `Code: ${err.code || 'N/A'} - ${err.message}`;
        return {
            host,
            port,
            user,
            database,
            ...poolStats,
            connected: false,
            error: errorMessage,
        };
    }
}

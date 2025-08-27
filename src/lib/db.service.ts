
import { getPoolStatus as getRawPoolStatus } from "@/lib/db";
import { serverConfig } from "@/lib/config";
import type { DbStatus } from "./actions/db.actions";

export async function getDbStatus(): Promise<DbStatus> {
    const { host, port, user, database } = serverConfig.db;

    // The raw pool status doesn't throw, so we can call it safely.
    // The actual connection test will happen implicitly when a query is made.
    const poolStats = getRawPoolStatus();

    // To truly check connectivity, we perform a simple query.
    try {
        const { query } = await import("@/lib/db");
        await query('SELECT 1'); // A simple, fast query to check the connection.
        
        return {
            host,
            port,
            user,
            database,
            ...poolStats,
            connected: true,
        };
    } catch (error) {
        return {
            host,
            port,
            user,
            database,
            ...poolStats,
            connected: false,
            error: (error as Error).message,
        };
    }
}

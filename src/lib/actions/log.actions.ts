"use server";

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { logger } from '../logger';

const logFileLogger = logger.withCategory("LOG_FILE_ACTION");
const logFilePath = path.join(process.cwd(), 'public', 'debug.log');


// Ensure the file exists before trying to read it
async function ensureLogFile() {
    try {
        await fs.access(logFilePath);
    } catch {
        logFileLogger.info("Log file not found, creating a new one.");
        await fs.writeFile(logFilePath, '', { flag: 'a' });
    }
}

export async function getLogsAction(): Promise<{ logs: string, size: number }> {
    try {
        await ensureLogFile();
        const stats = await fs.stat(logFilePath);
        const logs = await fs.readFile(logFilePath, 'utf-8');
        logFileLogger.debug("Successfully read log file.", { size: stats.size });
        return { logs, size: stats.size };
    } catch (error) {
        logFileLogger.error("Failed to read log file", error as Error);
        return { logs: `Error reading logs: ${(error as Error).message}`, size: 0 };
    }
}

export async function clearLogsAction(): Promise<{ success: boolean, message: string }> {
    try {
        await fs.writeFile(logFilePath, ''); // Overwrite with empty content
        logFileLogger.info("Log file has been cleared.");
        revalidatePath('/admin/logs'); // Revalidate the logs page
        return { success: true, message: "Логи успешно очищены." };
    } catch (error) {
        logFileLogger.error("Failed to clear log file", error as Error);
        return { success: false, message: `Ошибка при очистке логов: ${(error as Error).message}` };
    }
}

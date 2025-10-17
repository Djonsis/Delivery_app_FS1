'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { Logging, LogEntry } from '@google-cloud/logging';
import { isCloud, getProjectId, loggingConfig } from '../config';

const LOG_FILE_PATH = path.join(
  process.cwd(),
  loggingConfig.logDir,
  loggingConfig.logFile
);

// Определяем типы для возвращаемых значений
export type GetLogsResult = {
  logs?: string[];
  error?: string;
  logFilePath?: string;
  logFileExists?: boolean;
  message?: string;
  source?: 'cloud' | 'local';
  size?: number;
};

export type ClearLogsResult = {
  success: boolean;
  message: string;
};

/**
 * Type guard to check if a value is an object with a string 'message' property.
 * @param value The value to check.
 */
function hasMessage(value: unknown): value is { message: string } {
    return (
        typeof value === 'object' &&
        value !== null &&
        'message' in value &&
        typeof (value as { message: unknown }).message === 'string'
    );
}

/**
 * Форматирует запись из Cloud Logging в читаемую строку.
 */
const formatLogEntry = (entry: LogEntry): string => {
  const timestamp = entry.metadata?.timestamp ?? new Date();
  const severity = entry.metadata?.severity ?? 'INFO';

  let message = '';
  const data: unknown = entry.data;

  if (typeof data === 'string') {
    message = data;
  } else if (hasMessage(data)) {
    message = data.message;
  } else if (data && typeof data === 'object') {
    try {
      message = JSON.stringify(data);
    } catch {
      message = '[Unserializable object]';
    }
  } else if (data !== undefined && data !== null) {
    message = String(data);
  }

  const date = new Date(timestamp as string | Date);

  return `${date.toISOString()} [${severity}]: ${message}`;
};

/**
 * Получает логи из Cloud Logging (prod) или локального файла (dev).
 */
export async function getLogsAction(): Promise<GetLogsResult> {
  if (isCloud()) {
    try {
      const projectId = getProjectId();
      const logging = new Logging({ projectId });
      
      const logName = `projects/${projectId}/logs/winston_log`;
      const log = logging.log(logName);

      const [entries] = await log.getEntries({
        pageSize: 100, 
        orderBy: 'timestamp desc',
      });

      if (entries.length === 0) {
        return { logs: [], source: 'cloud', message: 'No logs found in Google Cloud Logging for this service.' };
      }

      // Size is not applicable for cloud logs in this context
      return { logs: entries.map(formatLogEntry), source: 'cloud', size: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching logs from Google Cloud:', errorMessage);
      return { error: `Error: Could not fetch logs from Google Cloud Logging. Details: ${errorMessage}`, source: 'cloud' };
    }
  }

  // Local development fallback
  try {
    const stats = await fs.stat(LOG_FILE_PATH);
    const data = await fs.readFile(LOG_FILE_PATH, 'utf8');
    const logs = data.trim() ? data.split('\n') : [];
    return { logs, source: 'local', logFilePath: LOG_FILE_PATH, logFileExists: true, size: stats.size };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as {code: string}).code === 'ENOENT') {
        return {
            logs: [],
            source: 'local',
            message: "Log file not found. This is expected if no logs have been written yet.",
            logFilePath: LOG_FILE_PATH,
            logFileExists: false,
            size: 0
        };
    }
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     console.error('Error reading log file:', errorMessage);
     return { error: `Failed to read log file: ${errorMessage}`, source: 'local' };
  }
}

/**
 * Очищает логи.
 * В Cloud окружении - операция не выполняется.
 * В dev окружении - очищает локальный файл.
 */
export async function clearLogsAction(): Promise<ClearLogsResult> {
  if (isCloud()) {
    const message = 'Clearing logs is not permitted in a cloud environment due to retention policies. Please use the Google Cloud Console.';
    console.warn(message);
    return { success: false, message };
  }

  try {
    // Try to unlink first to handle cases where it might be an empty file or directory
    try {
      await fs.unlink(LOG_FILE_PATH);
    } catch (unlinkError) {
      // If it doesn't exist, that's fine, we wanted it gone anyway.
      if ((unlinkError as { code: string }).code !== 'ENOENT') {
        throw unlinkError; // Re-throw if it's a different error (e.g., permissions)
      }
    }
    const message = `Log file cleared successfully at: ${LOG_FILE_PATH}`;
    console.log(message);
    return { success: true, message };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to clear log file:', error);
    return { success: false, message: `Failed to clear log file: ${errorMessage}` };
  }
}

'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { Logging, LogEntry } from '@google-cloud/logging';
import { isCloud, getProjectId, loggingConfig } from '@/lib/config';

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
    // Safely access the message property thanks to the type guard
    message = data.message;
  } else if (data && typeof data === 'object') {
    // If it's another type of object, stringify it
    try {
      message = JSON.stringify(data);
    } catch {
      message = '[Unserializable object]';
    }
  } else if (data !== undefined && data !== null) {
    // Handle other primitive types
    message = String(data);
  }

  const date = new Date(timestamp as string | Date);

  return `${date.toISOString()} [${severity}]: ${message}`;
};

/**
 * Получает логи из Cloud Logging (prod) или локального файла (dev).
 * 
 * ⚠️ TODO: Добавить проверку авторизации (только для администраторов)
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
        return { logs: [], message: 'No logs found in Google Cloud Logging for this service.' };
      }

      return { logs: entries.map(formatLogEntry) };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching logs from Google Cloud:', errorMessage);
      return { error: `Error: Could not fetch logs from Google Cloud Logging. Details: ${errorMessage}` };
    }
  }

  // Local development fallback
  try {
    const data = await fs.readFile(LOG_FILE_PATH, 'utf8');
    const logs = data.trim() ? data.split('\n') : [];
    return { logs, logFilePath: LOG_FILE_PATH, logFileExists: true };
  } catch (error) {
    // ENOENT = File Not Found
    if (typeof error === 'object' && error !== null && 'code' in error && (error as {code: string}).code === 'ENOENT') {
        return {
            logs: [],
            message: "Log file not found. This is expected if no logs have been written yet.",
            logFilePath: LOG_FILE_PATH,
            logFileExists: false
        };
    }
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     console.error('Error reading log file:', errorMessage);
     return { error: `Failed to read log file: ${errorMessage}` };
  }
}

/**
 * Очищает логи.
 * В Cloud окружении - только логирует запрос (управление через Console).
 * В dev окружении - очищает локальный файл.
 * 
 * ⚠️ TODO: Добавить проверку авторизации
 */
export async function clearLogsAction(): Promise<ClearLogsResult> {
  if (isCloud()) {
    const message = 'Request to clear logs received in a cloud environment. No action taken due to retention policies.';
    console.log(message);
    return { success: true, message };
  }

  try {
    await fs.writeFile(LOG_FILE_PATH, '');
    const message = `Log file cleared at: ${LOG_FILE_PATH}`;
    console.log(message);
    return { success: true, message };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to clear log file:', error);
    return { success: false, message: `Failed to clear log file: ${errorMessage}` };
  }
}

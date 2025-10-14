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

/**
 * Форматирует запись из Cloud Logging в читаемую строку.
 */
const formatLogEntry = (entry: LogEntry): string => {
  const timestamp = entry.metadata?.timestamp ?? new Date();
  const severity = entry.metadata?.severity ?? 'INFO';

  let message = '';
  const { data } = entry;

  if (typeof data === 'string') {
    message = data;
  } else if (data && typeof data === 'object') {
    if ('message' in data && data.message) {
      message = String(data.message);
    } else {
      message = JSON.stringify(data);
    }
  }

  const date = new Date(timestamp as string | Date);

  return `${date.toISOString()} [${severity}]: ${message}`;
};

/**
 * Получает логи из Cloud Logging (prod) или локального файла (dev).
 * 
 * ⚠️ TODO: Добавить проверку авторизации (только для администраторов)
 */
export async function getLogsAction(): Promise<string> {
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
        return 'No logs found in Google Cloud Logging for this service.';
      }

      return entries.map(formatLogEntry).join('\n');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching logs from Google Cloud:', errorMessage);
      return `Error: Could not fetch logs from Google Cloud Logging. Details: ${errorMessage}`;
    }
  }

  // Local development fallback
  try {
    const data = await fs.readFile(LOG_FILE_PATH, 'utf8');
    return data.trim() ? data : 'Log file is empty.';
  } catch {
    // ✅ Не объявляем переменную - ESLint доволен
    return 'Log file not found. This is expected if no logs have been written yet.';
  }
}

/**
 * Очищает логи.
 * В Cloud окружении - только логирует запрос (управление через Console).
 * В dev окружении - очищает локальный файл.
 * 
 * ⚠️ TODO: Добавить проверку авторизации
 */
export async function clearLogsAction(): Promise<void> {
  if (isCloud()) {
    console.log('Request to clear logs received in a cloud environment. No action taken due to retention policies.');
    return;
  }

  try {
    await fs.writeFile(LOG_FILE_PATH, '');
    console.log(`Log file cleared at: ${LOG_FILE_PATH}`);
  } catch (error) {
    // ✅ Здесь используем error, поэтому можно объявить
    console.error('Failed to clear log file:', error);
  }
}

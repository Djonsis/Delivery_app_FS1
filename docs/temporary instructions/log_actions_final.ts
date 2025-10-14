// src/lib/actions/log.actions.ts
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { isCloud, getProjectId, loggingConfig } from '@/lib/config';
import { Logging } from '@google-cloud/logging';

const LOG_FILE_PATH = path.join(process.cwd(), loggingConfig.logDir, loggingConfig.logFile);

/**
 * Форматирует запись из Cloud Logging в читаемую строку.
 */
const formatLogEntry = (entry: any): string => {
  const { timestamp, severity, jsonPayload, textPayload } = entry;
  const level = severity || 'INFO';
  const message = jsonPayload?.message || textPayload || JSON.stringify(jsonPayload);
  const category = jsonPayload?.category || '';
  
  return `[${new Date(timestamp).toISOString()}] [${level}] ${category ? `[${category}] ` : ''}${message}`;
};

/**
 * Получает логи из Cloud Logging (prod) или локального файла (dev).
 * 
 * ⚠️ TODO: Добавить проверку авторизации (только для администраторов)
 * 
 * @returns Строка с логами для отображения
 */
export async function getLogsAction(): Promise<string> {
  // Временная защита от случайных вызовов в production
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ SECURITY: Logs accessed without authentication in production!');
    // TODO: Throw error when auth is implemented
    // throw new Error('Authentication required');
  }

  if (isCloud()) {
    try {
      const projectId = getProjectId();
      const logging = new Logging({ projectId });
      const log = logging.log('winston_log');

      const [entries] = await log.getEntries({
        pageSize: 100,
        orderBy: 'timestamp desc',
        filter: 'resource.type="cloud_run_revision"',
      });

      if (entries.length === 0) {
        return 'No logs found in Google Cloud Logging.';
      }

      return entries.map(formatLogEntry).join('\n');
    } catch (error) {
      console.error('Error fetching Cloud logs:', error);
      return `Error: Could not fetch logs from Google Cloud Logging.\n${(error as Error).message}`;
    }
  }

  // Local development fallback
  try {
    const data = await fs.readFile(LOG_FILE_PATH, 'utf8');
    return data || 'Log file is empty.';
  } catch (error) {
    return `Log file does not exist at ${LOG_FILE_PATH}`;
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
  // Временная защита
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ SECURITY: Clear logs called without authentication in production!');
  }

  if (isCloud()) {
    console.log('Clear logs request received in cloud. Use retention policies in Cloud Console.');
    return;
  }

  try {
    await fs.writeFile(LOG_FILE_PATH, '');
    console.log(`Local log file cleared: ${LOG_FILE_PATH}`);
  } catch (error) {
    console.error('Failed to clear log file:', error);
    throw new Error('Failed to clear logs');
  }
}

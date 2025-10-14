// src/lib/server-logger.ts
import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';
import { isCloud, getProjectId, getLogLevel, loggingConfig } from '@/lib/config';
import path from 'path';

const LOG_PATH = path.join(process.cwd(), loggingConfig.logDir, loggingConfig.logFile);

// Формализованный выбор формата логов
const logFormat = isCloud() 
  ? winston.format.json()    // Cloud Logging expects JSON
  : winston.format.simple(); // Console-friendly format for local dev

const serverLogger = winston.createLogger({
  level: getLogLevel(),
  format: logFormat,
  transports: [],
});

if (isCloud()) {
  // Production: логи в Google Cloud Logging
  serverLogger.add(new LoggingWinston({
    projectId: getProjectId(),
  }));
} else {
  // Development: логи в консоль и файл
  serverLogger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
  
  serverLogger.add(new winston.transports.File({ 
    filename: LOG_PATH,
    format: winston.format.json(), // JSON даже локально для легкого парсинга
  }));
}

/**
 * Расширение логгера для поддержки категорий.
 * Использование: const logger = serverLogger.withCategory('ORDER_SERVICE');
 */
(serverLogger as any).withCategory = (category: string) => {
  return {
    debug: (message: string, meta?: any) => 
      serverLogger.debug(message, { category, ...meta }),
    info: (message: string, meta?: any) => 
      serverLogger.info(message, { category, ...meta }),
    warn: (message: string, meta?: any) => 
      serverLogger.warn(message, { category, ...meta }),
    error: (message: string, error?: Error, meta?: any) => 
      serverLogger.error(message, { 
        category, 
        error: error?.message, 
        stack: error?.stack, 
        ...meta 
      }),
    time: (label: string) => 
      serverLogger.profile(label),
    timeEnd: (label: string) => 
      serverLogger.profile(label),
  };
};

export { serverLogger };

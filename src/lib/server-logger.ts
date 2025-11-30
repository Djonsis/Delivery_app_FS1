import 'server-only';
import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';
import fs from 'fs';
import path from 'path';
import { isCloud, getLogLevel, getProjectId, loggingConfig, getNodeEnv } from '@/lib/config';

// ---- Winston Logger Setup (unchanged) ----

const winstonLogger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.json(),
  defaultMeta: {
    serviceContext: {
      service: 'web-app',
      version: '1.0.0',
    },
    projectId: getProjectId(),
  },
  transports: [],
});

// In a cloud environment, log to Google Cloud Logging
if (isCloud()) {
  winstonLogger.add(new LoggingWinston());
} else {
  // For local development, set up file and console transports
  const logDirPath = path.join(process.cwd(), loggingConfig.logDir);
  if (!fs.existsSync(logDirPath)) {
    fs.mkdirSync(logDirPath, { recursive: true });
    console.log(`🪵 Created log directory: ${logDirPath}`);
  }

  winstonLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));

  winstonLogger.add(
    new winston.transports.File({
      filename: path.join(logDirPath, loggingConfig.logFile),
      format: getNodeEnv() === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.prettyPrint()
          ),
    })
  );
}

// ---- NEW: Adapter to match logger() API ----

/**
 * Logger class that wraps Winston and provides API compatible with logger() from logger.ts
 * 
 * Key features:
 * - withCategory() method for creating scoped loggers
 * - All logs go through Winston (file + Cloud Logging)
 * - Compatible with existing code using serverLogger.withCategory()
 */
class ServerLogger {
  private logger: winston.Logger;
  private category: string;

  constructor(logger: winston.Logger, category: string = 'SERVER') {
    this.logger = logger;
    this.category = category;
  }

  /**
   * Creates a new logger instance with a specific category.
   * This matches the API of the client-side logger.
   */
  public withCategory(category: string): ServerLogger {
    return new ServerLogger(this.logger, category);
  }

  // Helper to merge metadata with the category
  private createMeta(meta?: unknown): object {
    const baseMeta = { category: this.category };
    if (meta && typeof meta === 'object') {
      return { ...baseMeta, ...meta };
    }
    return baseMeta;
  }
  
  // Type guard to check if an object is an instance of Error
  private isError(e: unknown): e is Error {
    return e instanceof Error;
  }

  public debug(message: string, meta?: unknown): void {
    this.logger.debug(message, this.createMeta(meta));
  }

  public info(message: string, meta?: unknown): void {
    this.logger.info(message, this.createMeta(meta));
  }

  public warn(message: string, meta?: unknown): void {
    this.logger.warn(message, this.createMeta(meta));
  }

  /**
   * Logs an error message. If the provided `error` is an Error object,
   * its stack and other properties are logged.
   */
  public error(message: string, error: unknown): void {
    let meta: object;

    if (this.isError(error)) {
        meta = {
            message: error.message,
            stack: error.stack,
            name: error.name,
        };
    } else if (typeof error === 'object' && error !== null) {
        meta = { ...error };
    } else {
        meta = { rawError: error };
    }
    
    this.logger.error(message, this.createMeta({ error: meta }));
  }

  // ---- NEW: Performance timing methods (optional, for consistency with logger.ts) ----
  
  /**
   * Start a performance timer
   */
  public time(label: string): void {
    // Store start time in Winston metadata or external Map
    this.logger.debug(`[TIMER START] ${label}`, this.createMeta({ timerLabel: label }));
  }

  /**
   * End a performance timer and log duration
   */
  public timeEnd(label: string): void {
    // In a real implementation, calculate duration
    // For now, just log that timer ended
    this.logger.debug(`[TIMER END] ${label}`, this.createMeta({ timerLabel: label }));
  }
}

/**
 * Singleton instance of server logger with default 'SERVER' category.
 * 
 * @example
 * ```typescript
 * import { serverLogger } from '@/lib/server-logger';
 * 
 * // Direct usage
 * serverLogger.info('Server started');
 * 
 * // With category
 * const dbLogger = serverLogger.withCategory('DATABASE');
 * dbLogger.error('Connection failed', error);
 * ```
 */
export const serverLogger = new ServerLogger(winstonLogger);

export const dbLogger = serverLogger.withCategory('DB');

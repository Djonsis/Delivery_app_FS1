import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';
import fs from 'fs';
import path from 'path';
import { isCloud, getLogLevel, getProjectId, loggingConfig, getNodeEnv } from '@/lib/config';

// Base Winston logger configuration
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

/**
 * A wrapper class for the Winston logger to provide a consistent API
 * with the client-side logger, specifically for the `withCategory` method.
 */
class LoggerWrapper {
  private logger: winston.Logger;
  private category: string;

  constructor(logger: winston.Logger, category: string = 'APP') {
    this.logger = logger;
    this.category = category;
  }

  /**
   * Creates a new logger instance with a specific category.
   */
  public withCategory(category: string): LoggerWrapper {
    return new LoggerWrapper(this.logger, category);
  }

  // Helper to merge metadata with the category
  private createMeta(meta?: unknown) {
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

  public debug(message: string, meta?: unknown) {
    this.logger.debug(message, this.createMeta(meta));
  }

  public info(message: string, meta?: unknown) {
    this.logger.info(message, this.createMeta(meta));
  }

  public warn(message: string, meta?: unknown) {
    this.logger.warn(message, this.createMeta(meta));
  }

  /**
   * Logs an error message. If the provided `error` is an Error object,
   * its stack and other properties are logged.
   */
  public error(message: string, error: unknown) {
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
}

// Export a singleton instance of the wrapper
export const serverLogger = new LoggerWrapper(winstonLogger);
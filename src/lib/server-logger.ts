import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';
import fs from 'fs';
import path from 'path';
// UPDATED: Import getNodeEnv for conditional formatting
import { isCloud, getLogLevel, getProjectId, loggingConfig, getNodeEnv } from '@/lib/config';

// Create a new Winston logger instance
const serverLogger = winston.createLogger({
  level: getLogLevel(),
  // Default format is JSON, but can be overridden by transports
  format: winston.format.json(), 
  defaultMeta: {
    serviceContext: {
      service: 'web-app',
      version: '1.0.0' 
    },
    projectId: getProjectId(), 
  },
  transports: [],
});

// In a cloud environment (App Hosting), log to Google Cloud Logging
if (isCloud()) {
  serverLogger.add(new LoggingWinston());
} else {
  const logDirPath = path.join(process.cwd(), loggingConfig.logDir);
  if (!fs.existsSync(logDirPath)) {
    fs.mkdirSync(logDirPath, { recursive: true });
    // IMPROVEMENT: Log when the directory is created for better DX
    console.log(`🪵 Created log directory: ${logDirPath}`);
  }

  // For local development, log to the console with a simple, colorful format
  serverLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
  
  // Also, log to a file for local debugging
  serverLogger.add(
    new winston.transports.File({
      filename: path.join(logDirPath, loggingConfig.logFile),
      // IMPROVEMENT: Use pretty printing for local logs, JSON for prod (if ever local)
      format: getNodeEnv() === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.prettyPrint()
          ),
    })
  );
}

export { serverLogger };

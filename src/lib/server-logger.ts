// Серверный логгер, который может писать в файл.
// Использовать ТОЛЬКО в серверном коде.

import { inspect } from 'util';
import fs from 'fs';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogFormat = 'json' | 'text';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// --- Configuration ---
const config = {
    level: (process.env.LOG_LEVEL as LogLevel) || 'debug',
    format: (process.env.LOG_FORMAT as LogFormat) || 'text',
    logFilePath: path.join(process.cwd(), 'public', 'debug.log'),
};

const configuredLevel = LOG_LEVELS[config.level] ?? LOG_LEVELS.debug;
const performanceTimers = new Map<string, number>();


// --- File Writing Logic (Server-Only) ---
const writeLogToFile = (entry: string) => {
    try {
        const dir = path.dirname(config.logFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.appendFileSync(config.logFilePath, entry + '\n', 'utf8');
    } catch (e) {
        console.error("Failed to write to log file:", e);
    }
};

// --- Formatting Logic ---
const formatObject = (obj: any): string => {
  return inspect(obj, { showHidden: false, depth: null, colors: false, compact: true });
}

const formatLogEntry = (level: LogLevel, category: string, message: string, data?: any): string => {
    const timestamp = new Date().toISOString();
    const upperCaseLevel = level.toUpperCase();
    
    if (config.format === 'json') {
        const logObject = { timestamp, level: upperCaseLevel, category, message, ...data };
        try {
          return JSON.stringify(logObject);
        } catch (error) {
          // Fallback for circular references or other serialization errors
          return JSON.stringify({ timestamp, level: upperCaseLevel, category, message, error: "Failed to serialize log data" });
        }
    }
    
    const dataString = data ? ` ${formatObject(data)}` : '';
    return `[${timestamp}] [${upperCaseLevel}] [${category}] ${message}${dataString}`;
};

// --- Logger Class ---
class ServerLogger {
    private category: string;

    constructor(category: string = 'APP') {
        this.category = category;
    }

    public withCategory(category: string): ServerLogger {
        return new ServerLogger(category);
    }
    
    private log(level: LogLevel, message: string, data?: any) {
        if (LOG_LEVELS[level] < configuredLevel) return;

        const logEntry = formatLogEntry(level, this.category, message, data);
        
        console.log(logEntry);
        writeLogToFile(logEntry);
    }

    public debug(message: string, data?: any) {
        this.log('debug', message, data);
    }

    public info(message: string, data?: any) {
        this.log('info', message, data);
    }

    public warn(message: string, data?: any) {
        this.log('warn', message, data);
    }

    public error(message: string, error: any) {
        let errorData: any;

        if (error instanceof Error) {
            errorData = {
                message: error.message,
                stack: error.stack,
                name: error.name,
                 // Include other potential properties
                ...error
            };
        } else if (typeof error === 'object' && error !== null) {
            errorData = error;
        } else {
            errorData = { rawError: error };
        }
        
        this.log('error', message, { error: errorData });
    }
    
    public time(label: string) {
        performanceTimers.set(label, Date.now());
    }

    public timeEnd(label: string) {
        const startTime = performanceTimers.get(label);
        if (startTime) {
            const duration = Date.now() - startTime;
            this.debug(`${label} took ${duration}ms`);
            performanceTimers.delete(label);
        } else {
            this.warn(`Timer with label "${label}" was ended but never started.`);
        }
    }
}

// --- Singleton Instance ---
export const serverLogger = new ServerLogger();

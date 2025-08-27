// Универсальный логгер, безопасный для клиента и сервера.
// "use client" директива здесь не нужна, так как логика адаптируется.

import { inspect } from 'util';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogFormat = 'json' | 'text';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const IS_SERVER = typeof window === 'undefined';

// --- Configuration ---
const config = {
    level: (process.env.LOG_LEVEL as LogLevel) || 'debug',
    format: (process.env.LOG_FORMAT as LogFormat) || 'text',
    logFilePath: IS_SERVER ? require('path').join(process.cwd(), 'public', 'debug.log') : '',
};

const configuredLevel = LOG_LEVELS[config.level] ?? LOG_LEVELS.debug;
const performanceTimers = new Map<string, number>();


// --- File Writing Logic (Server-Only) ---
const writeLogToFile = (entry: string) => {
    if (!IS_SERVER) return;
    try {
        const fs = require('fs');
        const path = require('path');
        
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
        return JSON.stringify(logObject);
    }
    
    const dataString = data ? `\n${formatObject(data)}` : '';
    return `[${timestamp}] [${upperCaseLevel}] [${category}] ${message}${dataString}`;
};

// --- Logger Class ---
class Logger {
    private category: string;

    constructor(category: string = 'APP') {
        this.category = category;
    }

    public withCategory(category: string): Logger {
        return new Logger(category);
    }
    
    private log(level: LogLevel, message: string, data?: any) {
        if (LOG_LEVELS[level] < configuredLevel) return;

        // Log to console
        const consoleMessage = `[${level.toUpperCase()}] [${this.category}] ${message}`;
        const dataToLog = data ? data : '';
        switch(level) {
            case 'error': console.error(consoleMessage, dataToLog); break;
            case 'warn': console.warn(consoleMessage, dataToLog); break;
            case 'info': console.info(consoleMessage, dataToLog); break;
            default: console.debug(consoleMessage, dataToLog); break;
        }

        // Log to file if on server
        if (IS_SERVER) {
            const fileEntry = formatLogEntry(level, this.category, message, data);
            writeLogToFile(fileEntry);
        }
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
            };
        } else if (typeof error === 'object' && error !== null) {
            // If it's an object but not an Error, try to serialize it
            errorData = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
        } else {
             // For primitives or other types
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
export const logger = new Logger();

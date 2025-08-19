
import fs from 'fs';
import path from 'path';
import { inspect } from 'util';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogFormat = 'json' | 'text';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// --- Configuration ---
// Read from environment variables, with defaults
const config = {
    level: (process.env.LOG_LEVEL as LogLevel) || 'debug',
    format: (process.env.LOG_FORMAT as LogFormat) || 'text',
    logFilePath: path.join(process.cwd(), 'public', 'debug.log'),
};

const configuredLevel = LOG_LEVELS[config.level] ?? LOG_LEVELS.debug;
const performanceTimers = new Map<string, number>();

// --- Helper Functions ---
const isServer = typeof window === 'undefined';

const ensureLogFileExists = () => {
    if (!isServer) return;
    const dir = path.dirname(config.logFilePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(config.logFilePath)) {
        fs.writeFileSync(config.logFilePath, '', { flag: 'a' });
    }
};

const formatObject = (obj: any): string => {
  return inspect(obj, { showHidden: false, depth: null, colors: false, compact: true });
}

const formatLogEntry = (level: LogLevel, category: string, message: string, data?: any): string => {
    const timestamp = new Date().toISOString();
    const upperCaseLevel = level.toUpperCase();
    const dataString = data ? `\n${formatObject(data)}` : '';

    if (config.format === 'json' && isServer) {
        const logObject = {
            timestamp,
            level: upperCaseLevel,
            category,
            message,
            ...data,
        };
        return JSON.stringify(logObject);
    }
    // Default to text format
    return `[${timestamp}] [${upperCaseLevel}] [${category}] ${message}${dataString}`;
};

const writeLog = (entry: string) => {
    if (!isServer) return;
    ensureLogFileExists();
    // Use fs.appendFileSync for synchronous writing to avoid race conditions
    fs.appendFileSync(config.logFilePath, entry + '\n', 'utf8');
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

        const entry = formatLogEntry(level, this.category, message, data);
        
        if(isServer) {
            console.log(entry); // Always log to console on server
            writeLog(entry);
        } else {
             // On the client, use console methods with better browser support
            const dataToLog = data ? data : '';
            const logMessage = `[${level.toUpperCase()}] [${this.category}] ${message}`;
            switch(level) {
                case 'error':
                    console.error(logMessage, dataToLog);
                    break;
                case 'warn':
                    console.warn(logMessage, dataToLog);
                    break;
                case 'info':
                    console.info(logMessage, dataToLog);
                    break;
                case 'debug':
                default:
                    console.debug(logMessage, dataToLog);
                    break;
            }
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

    public error(message: string, error: Error | any) {
        const errorData = {
            error: {
                message: error instanceof Error ? error.message : 'An unknown error occurred.',
                stack: error instanceof Error ? error.stack : undefined,
                ...(!(error instanceof Error) && { rawError: error }),
            },
        };
        this.log('error', message, errorData);
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

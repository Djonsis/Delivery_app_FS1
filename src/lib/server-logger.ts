// This logger is for SERVER-SIDE use ONLY.
// It uses Node.js modules like 'fs' and 'path' which are not available on the client.

import fs from 'fs';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogFormat = 'text' | 'json';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Configuration
const configuredLevel: number = LOG_LEVELS[(process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'debug'] ?? LOG_LEVELS.debug;
const logFormat: LogFormat = (process.env.LOG_FORMAT as LogFormat) || 'text';
const logFilePath = path.join(process.cwd(), 'public', 'debug.log');
const performanceTimers = new Map<string, number>();


// Ensure log file and directory exist
try {
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    // This just ensures the file exists, doesn't clear it.
    fs.appendFileSync(logFilePath, ''); 
} catch (error) {
    console.error('Failed to ensure log file exists:', error);
}


class ServerLogger {
    private category: string;

    constructor(category: string = 'APP') {
        this.category = category;
    }

    public withCategory(category: string): ServerLogger {
        return new ServerLogger(category);
    }
    
    private formatData(data: any): any {
        if (data instanceof Error) {
            return {
                message: data.message,
                stack: data.stack,
                name: data.name,
                ...data
            };
        }
        return data;
    }

    private log(level: LogLevel, message: string, data?: any) {
        if (LOG_LEVELS[level] < configuredLevel) return;

        const timestamp = new Date().toISOString();
        const formattedData = data ? this.formatData(data) : undefined;

        let logEntry: string;

        if (logFormat === 'json') {
            const logObject = {
                timestamp,
                level,
                category: this.category,
                message,
                ...(formattedData && { data: formattedData }),
            };
            logEntry = JSON.stringify(logObject);
        } else {
            logEntry = `[${timestamp}] [${level.toUpperCase()}] [${this.category}] ${message}`;
            if (formattedData) {
                // Use inspect for better object formatting in text mode
                const util = require('util');
                logEntry += `\n${util.inspect(formattedData, { showHidden: false, depth: null, colors: false })}`;
            }
        }

        // 1. Log to console
        const consoleMessage = `[${level.toUpperCase()}] [${this.category}] ${message}`;
        switch(level) {
            case 'error': console.error(consoleMessage, formattedData || ''); break;
            case 'warn': console.warn(consoleMessage, formattedData || ''); break;
            case 'info': console.info(consoleMessage, formattedData || ''); break;
            default: console.debug(consoleMessage, formattedData || ''); break;
        }

        // 2. Append to file
        try {
            fs.appendFileSync(logFilePath, logEntry + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
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
        this.log('error', message, error);
    }
    
    public time(label: string) {
        performanceTimers.set(label, Date.now());
    }

    public timeEnd(label: string) {
        const startTime = performanceTimers.get(label);
        if (startTime) {
            const duration = Date.now() - startTime;
            // Use a text format for performance logs regardless of logFormat
            const logMessage = `[${new Date().toISOString()}] [DEBUG] [${this.category}] ${label} took ${duration}ms\n`;
            console.debug(logMessage.trim());
            try {
                fs.appendFileSync(logFilePath, logMessage);
            } catch (error) {
                console.error('Failed to write performance log to file:', error);
            }
            performanceTimers.delete(label);
        } else {
            this.warn(`Timer with label "${label}" was ended but never started.`);
        }
    }
}

// --- Singleton Instance ---
export const serverLogger = new ServerLogger();

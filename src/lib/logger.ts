// This logger is safe for use on both the client and server.
// It does not contain any server-side dependencies like 'fs'.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const getLogLevel = () => {
    try {
        const levelFromEnv = process.env.NEXT_PUBLIC_LOG_LEVEL;
        if (levelFromEnv && levelFromEnv in LOG_LEVELS) {
            return LOG_LEVELS[levelFromEnv as LogLevel];
        }
    } catch (e) {
        // process is not defined in some environments.
    }
    return LOG_LEVELS.info; 
}

const configuredLevel = getLogLevel();
const performanceTimers = new Map<string, number>();

/**
 * Universal logger class that works in both client and server environments.
 */
class Logger {
    private category: string;

    constructor(category: string = 'APP') {
        this.category = category;
    }

    /**
     * Creates a new logger instance with a specific category.
     * Provides API compatibility with server-logger.ts
     */
    public withCategory(category: string): Logger {
        return new Logger(category);
    }
    
    private log(level: LogLevel, message: string, data?: unknown) {
        if (LOG_LEVELS[level] < configuredLevel) return;

        const consoleMessage = `[${level.toUpperCase()}] [${this.category}] ${message}`;
        const dataToLog = data ? data : '';

        switch(level) {
            case 'error': console.error(consoleMessage, dataToLog); break;
            case 'warn': console.warn(consoleMessage, dataToLog); break;
            case 'info': console.info(consoleMessage, dataToLog); break;
            default: console.debug(consoleMessage, dataToLog); break;
        }
    }

    public debug(message: string, data?: unknown) {
        this.log('debug', message, data);
    }

    public info(message: string, data?: unknown) {
        this.log('info', message, data);
    }

    public warn(message: string, data?: unknown) {
        this.log('warn', message, data);
    }

    public error(message: string, error: unknown) {
        let errorData: unknown;

        if (error instanceof Error) {
            // Extract essential Error properties without duplication
            errorData = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        } else if (typeof error === 'object' && error !== null) {
            errorData = error;
        } else {
            errorData = { rawError: error };
        }
        
        this.log('error', message, { error: errorData });
    }
    
    public time(label: string) {
        if (typeof window !== "undefined" && window.performance) {
            performance.mark(`${label}-start`);
        } else {
            performanceTimers.set(label, Date.now());
        }
    }

    public timeEnd(label: string) {
        if (typeof window !== "undefined" && window.performance) {
            try {
                performance.mark(`${label}-end`);
                const measure = performance.measure(label, `${label}-start`, `${label}-end`);
                this.debug(`${label} took ${measure.duration.toFixed(2)}ms`);
            } catch (e) {
                // If marks don't exist, just ignore.
            }
        } else {
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
}

// --- Create singleton instance ---
const loggerInstance = new Logger();

/**
 * Universal logger that supports BOTH usage patterns:
 * 
 * Pattern 1 (function): logger("CATEGORY")
 * Pattern 2 (method): logger.withCategory("CATEGORY")
 */
interface LoggerInterface extends Logger {
    (category: string): Logger;
}

/**
 * Factory function that creates a logger with the specified category.
 * Also acts as an object with withCategory() method.
 */
const createLoggerProxy = (): LoggerInterface => {
    const factory = (category: string): Logger => {
        return new Logger(category);
    };

    // Copy all methods from Logger instance to the factory function
    Object.setPrototypeOf(factory, Logger.prototype);
    Object.assign(factory, loggerInstance);

    return factory as LoggerInterface;
};

/**
 * Universal logger export.
 * 
 * Usage:
 * ```typescript
 * // Pattern 1: Function (backward compatible)
 * import { logger } from '@/lib/logger';
 * const log = logger("MY_CATEGORY");
 * log.info("Hello");
 * 
 * // Pattern 2: Method (server-logger compatible)
 * import { logger } from '@/lib/logger';
 * const log = logger.withCategory("MY_CATEGORY");
 * log.info("Hello");
 * ```
 */
export const logger = createLoggerProxy();
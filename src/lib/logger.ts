// Client-side logger - safe for use in browser environments.
// It only writes to the browser's console and has no server-side dependencies.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const configuredLevel = LOG_LEVELS[(process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'debug'] ?? LOG_LEVELS.debug;
const performanceTimers = new Map<string, number>();

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

        const consoleMessage = `[${level.toUpperCase()}] [${this.category}] ${message}`;
        const dataToLog = data ? data : '';

        switch(level) {
            case 'error': console.error(consoleMessage, dataToLog); break;
            case 'warn': console.warn(consoleMessage, dataToLog); break;
            case 'info': console.info(consoleMessage, dataToLog); break;
            default: console.debug(consoleMessage, dataToLog); break;
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
export const logger = new Logger();

import { inspect } from 'util';

// Типы уровней логирования
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

// Уровни логирования для фильтрации
const LOG_LEVELS: Record<LogLevel, number> = {
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
};

// Уровень логирования по умолчанию
let currentLogLevel: LogLevel = 'INFO';

/**
 * Устанавливает уровень логирования, основываясь на переменных окружения.
 * Должен быть вызван один раз при старте приложения.
 */
function initializeLogLevel() {
    try {
        const levelFromEnv = process.env.NEXT_PUBLIC_LOG_LEVEL;
        if (levelFromEnv && LOG_LEVELS[levelFromEnv as LogLevel]) {
            currentLogLevel = levelFromEnv as LogLevel;
        }
    } catch { // ✅ Исправлено: удалено 'e', чтобы избежать Warning: '_e' is defined but never used
        // process is not defined in some environments (e.g., in a browser context).
    }
}

// Инициализация при загрузке модуля
initializeLogLevel();

/**
 * Проверяет, должен ли данный лог-уровень быть выведен.
 * @param level Уровень сообщения
 * @returns true, если сообщение должно быть выведено.
 */
function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

// Определяем, куда выводить логи
const logOutput = console;

/**
 * Базовая функция логирования.
 */
function logMessage(level: LogLevel, category: string, message: string, data?: unknown) {
    if (!shouldLog(level)) {
        return;
    }

    // Форматируем время в ISO
    const timestamp = new Date().toISOString();
    let logEntry = `${timestamp} [${level}] [${category}] ${message}`;

    if (data) {
        // Добавляем дополнительные данные, форматируя их как JSON или inspect (для сложных объектов)
        const details = typeof data === 'string' ? data : inspect(data, { depth: 5, colors: false });
        logEntry += ` - Details: ${details}`;
    }

    // Используем соответствующий метод console
    switch (level) {
        case 'ERROR':
            logOutput.error(logEntry);
            break;
        case 'WARN':
            logOutput.warn(logEntry);
            break;
        case 'INFO':
            logOutput.info(logEntry);
            break;
        case 'DEBUG':
            logOutput.log(logEntry); // console.debug часто скрыт
            break;
    }
}

/**
 * Создает обертку для логирования, привязанную к определенной категории.
 * @param category Название категории (например, 'DATABASE', 'AUTH', 'API/PRODUCTS')
 */
export function logger(category: string) {
    return {
        debug: (message: string, data?: unknown) => logMessage('DEBUG', category, message, data),
        info: (message: string, data?: unknown) => logMessage('INFO', category, message, data),
        warn: (message: string, data?: unknown) => logMessage('WARN', category, message, data),
        error: (message: string, data?: unknown) => logMessage('ERROR', category, message, data),
        withCategory: (subCategory: string) => logger(`${category}/${subCategory}`),
        // Вспомогательная функция для логирования времени выполнения
        time: (label: string, data?: unknown) => {
            if (!shouldLog('DEBUG')) return;
            try {
                performance.mark(label);
                logMessage('DEBUG', category, `Timer ${label} started.`, data);
            } catch { // ✅ Исправлено: удалено 'e', чтобы избежать Warning: '_e' is defined but never used
                // If marks don't exist, just ignore.
            }
        },
        timeEnd: (label: string, message: string, data?: unknown) => {
            if (!shouldLog('DEBUG')) return;
            try {
                performance.mark(`${label}-end`);
                performance.measure(label, label, `${label}-end`);
                const measurement = performance.getEntriesByName(label)[0];
                logMessage('DEBUG', category, `${message} Time: ${measurement.duration.toFixed(2)}ms`, data);
                // Очистка меток
                performance.clearMarks(label);
                performance.clearMarks(`${label}-end`);
                performance.clearMeasures(label);
            } catch { // ✅ Исправлено: удалено 'e', чтобы избежать Warning: '_e' is defined but never used
                // If marks or measures don't exist, just ignore.
                logMessage('DEBUG', category, `${message} (Timing failed)`);
            }
        },
    };
}

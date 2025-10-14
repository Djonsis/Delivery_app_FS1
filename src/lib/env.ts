
import { isCloud } from "./config";

/**
 * Выполняет одну из двух функций в зависимости от окружения.
 * @param localFn - Функция для локального окружения (возвращает моковые данные).
 * @param dbFn - Функция для продакшен-окружения (выполняет запрос к БД).
 * @returns Результат выполнения соответствующей функции.
 */
export function runLocalOrDb<T>(localFn: () => T, dbFn: () => T): T {
    if (isCloud()) {
        return dbFn();
    }
    return localFn();
}

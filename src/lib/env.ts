import { useMockData } from "./config";
import { serverLogger } from "./server-logger";

const log = serverLogger.withCategory("ENV_HELPER");

/**
 * Универсальный helper для переключения между mock и real данными.
 * 
 * Автоматически определяет режим через useMockData() из config.ts.
 * 
 * @param mockFn - Функция, возвращающая моковые данные.
 * @param realFn - Функция, выполняющая реальный запрос к БД/API.
 * @returns Результат выполнения соответствующей функции.
 * 
 * @example
 * ```typescript
 * async function getAll(): Promise<Category[]> {
 *   return runMockOrReal(
 *     () => Promise.resolve([mockCategory]),
 *     async () => {
 *       const { rows } = await query('SELECT * FROM categories');
 *       return rows.map(mapDbRow);
 *     }
 *   );
 * }
 * ```
 */
export function runMockOrReal<T>(
  mockFn: () => T | Promise<T>,
  realFn: () => T | Promise<T>
): T | Promise<T> {
  if (useMockData()) {
    log.info("🎭 Mock mode enabled. Running mock function.");
    return mockFn();
  }
  log.info("💾 Real mode enabled. Running real function.");
  return realFn();
}

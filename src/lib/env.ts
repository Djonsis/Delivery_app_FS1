
import { serverLogger } from "./server-logger";

const log = serverLogger.withCategory("ENV");

/**
 * Определяет, развернуто ли приложение в облачной среде Google Cloud.
 * @returns {boolean} true, если код выполняется в облаке.
 */
export const isCloud = (): boolean => Boolean(process.env.K_SERVICE);

/**
 * Определяет, запущено ли приложение в локальном окружении.
 * @returns {boolean} true, если код выполняется локально.
 */
export const isLocal = (): boolean => !isCloud();

/**
 * Определяет, следует ли использовать SQLite для локальной разработки.
 *
 * Эта функция проверяет переменную окружения `USE_SQLITE_DEV`.
 * Режим SQLite активен, если `USE_SQLITE_DEV` установлено в 'true'.
 *
 * Важно: этот режим работает только в локальном окружении (`isLocal() === true`).
 * В облаке всегда будет использоваться PostgreSQL.
 *
 * @returns {boolean} Возвращает `true`, если используется SQLite, иначе `false`.
 */
export const useSqliteDev = (): boolean => {
  const useSqlite = process.env.USE_SQLITE_DEV === 'true';

  if (useSqlite && isCloud()) {
    log.warn('USE_SQLITE_DEV is ignored in cloud environment. Using PostgreSQL.');
    return false;
  }

  if (useSqlite) {
    log.info("🗄️ SQLite development mode enabled");
  }

  return useSqlite;
};

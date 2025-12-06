import { randomUUID } from "crypto";

/**
 * Результат преобразования SQL-запроса из PostgreSQL-формата в SQLite-совместимый.
 */
export interface RewriteResult {
  sql: string;
  params: any[];
}

/**
 * Преобразует SQL-запрос:
 * 
 * Выполняет следующие трансформации:
 *  1. uuid_generate_v4() → подстановка UUID + placeholder "?"
 *  2. NOW() → SQLite ISO-таймстамп через strftime(...)
 *  3. $1, $2, ... → ? (позиционные параметры SQLite)
 *
 * Пример:
 * Input SQL:
 *    INSERT INTO users (id, created_at) VALUES (uuid_generate_v4(), NOW())
 *
 * Output SQL:
 *    INSERT INTO users (id, created_at) VALUES (?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
 *
 * Output params:
 *    ['550e8400-e29b-41d4-a716-446655440000']
 */
export function rewriteSqlForSqlite(sql: string, params: any[]): RewriteResult {
  const originalParams = [...params];
  const uuidQueue: string[] = [];
  const finalParams: any[] = [];

  // 1. Заменяем uuid_generate_v4() → '?'
  let processedSql = sql.replace(/uuid_generate_v4\(\)/gi, () => {
    uuidQueue.push(randomUUID());
    return "?";
  });

  // 2. Заменяем NOW() → ISO timestamp
  processedSql = processedSql.replace(
    /NOW\(\)/gi,
    "strftime('%Y-%m-%dT%H:%M:%SZ','now')"
  );

  // 2b. Заменяем SQLite datetime('now') → ISO timestamp
  processedSql = processedSql.replace(
      /datetime\('now'\)/gi,
      "strftime('%Y-%m-%dT%H:%M:%SZ','now')"
    );

  // 3. Находим все placeholders: $1, $2, ?
  const placeholders = processedSql.match(/(\$[0-9]+)|\?/g);

  if (placeholders) {
    let paramIndex = 0; // индекс оригинальных params
    let uuidIndex = 0;  // индекс в UUID-очереди

    for (const placeholder of placeholders) {
      if (placeholder === "?") {
        // Приоритет: сначала UUID, потом реальные параметры
        if (uuidIndex < uuidQueue.length) {
          finalParams.push(uuidQueue[uuidIndex++]);
        } else if (paramIndex < originalParams.length) {
          finalParams.push(originalParams[paramIndex++]);
        }
      } else {
        // Placeholder вида $1, $2, $3...
        const idx = parseInt(placeholder.substring(1), 10) - 1;
        if (idx >= 0 && idx < originalParams.length) {
          finalParams.push(originalParams[idx]);
        }
      }
    }
  }

  // 4. Меняем $N → ? в итоговом SQL
  processedSql = processedSql.replace(/\$[0-9]+/g, "?");

  return { sql: processedSql, params: finalParams };
}

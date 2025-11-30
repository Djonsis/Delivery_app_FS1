/**
 * Парсит RETURNING-клаузу в SQL-запросе.
 *
 * Примеры:
 *  - "INSERT ... RETURNING id, email"
 *      → { cleanSql: "...", returningCols: ["id", "email"], hasReturning: true }
 *
 *  - "UPDATE products SET ... WHERE id = ?"
 *      → { cleanSql: "...", returningCols: [], hasReturning: false }
 */
export interface ReturningParseResult {
    cleanSql: string;        // SQL без RETURNING
    returningCols: string[]; // Список колонок после RETURNING
    hasReturning: boolean;   // Найдена ли RETURNING-часть
  }
  
  export function parseReturningClause(sql: string): ReturningParseResult {
    const match = sql.match(/RETURNING\s+(.*)/i);
  
    if (!match) {
      return { cleanSql: sql, returningCols: [], hasReturning: false };
    }
  
    return {
      cleanSql: sql.substring(0, match.index).trim(),
      returningCols: match[1].split(",").map(c => c.trim()),
      hasReturning: true,
    };
  }
  
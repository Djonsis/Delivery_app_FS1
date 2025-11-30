/**
 * Извлекает имя таблицы из SQL-запроса.
 *
 * Поддерживаемые конструкции:
 *  - INSERT INTO table_name ...
 *  - INSERT table_name ...
 *  - UPDATE table_name SET ...
 *  - DELETE FROM table_name ...
 *  - DELETE table_name ...
 *
 * Примеры:
 *  - "INSERT INTO users (name) VALUES ('Alice')" → "users"
 *  - "UPDATE products SET price = 100" → "products"
 *  - "DELETE FROM orders WHERE id = 1" → "orders"
 *  - "SELECT * FROM categories" → null
 *
 * @param sql SQL-запрос
 * @returns имя таблицы или null, если определить невозможно
 */
export function getTableName(sql: string): string | null {
    const match = sql.match(
      /^(?:INSERT(?:\s+INTO)?|UPDATE|DELETE(?:\s+FROM)?)\s+([a-zA-Z0-9_]+)/i
    );
    return match ? match[1] : null;
  }
  
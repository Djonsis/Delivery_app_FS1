/**
 * Преобразует параметры SQL-запроса в SQLite-совместимый формат.
 *
 * SQLite не имеет нативных типов:
 *  - массивы
 *  - объекты
 *
 * Поэтому такие значения необходимо сериализовать в JSON.
 *
 * Что делает функция:
 *  - null / undefined  → оставляет как есть
 *  - Date              → оставляет как есть
 *  - массивы/объекты   → JSON.stringify(...)
 *  - примитивы         → оставляет как есть
 *
 * Примеры:
 *   [1, 2, 3]               → "[1,2,3]"
 *   { name: "Alice" }       → "{\"name\":\"Alice\"}"
 *   new Date()              → Date (без изменений)
 *   true                    → true
 *   "hello"                 → "hello"
 */
export function normalizeParams(params: any[]): any[] {
    return params.map((param) => {
      // null / undefined — оставляем
      if (param === null || param === undefined) {
        return param;
      }
  
      // Date оставляем (пусть драйвер сам хранит ISO строку)
      if (param instanceof Date) {
        return param;
      }
  
      // Массивы и plain-объекты — сериализуем
      if (Array.isArray(param) || isPlainObject(param)) {
        return JSON.stringify(param);
      }
  
      // string, number, boolean, bigint — оставляем
      return param;
    });
  }
  
  /**
   * Проверяет, является ли значение "простым" объектом.
   * (исключаем Date, Map, Set, классы, прототипы и т.д.)
   */
  function isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && value.constructor === Object;
  }
  
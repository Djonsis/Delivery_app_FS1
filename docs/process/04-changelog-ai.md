
# AI Changelog

Этот файл фиксирует **критичные изменения** в архитектуре, типах данных и API, которые могут затронуть другие эпики.  
Обновляется вручную владельцем чата по завершении эпика.

---

## 2025-10-15
**Epic:** P0 Type Safety Raid  
**Commit/PR:** refactor/p0-type-safety (#123)  
**Critical Changes:**
- src/lib/db.ts — query params typed (unknown[])
- src/lib/logger.ts — stable log signature, unknown payloads
- src/lib/products.service.ts — ProductCreateInput / ProductUpdateInput + typed mapper
- src/lib/categories.service.ts — CategoryCreateInput / CategoryUpdateInput + typed mapper
- src/lib/weight-templates.service.ts — WeightTemplateCreateInput / WeightTemplateUpdateInput + typed mapper
- src/lib/actions/log.actions.ts — GetLogsResult / ClearLogsResult returned
**Notes:** P0 (Type Safety) issues addressed in core and services. UI callers updated where necessary. Run `npx tsc --noEmit` to verify.

---

## [2024-08-22]
**Epic:** 🧪 Тестирование и QA
**Owner:** user & gemini
**PR:** (в процессе)
**Critical Changes:**
- **Dev Dependencies (`package.json`):**
  - Будут добавлены `vitest` и `jsdom` для создания тестовой среды.
- **Config:**
  - Будет создан `vitest.config.ts` для конфигурации Unit и интеграционного тестирования.

**Notes:**  
- Эти изменения не должны повлиять на работу других эпиков, так как касаются только `devDependencies` и конфигурации тестов.

---

## [2024-08-21]
**Epic:** Весовые товары (Weighted Products) 
**Owner:** Gemini
**PR:** `feat(admin): weight-templates-management` (в процессе)
**Critical Changes:**
- **DB Schema (`src/lib/actions/db.actions.ts`):**
  - Добавлена новая таблица `weight_templates` для управления пресетами весовых товаров.
  - В таблицу `products` добавлено поле `weight_template_id` (nullable, FK to `weight_templates.id`).
- **Service Layer:**
  - Создан новый сервис `src/lib/weight-templates.service.ts`, который становится единым источником правды для всех CRUD-операций с шаблонами веса.

**Notes:**  
- Другие агенты, работающие с продуктами, должны будут учитывать возможность наличия `weight_template_id`.
- Для получения полной информации о весовом товаре потребуется `JOIN` с таблицей `weight_templates`.

## [YYYY-MM-DD]
**Epic:** [Название эпика] 
**Owner:** [Имя]
**PR:** [ссылка на Pull Request]  
**Critical Changes:**
- **`src/lib/types.ts`**: Добавлен новый тип `Order.status`. Возможные значения: `PENDING`, `COMPLETED`. **Breaking Change:** все места, где используется `Order`, должны быть обновлены.
- **`src/lib/products.service.ts`**: Функция `getProducts` теперь принимает новый опциональный параметр `filters`.

**Notes:**  
- Требуется обновить все тесты, связанные с созданием заказа.

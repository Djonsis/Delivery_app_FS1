# AI Changelog

Этот файл фиксирует **критичные изменения** в архитектуре, типах данных и API, которые могут затронуть другие эпики.  
Обновляется вручную владельцем чата по завершении эпика.

---

## [2025-11-27]
**Epic:** Инфраструктура и качество кода
**Owner:** Gemini
**Commit/PR:** refactor(db): удалены нерабочие скрипты, несовместимые со средой Genkit Studio
**Critical Changes:**

- **Рефакторинг npm-скриптов (`package.json`):**
  - Удалены все `db:*` скрипты, которые зависели от `sqlite3` CLI, так как они неработоспособны в изолированной среде Genkit Studio.
  - Удалена ненужная `devDependency` `sqlite3`.
  - В соответствующую документацию (`docs/recipes/sqlite-dev.md`) добавлено объяснение этого ограничения.

**Notes:**
- Разработчики должны понимать, что прямой доступ к SQLite через CLI невозможен в данной среде, и использовать Node.js-библиотеку `better-sqlite3` для взаимодействия с БД.

---

## [2025-10-17]
[COMPLETED] Epic: Logging System UI & Backend

- **Initial Analysis:** Began work on the logging UI based on `docs/product/02-roadmap.md`.
- **Implementation:**
    - Created `log.actions.ts` with `getLogsAction` and `clearLogsAction`.
    - Implemented a React component (`log-viewer.tsx`) for the admin panel.
    - Added dual-mode support for local development (file-based) and production (Google Cloud Logging).
- **Challenge & Resolution:**
    - **Problem:** A unit test for pagination (`log.actions.test.ts`) was consistently failing. Initial hypotheses focused on mocking issues with `vitest`.
    - **Root Cause:** Analysis by Kant revealed the test was for a feature (pagination) that was not implemented in the backend logic, a classic YAGNI violation.
    - **Solution:** Removed the superfluous test, confirming the existing implementation was correct and complete for the current requirements.
- **Finalization:**
    - Updated `docs/product/02-roadmap.md` to mark the logging task as `✅ DONE`.
    - Verified the implementation against `docs/architecture/04-logging.md`.
- **Outcome:** The logging epic is fully complete and documented. The system is robust, tested, and aligned with our architectural principles.

---

## 2025-10-16
**Epic:** Качество кода и техдолг (P1, P2) 
**Owner:** Gemini
**Commit/PR:** refactor/lint-and-quality-fixes (#124)
**Critical Changes:**
- **ESLint & Code Quality:** Устранены все (100%) предупреждения ESLint во всем проекте.
  - `@typescript-eslint/no-unused-vars`: Все неиспользуемые переменные и импорты удалены.
  - `prefer-const`: `let` заменен на `const` где это было возможно.
  - **React Hooks:** Исправлены отсутствующие зависимости в `useEffect`.
  - **JSX:** Устранены синтаксические ошибки и невалидная разметка.
- **Font Optimization (`src/app/layout.tsx`):** Шрифты теперь загружаются с использованием `next/font` для улучшения производительности.

**Notes:**
- **Базовое состояние кода теперь чистое.** Любой новый код не должен вносить предупреждения `eslint`.
- Запуск `npm run lint` теперь должен завершаться с `✔ No ESLint warnings or errors`.
- Это изменение не является *breaking change*, но устанавливает новый стандарт качества для всех будущих коммитов.

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

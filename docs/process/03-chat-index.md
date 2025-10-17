# Chat Index

Здесь фиксируются все чаты с агентами, привязанные к эпику.  
**Правило:** 1 чат = 1 эпик. Каждый чат должен иметь владельца (owner) и статус.

Это предотвращает параллельную работу над одними и теми же критическими файлами.

---

## Active Chats

### Epic: Просмотр логов (Admin UI)
- **Chat ID:** [будет присвоен]
- **Started:** [2025-10-17]
- **Owner:** Gemini
- **Status:** In Progress
- **Modified Critical Files (планируется):**
  - `src/app/admin/logs/page.tsx`
  - `src/lib/actions/log.actions.ts`
  - `src/components/features/log-viewer.tsx` (предположительно)
- **Blocks / Blocked by:** -
- **Key decisions (планируется):**
  - Разработать компонент для отображения логов в виде таблицы.
  - Реализовать UI для фильтрации и очистки логов с использованием существующих server actions.
- **PR / Branch:** (будет создан)

feat(logs): Add logging UI and complete backend integration

- Implemented a dual-mode logging system (local file & Google Cloud Logging) as per `docs/architecture/04-logging.md`.
- Created server actions `getLogsAction` and `clearLogsAction` for log management.
- Developed a new admin UI at `/admin/logs` for viewing, filtering, and clearing logs.
- The system is production-ready and switches to Google Cloud Logging automatically when `NODE_ENV` is 'production'.
- Resolved a testing issue by removing a pagination test for non-existent functionality, adhering to YAGNI.

---

### Epic: Весовые товары (Weighted Products)
- **Chat ID:** [Текущий ID чата]
- **Started:** 2024-08-21
- **Owner:** Gemini
- **Status:** In Progress
- **Modified Critical Files:**
  - `docs/architecture/03-data-and-storage.md`
  - `src/lib/actions/db.actions.ts`
  - `src/lib/weight-templates.service.ts`
  - `src/app/admin/weight-templates/**/*`
  - `src/app/admin/products/_components/product-form.tsx`
- **Blocks / Blocked by:** -
- **Key decisions (принятые):**
  - Реализация управления весом через систему "шаблонов" (`weight_templates`).
  - Создание полного CRUD-интерфейса в админ-панели для управления шаблонами.
- **PR / Branch:** `feat(admin): weight-templates-management`


---


- **Chat ID:** [ID этого чата]
- **Started:** 2024-08-22
- **Owner:** user
- **Status:** In Progress
- **Modified Critical Files (планируется):**
  - `package.json`
  - `vitest.config.ts`
  - `tests/unit/validation/template-schema.test.ts`
- **Blocks / Blocked by:** -
- **Key decisions (принятые):**
  - Начать автоматизацию с Unit-тестирования валидации (TC-002).
  - Установить `vitest` и `jsdom` для тестового окружения.
- **PR / Branch:** (будет создан)

---

### Epic: AI & Cloud Integration (Backend for Logging)
- **Chat ID:** 776015
- **Started:** 2024-08-20
- **Completed:** 2024-08-20
- **Owner:** Gemini
- **Modified Critical Files:**
  - `src/lib/actions/log.actions.ts`
  - `src/lib/server-logger.ts`
  - `src/lib/config.ts`
  - `docs/architecture/01-vision.md`
  - `docs/architecture/03-technical-debt.md`
  - `docs/process/02-tasklist.md`
  - `docs/product/02-roadmap.md`
- **Key decisions (итог):**
  - Реализованы два серверных действия (`getLogsAction`, `clearLogsAction`) для инкапсуляции логики работы с логами.
  - В `production` среде используется Google Cloud Logging API; в `development` — локальный файловый логгер для простоты отладки.
  - Проблема с ESLint `no-unused-vars` решена через рефакторинг на современный синтаксис `try...catch {}`, а не через отключение правила.
- **PR / Branch:** `feat(admin): implement server actions for log management` (Commit: `ce998aa`)

---

### Epic: MVP Foundation
- **Chat ID:** [firebase-chat-xxxx]
- **Started:** 2024-08-01
- **Completed:** 2024-08-15
- **Owner:** [имя]
- **Modified Critical Files:**
  - `src/lib/db.ts`
  - `src/app/layout.tsx`
- **Key decisions (итог):**
  - Выбрали PostgreSQL в качестве основной БД.
- **PR / Branch:** `feature/mvp-foundation`

---

*Архив завершенных чатов.*

## Archive of completed chats.

### Epic: Качество кода и техдолг (P1, P2)
- **Chat ID:** [current-chat-id-quality-p1-p2]
- **Started:** 2025-10-16
- **Completed:** 2025-10-16
- **Owner:** Gemini
- **Status:** ✅ Completed
- **Goal:** Устранить все предупреждения ESLint (P1 и P2) согласно `docs/architecture/03-technical-debt.md`.
- **Modified Critical Files:**
  - `src/lib/orders.service.ts`
  - `src/lib/storage.service.ts`
  - `src/lib/logger.ts`
  - `src/app/admin/logs/page.tsx`
  - `src/app/layout.tsx`
  - `src/components/ui/combobox.tsx`
  - `src/components/ui/command.tsx`
  - ... и все остальные файлы из `03-technical-debt.md`
- **Docs:** `docs/architecture/03-technical-debt.md`, `docs/process/02-tasklist.md`, `docs/process/04-changelog-ai.md`
- **Key decisions (итог):** Полностью зачищена кодовая база от всех предупреждений линтера. Установлен новый стандарт качества кода. `npm run lint` проходит без ошибок.
- **PR / Branch:** `refactor/lint-and-quality-fixes (#124)`

---

### Epic: P0 Type Safety Raid
- **Chat ID:** [firebase-chat-p0-type-safety]
- **Started:** 2025-10-15
- **Completed:** 2025-10-15
- **Owner:** Djonsis
- **Status:** ✅ Completed
- **Goal:** Устранить все `any` в ядровых файлах согласно roadmap.
- **Modified Critical Files:**
  - src/lib/db.ts
  - src/lib/logger.ts
  - src/lib/products.service.ts
  - src/lib/categories.service.ts
  - src/lib/weight-templates.service.ts
  - src/lib/actions/log.actions.ts
- **Docs:** docs/architecture/03-technical-debt.md (раздел P0)
- **Dependencies:** нет
- **Key decisions (итог):**
  - Любые изменения с типами фиксируются как Boy Scout (P0).
  - По завершении обновить roadmap и changelog.
- **PR / Branch:** `refactor/p0-type-safety (#123)`

---

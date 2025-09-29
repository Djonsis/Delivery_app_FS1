# Chat Index

Здесь фиксируются все чаты с агентами, привязанные к эпику.  
**Правило:** 1 чат = 1 эпик. Каждый чат должен иметь владельца (owner) и статус.

Это предотвращает параллельную работу над одними и теми же критическими файлами.

---

## Active Chats
*В этом разделе находятся чаты, которые сейчас в работе.*

### Epic: [НАЗВАНИЕ ЭПИКА]
- **Chat ID:** [ссылка или ID чата]
- **Started:** [YYYY-MM-DD]
- **Owner:** [имя]
- **Status:** Planning | In Progress | Blocked
- **Modified Critical Files:**
  - `src/lib/types.ts`
- **Blocks / Blocked by:** [ID другого чата или задача]
- **Key decisions (принятые):**
  - Решили использовать Zod для валидации.
- **PR / Branch:** [url или название ветки]

---

## Completed Chats
*Архив завершенных чатов.*

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

# 📋 Technical Debt Roadmap

> **Статус:** Актуально на 17 октября 2025  
> **Источник:** Результаты `npm run lint --strict`  
> **Общий объем:** 0 предупреждений (но есть регрессия)
> **Ответственный за актуализацию:** Tech Lead / Gemini 
> **Частота обновления:** Еженедельно

---

## 🧭 Правило бойскаута (Boy Scout Rule)

> "Always leave the campground cleaner than you found it."

Каждый разработчик, работая над файлом, должен оставить его **чуть лучше**, чем он был до правок. Исправляйте линтерные предупреждения и типовые проблемы в тех файлах, которые вы уже редактируете. Это культура постепенного улучшения кода, которая предотвращает накопление технического долга.

---

## 🎯 Стратегия погашения

Следуем **"Правилу бойскаута"**: исправляем долг в файлах, которые редактируем по основной задаче. Для фиксации используем стандартные commit-сообщения, например `refactor(core): ...` или `chore(lint): ...`.

---

## ✅ P0 - Critical (Hotfix) - РЕШЕНО

- **[РЕШЕНО] P0 - Восстановить mock-режим для локальной разработки:**
  - **Проблема:** Сервисы данных были жестко привязаны к проверке `isCloud()`, что делало невозможным использование мок-данных в облачных средах для тестирования и усложняло локальную разработку.
  - **Решение:** Внедрена переменная окружения `MOCK_CATEGORIES`. Управление режимом вынесено в npm-скрипты: `npm run dev:mock` (для UI-разработки) и `npm run dev:real` (для интеграционного тестирования). Это обеспечивает гибкое переключение без изменения кода или `.env` файлов.
  - **Статус:** ✅ Решено.
  - **Документация:** Процесс описан в `docs/process/01-workflow.md`.

---

## ✅ P0 — Type Safety (Critical)

**Status:** ✅ Closed (2025-10-15, PR #123)
**Notes:** Установлена базовая типобезопасность. Новые изменения не должны вносить `any` без обоснования.

---

## ✅ P1 — Lint Hygiene (High Priority)

**Status:** ✅ Closed (2025-10-16, by Gemini)
**Notes:** Все предупреждения, связанные с неиспользуемыми переменными и импортами, устранены.

### A. `@typescript-eslint/no-unused-vars` (10 файлов)

| Файл | Статус |
|------|--------|
| `src/app/admin/status/page.tsx` | ✅ |
| `src/app/admin/weight-templates/_components/template-form.tsx`| ✅ |
| `src/app/api/products/categories/route.ts` | ✅ |
| `src/components/product-catalog.tsx` | ✅ |
| `src/contexts/cart-context.tsx` | ✅ |
| `src/hooks/use-toast.ts` | ✅ |
| `src/lib/db.ts` | ✅ |
| `src/lib/logger.ts` | ✅ |
| `src/lib/orders.service.ts` | ✅ |
| `src/lib/storage.service.ts` | ✅ |

---

## ✅ P2 — React & UI Polish (Medium Priority)

**Status:** ✅ Closed (2025-10-16, by Gemini)
**Notes:** Проблемы с React Hooks и синтаксисом JSX были исправлены.

### React Hooks & JSX

| Файл | Статус |
|------|--------|
| `src/app/admin/logs/page.tsx` | ✅ |
| `src/components/ui/combobox.tsx` | ✅ |
| `src/components/ui/command.tsx` | ✅ |
| `src/app/layout.tsx` | ✅ |

---

## 🛠 Инструменты

```bash
# Проверка прогресса
npm run lint

# Автоматическое исправление (где возможно)
npm run lint -- --fix

# Проверка типов
npx tsc --noEmit

# Анализ покрытия типами
npx type-coverage --detail
```

---

*Этот документ отражает текущее состояние кодовой базы. Новые проблемы могут выявляться по мере развития проекта.*
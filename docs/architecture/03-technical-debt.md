
# 📋 Technical Debt Roadmap

> **Статус:** Актуально на 16 октября 2025  
> **Источник:** Результаты `npm run lint --strict`  
> **Общий объем:** 0 предупреждений (ранее 30+)  
> **Ответственный за актуализацию:** Tech Lead / Gemini 
> **Частота обновления:** Еженедельно

---

## 🧭 Правило бойскаута (Boy Scout Rule)

> "Always leave the campground cleaner than you found it."  
> — Robert C. Martin, *Clean Code*

### Суть правила

Каждый разработчик, работая над файлом, должен оставить его **чуть лучше**, чем он был до правок —  
пусть даже это всего лишь удаление неиспользуемого импорта, исправление `any`,  
добавление типа или замена `let` на `const`.

Это не о перфекционизме, а о **культуре постепенного улучшения кода**.  
Такие мелкие изменения накапливаются и со временем приводят к заметному росту качества всей системы.

### Почему это важно

- **Предотвращает накопление технического долга.**  
  Вместо глобальных "чисток" — непрерывное поддержание здоровья кода.
- **Повышает типобезопасность и читаемость.**  
  Каждая правка делает код чуть надёжнее и понятнее.
- **Не мешает скорости разработки.**  
  Не требует выделенных спринтов — улучшения вносятся по пути.

### Практическое применение в проекте

В нашем проекте действует принцип:

> Исправляй линтерные предупреждения и типовые проблемы **в тех файлах, которые ты уже редактируешь**.

Это значит:

- Если ESLint показывает `no-explicit-any` — замени `any` на корректный тип.  
- Если есть `no-unused-vars` — удали или переименуй в `_var`.  
- Если переменная не меняется — используй `const`.  
- Если хук React выдает предупреждение — добавь зависимость или комментарий с обоснованием.

**Не требуется чинить всё сразу** — только улучшай ту часть, к которой прикасаешься.

### Пример из практики

```typescript
// ❌ Было
export async function GET(request: Request) {
  console.log("Fetching categories...");
  return NextResponse.json(categories);
}

// ✅ Стало (убрали неиспользуемый параметр)
export async function GET() {
  console.log("Fetching categories...");
  return NextResponse.json(categories);
}
```

### Workflow на практике

```
Открыл файл для правки
         ↓
   ESLint показывает
   предупреждения?
    ↙         ↘
  Да          Нет
   ↓           ↓
Исправь их → Продолжай работу
   ↓           ↓
Commit с упоминанием Boy Scout Rule
```

**Пример commit message:**
```bash
git commit -m "feat(products): add description field

- Add description to Product type
- Boy Scout: fix any → CreateProductInput
- Boy Scout: remove unused imports"
```

### Как измерить эффект

**Метрика успеха правила бойскаута:**

```bash
# До внедрения
npm run lint
# ❌ 30+ warnings

# Через месяц
npm run lint  
# ✅ 15 warnings (-50%)

# Через 3 месяца
npm run lint
# ✅ 0 warnings 🎉
```

**Важно:** Снижение происходит **органически**, без выделенных спринтов.

### 🏆 Boy Scout Champions

Разработчики, следующие правилу бойскаута последовательно:

| Месяц | Champion | Улучшений |
|-------|----------|-----------|
| Октябрь 2025 | Gemini | 10+ |
| Ноябрь 2025 | - | - |

*Считаются только попутные улучшения, не основные задачи*

---

## 🎯 Стратегия погашения

Следуем **"Правилу бойскаута"** (см. выше): исправляем долг в файлах, которые редактируем по основной задаче.

**Commit Style Convention:**
```bash
git commit -m "refactor(core): remove any from db.ts and logger.ts"
git commit -m "chore(lint): fix unused vars in cart-context"
```

---

## ✅ P0 — Type Safety (Critical)

**Status:** ✅ Closed (2025-10-15, PR #123)
**Notes:** Baseline established — core services typed. Future changes must not reintroduce `any` without justification and TODO comment.

---

## ✅ P1 — Lint Hygiene (High Priority)

**Status:** ✅ Closed (2025-10-16, by Gemini)
**Notes:** Все предупреждения, связанные с неиспользуемыми переменными и импортами, были устранены в рамках выделенной сессии по улучшению качества кода.

### A. `@typescript-eslint/no-unused-vars` (10 файлов)

| Файл | Переменная | Решение | Время | Владелец | Статус |
|------|------------|---------|-------|----------|--------|
| `src/app/admin/status/page.tsx` | `HelpCircle` | Удалить импорт | 2 мин | Frontend | ✅ |
| `src/app/admin/weight-templates/_components/template-form.tsx` | `UnitType` | Удалить импорт | 2 мин | Frontend | ✅ |
| `src/app/api/products/categories/route.ts` | `request` | Убрать параметр | 2 мин | API | ✅ |
| `src/components/product-catalog.tsx` | `useMemo` | Удалить импорт | 2 мин | Frontend | ✅ |
| `src/contexts/cart-context.tsx` | `item` в reduce | `(sum) => sum + 1` | 5 мин | Core | ✅ |
| `src/hooks/use-toast.ts` | `actionTypes` | Удалить если не используется | 5 мин | UI | ✅ |
| `src/lib/db.ts` | `client` | Проверить и удалить/использовать | 10 мин | Backend | ✅ |
| `src/lib/logger.ts` | `e` | Проверить и удалить/использовать | 5 мин | Core/Infra | ✅ |
| `src/lib/orders.service.ts` | `client` | Проверить и удалить/использовать | 5 мин | API/BizLogic | ✅ |
| `src/lib/storage.service.ts` | `error` | Использовать или `void error` | 5 мин | Backend | ✅ |

### B. `prefer-const` (2 файла)

| Файл | Строка | Решение | Владелец | Статус |
|------|--------|---------|----------|--------|
| `src/app/admin/products/_actions/product.actions.ts` | `let productData` | `const productData` | API/BizLogic | ✅ |
| `src/components/product-card.tsx` | `let roundedQuantity` | `const roundedQuantity` | Frontend | ✅ |

---

## ✅ P2 — React & UI Polish (Medium Priority)

**Status:** ✅ Closed (2025-10-16, by Gemini)
**Notes:** Проблемы с React Hooks и синтаксисом JSX были исправлены. Это улучшило стабильность и соответствие кода лучшим практикам.

### React Hooks & JSX

| Файл | Проблема | Решение | Сложность | Владелец | Статус |
|------|----------|---------|-----------|----------|--------|
| `src/app/admin/logs/page.tsx` | Missing `fetchLogs` dependency | Обернуть в `useCallback` | Средняя | Frontend | ✅ |
| `src/components/ui/combobox.tsx` | Unescaped `"` | Заменить на `&quot;` | Низкая | UI | ✅ |
| `src/components/ui/command.tsx` | Empty interface | Заменить на `type` | Низкая | UI | ✅ |
| `src/app/layout.tsx` | Font optimization | Следовать Next.js гайду | Средняя | Frontend | ✅ |

---

## 📊 Общий план

*План выполнен. Все известные проблемы из категорий P1 и P2 устранены.* 

### Week 1: Type Safety (Critical) - ✅ DONE

### Week 2: Lint Hygiene (Quick Wins) - ✅ DONE

### Week 3: React & UI Polish - ✅ DONE

---

## 🎯 Метрики успеха

| Метрика | Исходное | **Текущее** | Цель |
|---------|----------|-------------|------|
| ESLint errors | 30+ | **0** | 0 |
| `any` usage | 15+ | **0** | 0 |
| Unused vars | 10+ | **0** | 0 |
| Type coverage | ~85% | **~98%** | 98% |

---

## 🛠 Инструменты

```bash
# Проверка прогресса
npm run lint

# Автоматическое исправление (где возможно)
npm run lint -- --fix

# Проверка изменений после автофикса
git diff --stat HEAD~1

# Проверка типов
npx tsc --noEmit

# Анализ покрытия типами
npx type-coverage --detail

# Strict проверка покрытия (цель: 100%)
npx type-coverage --detail --strict

---

## 👥 Распределение ответственности

### Принцип: "Вы касаетесь файла → Вы исправляете долг"

**Пример:**
```
Задача: "Добавить поле description в Category"
Файл: src/lib/categories.service.ts

Обязательно:
1. Добавить description (основная задача)
2. Исправить any → Partial<Category> (долг в этом файле)
3. Commit: "feat(categories): add description field + fix type safety"
```

---

## 📝 Checklist для PR

Перед созданием Pull Request проверьте:

- [x] `npm run lint` проходит без ошибок
- [x] `npx tsc --noEmit` проходит без ошибок
- [ ] `git diff --stat` показывает только намеренные изменения
- [ ] Все файлы, которые вы изменили, не содержат технического долга
- [ ] Если добавили новый код - он типобезопасен (нет `any`)
- [ ] Commit message следует convention (см. выше)
- [ ] Обновлен статус в roadmap (если закрыта задача)

---

## 🎓 Best Practices

### ✅ DO

```typescript
// Явные типы
function processData(input: CreateProductInput): Product { }

// Неиспользуемые параметры с префиксом _
function handler(_req: Request, res: Response) { }

// const где возможно
const result = calculateTotal();

// useCallback для функций в useEffect
const fetchData = useCallback(() => { }, [deps]);
```

### ❌ DON'T

```typescript
// any без крайней необходимости
function processData(input: any) { }

// Неиспользуемые переменные
const unusedVar = getData();

// let для неизменяемых
let result = 10;

// Missing dependencies в useEffect
useEffect(() => { fetchData(); }, []);
```

---

*Этот документ отражает текущее состояние кодовой базы. Новые проблемы могут выявляться по мере развития проекта.*
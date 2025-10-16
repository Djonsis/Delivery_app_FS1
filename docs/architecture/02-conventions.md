# 🏗 Code Conventions v2.0

Этот документ содержит ключевые правила для AI-ассистента при генерации и модификации кода. Цель — поддержание высокого качества, консистентности и следование архитектурному видению проекта, описанному в `docs/architecture/01-vision.md`.

## 🔥 Общие принципы

1. **Следовать Vision**: Всегда придерживаться архитектуры, технологий и принципов, изложенных в `docs/architecture/01-vision.md`.
2. **Лаконичность и ясность**: Код должен быть чистым, хорошо структурированным и самодокументируемым. Избегать лишних комментариев.
3. **Безопасность в приоритете**: Всегда помнить о безопасности, особенно при обработке пользовательского ввода и работе с секретами.
4. **Производительность**: Предпочитать решения, которые обеспечивают высокую производительность, в соответствии с принципами Next.js App Router (Серверные компоненты, Server Actions).

---

## 🚨 Строгие запреты (CRITICAL)

### ❌ **Абсолютные запреты**
1. **НИКОГДА не изменять `.env`**: Файл `.env` предназначен только для локальной разработки пользователя. Не читать и не изменять его.
2. **Генерировать код только по команде**: Приступать к генерации кода можно только после явного согласования предложенного решения и получения команды на реализацию.
3. **Никаких бинарных файлов**: Не генерировать изображения, иконки (кроме SVG), архивы или любые другие нетекстовые файлы.
4. **Запрет прямых проверок окружения**: НИКОГДА не использовать `process.env.K_SERVICE` напрямую в коде — только через централизованный helper.

---

## 🌍 Environment & Configuration

**Централизованный helper (обязательно):**
```ts
// src/lib/env.ts
export const isCloud = (): boolean => Boolean(process.env.K_SERVICE);
export const isLocal = (): boolean => !isCloud();
```

**Правила работы с окружением:**
- ✅ Только через `isLocal()` / `isCloud()` во всех сервисах
- ❌ ЗАПРЕТ на `process.env.K_SERVICE` напрямую в бизнес-логике
- ❌ НИКОГДА не изменять `.env` файл
- ✅ `.env.local` — можно редактировать локально для экспериментов
- ✅ Production секреты — только через Google Secret Manager
- ✅ В CI — через secret injection
- ❌ Никаких plain text паролей/ключей в коде и логах

---

## 🧼 Code Quality & Technical Debt

### "Правило бойскаута" (The Boy Scout Rule) — ОБЯЗАТЕЛЬНО К ИСПОЛНЕНИЮ

> "Always leave the campground cleaner than you found it."

**Принцип:** Каждый раз, когда вы работаете с файлом (для любой задачи), вы обязаны оставить его в лучшем состоянии, чем он был до вас.

**Практическое применение:**
- **Исправляйте предупреждения линтера:** Если ESLint подсвечивает `any`, `unused-vars`, `let` вместо `const` — исправьте это.
- **Улучшайте читаемость:** Переименуйте переменную, чтобы она была понятнее, или добавьте недостающий тип.
- **Не создавайте новый долг:** Весь новый код должен быть чистым и типобезопасным.

Это не требует отдельных задач на рефакторинг, а является частью ежедневной работы.

**Полная стратегия, список текущих проблем и метрики описаны в основном документе по техническому долгу.**

➡️ **Подробности см. в:** `docs/architecture/03-technical-debt.md`

---

## 🤖 AI-generated Code Rules

**Строгий workflow (обязательный чеклист):**

### Перед генерацией кода:
1. ✅ Согласование архитектурного решения (описание + ссылка на issue)
2. ✅ Получение явной команды "можно генерировать код"
3. ✅ Понимание требований к тестированию

### Во время генерации:
4. ✅ Генерация unit тестов для новых модулей (покрытие ≥80%)
5. ✅ Обновление документации (`README.md`/`docs/`) при необходимости
6. ✅ Соблюдение всех архитектурных правил

### После генерации:
7. ✅ Проверка ESLint + TypeScript + тесты проходят
8. ✅ Пометка PR: `ai-generated: true` + модель (gpt-4, claude-3.5, etc.)
9. ✅ Заполнение PR template с обоснованием изменений
10. ✅ Обязательный human review + approve от senior инженера

### Запрещено AI:
- ❌ Изменение инфраструктурных файлов (`.yaml`, `.json` configs)
- ❌ Изменение секретов и переменных окружения
- ❌ Merge без human approve
- ❌ Генерация бинарных файлов

---

## 🏗 Архитектура (строго по `01-vision.md`)

### Трехслойная архитектура:
1. **UI Layer**: React компоненты в `/components`
2. **Actions & Services Layer**: Server Actions и сервисы в `/src/lib/services`
3. **Data Access Layer**: Database queries и внешние API

### Правила:
- ✅ UI-компоненты НЕ должны напрямую обращаться к БД
- ✅ Вся бизнес-логика в Server Actions и сервисах
- ✅ Server Components by default, Client Components — только при необходимости

### Структура компонентов:
```
/components/ui/          # ShadCN UI компоненты
/components/features/    # Бизнес компоненты  
/lib/hooks/             # Переиспользуемые хуки
/lib/services/          # Бизнес-логика и API calls
```

---

## 🎨 UI/UX Rules

### Стилизация (обязательно):
- ✅ **Только ShadCN UI** компоненты (`/components/ui`) везде, где возможно
- ✅ **Tailwind CSS** с переменными из `globals.css`
- ✅ **Семантические цвета**: `text-destructive` вместо `text-red-500`
- ❌ ЗАПРЕТ жестко заданных цветов

### Иконки:
- ✅ **Только lucide-react**: `import { IconName } from "lucide-react"`
- ✅ **Проверка существования**: Убедиться, что иконка есть в библиотеке перед использованием
- ❌ Никаких других иконочных библиотек

---

## 📊 Data & Types

### TypeScript (строго):
- ✅ **Всегда TypeScript** — никаких any
- ✅ **Ключевые сущности** (Product, Order, Category) из `src/lib/types.ts`
- ✅ Обновление типов при изменении структур данных

### Mock Data Pattern:
```ts
// В каждом сервисе обязательна поддержка моков
export async function getProducts(): Promise<Product[]> {
  if (isLocal()) {
    return mockProducts; // из src/lib/mock-data.ts
  }
  
  // реальный API call
  return await db.products.findMany();
}
```

**Правила для Mock данных:**
- ✅ Обязательная поддержка `isLocal()` режима во всех сервисах
- ✅ Mock-данные должны быть реалистичными и полными
- ✅ При добавлении новых полей — обновлять моки в `src/lib/mock-data.ts`

---

## 📦 Import Rules (client/server split)

### ESLint правило (обязательно):
```json
"no-restricted-imports": ["error", {
  "patterns": [
    {
      "group": ["@/lib/server-*", "**/server-*"], 
      "message": "Server-only modules are forbidden in client code"
    }
  ]
}]
```

### Правила импорта:
- ✅ Server код → только в `src/lib/server-*`
- ❌ Client код НЕ МОЖЕТ импортировать серверные модули
- ✅ Общий код → в `src/lib/` (без префикса server-)

---

## 📋 Logging Rules

### Обязательные паттерны:
```ts
// Клиентский код
import { logger } from \'@/lib/logger\';
const log = logger.withCategory(\'COMPONENT_NAME\');

// Серверный код  
import { serverLogger } from \'@/lib/server-logger\';
const log = serverLogger.withCategory(\'SERVICE_NAME\');
```

### Правила логирования:
- ✅ **Всегда** создавать логгеры с осмысленными категориями
- ✅ **Структурированные логи** в JSON формате
- ✅ Прокидывать `requestId` через middleware (для будущего)
- ❌ **НИКОГДА** `console.log` в продакшене
- ❌ **НИКОГДА** логировать PII/секреты

---

## 🧪 Testing Rules

### Обязательные требования:
- ✅ **Unit-тесты** для новой бизнес-логики (обязательно)
- ✅ **Покрытие новых файлов ≥80%**, общее ≥60%
- ✅ **Integration tests** для сервисного уровня (с mock DB)
- ✅ **E2E smoke-тесты** для критических сценариев (auth, payment, checkout)

### Инструменты:
- **Unit**: Vitest / Jest для TypeScript
- **E2E**: Playwright  
- **Coverage**: встроенные инструменты

### CI Requirements:
- ❌ **CI блокирует merge** без тестов для новых сервисов
- ✅ Обязательные проверки: `typecheck OK` + `tests passed`

---

## 🔐 Security & Secrets

### Секреты:
- ❌ **НИКОГДА** не коммитить секреты в репозиторий
- ✅ Используем **Google Secret Manager** для production
- ✅ Локально — только `.env.local` для экспериментов
- ✅ **SCA scanning**: автоматический Snyk/Dependabot в CI
- ❌ Блок на merge при уязвимостях высокого уровня

### Обработка ошибок:
- ❌ **Не глотать ошибки** — всегда логировать и возвращать контролируемую ошибку
- ✅ Для внешних API — retry с экспоненциальной задержкой
- ✅ Для платежей — идемпотентность и circuit breaker

---

## 🗄 Database & Migrations  

### Правила работы с БД:
- ✅ **Все изменения схемы** — через миграции (Prisma Migrate)
- ❌ **ЗАПРЕТ** изменения структуры таблиц в коде без миграции
- ✅ **Обязательно** тестировать миграции
- ✅ Версионирование: `migrations/` должна быть часть PR

---

## 📝 PR & Commit Rules

### PR Template (обязательный):
\`\`\`markdown
## 📋 Описание
Краткое описание изменений.

## 🔗 Issue  
Closes: #ISSUE_NUMBER

## ✅ Что сделано
- Пункт 1
- Пункт 2

## 🧪 Как тестировать
1. Шаг 1
2. Шаг 2

## ⚙️ Checklist
- [ ] ✅ ESLint пройден
- [ ] ✅ TypeScript build успешен  
- [ ] ✅ Unit tests написаны и проходят
- [ ] ✅ Integration tests (если применимо)
- [ ] ✅ Документация обновлена
- [ ] 🤖 `ai-generated: yes/no` + модель

## 🚨 Risks & Breaking Changes
Описать потенциальные риски и breaking changes.
\`\`\`

### Commit Message Format:
```
type(scope): subject

feat(products): add weight category handling
fix(ui): correct button padding in mobile
docs(readme): update installation guide  
test(services): add unit tests for payment flow
```

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`

---

## 🚦 Implementation Roadmap

### 🟢 Phase 1 (немедленно - эта неделя):
- [x] Env helper (`src/lib/env.ts`)
- [x] ESLint import restrictions
- [x] AI-генерация чеклист  
- [x] PR template
- [x] Commit message rules
- [x] Updated conventions.md

### 🟡 Phase 2 (1-2 недели):
- [ ] Pre-commit hooks (lint-staged + ESLint + Prettier)
- [ ] Unit tests baseline + coverage requirements
- [ ] Mock data rules enforcement
- [ ] Basic CI pipeline (lint + typecheck + tests)

### 🔴 Phase 3 (1 месяц):
- [ ] Full CI/CD pipeline  
- [ ] Security scanning (Snyk/Dependabot)
- [ ] E2E testing infrastructure
- [ ] Database migration rules
- [ ] Performance monitoring

---

## 📚 Quick Reference

### 🔍 Checklist для ревью PR:
- [ ] Следует ли архитектуре из vision.md?
- [ ] Есть ли тесты для новой логики?
- [ ] Используются ли правильные импорты (client/server)?
- [ ] Применяются ли ShadCN UI + семантические цвета?
- ] Поддерживает ли код isLocal() режим?
- [ ] Логгирование с правильными категориями?
- [ ] AI-код промаркирован и есть human approve?

### 🚨 Red Flags (блокировать merge):
- ❌ Прямое использование `process.env.K_SERVICE`
- ❌ Импорт server модулей в client коде  
- ❌ Отсутствие тестов для новой бизнес-логики
- ❌ Hardcoded цвета вместо семантических
- ❌ AI-код без human review
- ❌ Секреты в коде или логах
- ❌ Изменение .env файла

---

*Этот документ — живой. Обновляется по мере развития проекта и получения фидбека от команды.*

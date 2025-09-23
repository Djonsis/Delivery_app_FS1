# 📋 Tasklist — Product Management System

Этот документ отслеживает прогресс разработки по крупным функциональным блокам (эпикам) с приоритизацией и четкими критериями готовности.

---

## 📊 Прогресс и приоритеты

| Эпик / Функционал                    | Статус        | Прогресс          | Приоритет | Blockers                    | Следующий шаг                        |
| :----------------------------------- | :------------ | :---------------- | :-------- | :-------------------------- | :----------------------------------- |
| **MVP Foundation**                   | ✅ Завершено   | ▓▓▓▓▓▓▓▓▓▓ (100%) | P1        | -                           | -                                    |
| **Весовые товары (Weighted Products)** | ⏳ В процессе | ▒▒▒▒▒▒▒▒▒▒ (10%)  | P1        | ⚠️ DB schema decision       | Phase 1: Data Model + Migration     |
| **AI & Cloud Integration**           | ✅ Phase 1     | ▓▓▓▒▒▒▒▒▒▒ (30%)  | P2        | -                           | Phase 2: Cloud Logging API           |

---

## 🎯 Эпик: Весовые товары (Weighted Products)

**Цель:** создать систему управления весовыми товарами с автоматическим пересчетом цен и финализацией заказов после сборки.

**Feature Flag:** `feature.weighted-products` (OFF по умолчанию)

### Phases (с приоритетами)

#### Phase 1: Data Model & Migration (P1)
- Типы, миграции, валидация
- **DoD:** `npm run build && npm run typecheck` проходят без ошибок, миграция + rollback протестированы

#### Phase 2: Backend Services (P1)  
- Валидация, conversion utils, бизнес-логика
- **DoD:** unit + integration тесты, покрытие ≥80%

#### Phase 3: Admin Interface (P2)
- Расширение форм, auto-fill rules
- **DoD:** E2E тест создания весового товара

#### Phase 4: User Interface (P2)
- Product card, корзина, step quantity logic
- **DoD:** UI тесты проходят, responsive + a11y выполнены

#### Phase 5: Order Flow (P1 → simplified)
- Базовый статус-флоу: `created → assembled → finalized`
- **DoD:** финализация заказа с реальным весом работает end-to-end

---

## 🤖 Эпик: AI & Cloud Integration 

**Цель:** Интеграция AI-ассистента с живыми данными из Google Cloud для мониторинга и анализа состояния приложения.

**Feature Flag:** `feature.ai-cloud-integration` (Phase 1 активен)

### 📋 Phases

#### ✅ Phase 1: Logging Infrastructure (Completed)
**Статус:** ✅ Завершено  
**Цель:** Создать архитектурный плацдарм для AI-интеграции через систему логирования.

**Реализовано:**
- ✅ Двухуровневая система логгеров (`logger.ts` + `server-logger.ts`)  
- ✅ Файловое хранение логов (`public/debug.log`)
- ✅ Server Actions для работы с логами (`log.actions.ts`)
- ✅ Admin UI для просмотра логов (`/admin/logs`)  
- ✅ AI-инструменты для чтения локальных логов (`qa-flow.ts`)
- ✅ Документация архитектуры (`docs/architecture/04-logging.md`)

**Результат:** AI-ассистент может отвечать на вопросы вида *"Что показывают логи? Есть ли ошибки?"*

#### 🔄 Phase 2: Cloud Logging API (Planned)
**Приоритет:** P2  
**Цель:** Заменить локальные файлы на Google Cloud Logging API.

**Планируемые изменения:**
- 🔄 Интеграция с Google Cloud Logging API в `server-logger.ts`
- 🔄 Обновление `log.actions.ts` для чтения из Cloud
- 🔄 Добавление фильтрации по временным диапазонам
- ✅ **Без изменений:** Admin UI, AI-инструменты (архитектура сохраняется)

**DoD:**
- AI может читать логи из Cloud Console  
- Производительность: запросы к Cloud <2сек
- Бекварды совместимость: старые инструменты работают

#### 🔄 Phase 3: Advanced Cloud Integration (Future)
**Приоритет:** P3  
**Цель:** Расширенная интеграция с Google Cloud Services.

**Планируемое:**
- 🔄 AI может читать метрики Cloud Monitoring
- 🔄 Анализ статуса Cloud SQL, Cloud Run, Storage
- 🔄 Автоматические отчеты о состоянии проекта  
- 🔄 Интеграция с Cloud Error Reporting

**Инструменты для AI:**
```typescript
// Примеры будущих возможностей:
// "Какой статус у Cloud SQL?"
// "Сколько тратим на Cloud Run в этом месяце?"  
// "Покажи ошибки за последние 24 часа"
// "Как работает наше приложение сегодня?"
```

### 🎯 Архитектурные принципы

1. **Безопасность через Server Actions:** AI никогда не имеет прямого доступа к API. Только через строго определенные Server Actions.

2. **Расширяемая архитектура:** Легко добавить новые источники данных (Cloud Monitoring, Error Reporting, etc.)

3. **Инкрементальное развертывание:** Каждая фаза добавляет возможности, не ломая предыдущие.

4. **Единый интерфейс для AI:** Все инструменты используют одинаковый паттерн вызова.

### 🔧 Key Files

| Файл | Назначение | Phase |
|------|------------|-------|
| `src/lib/logger.ts` | Универсальный логгер (client + server) | 1 ✅ |
| `src/lib/server-logger.ts` | Серверный логгер + файловый вывод | 1 ✅ |  
| `src/lib/actions/log.actions.ts` | Server Actions для логов | 1 ✅ |
| `src/app/admin/logs/page.tsx` | Admin UI для логов | 1 ✅ |
| `src/ai/qa-flow.ts` | AI-инструменты анализа | 1 ✅ |
| `docs/architecture/04-logging.md` | Документация архитектуры | 1 ✅ |

### 📈 Success Metrics

- **Phase 1:** ✅ AI успешно анализирует локальные логи  
- **Phase 2:** AI читает Cloud Logging <2сек, 100% uptime
- **Phase 3:** AI дает полную картину состояния проекта

---

## 🚨 Risk Mitigation

| Риск                          | Вероятность | Воздействие | Митигация                                           |
| :---------------------------- | :---------- | :---------- | :-------------------------------------------------- |
| Несовместимость данных        | Средняя     | Высокое     | Migration testing + staged rollout + feature flag   |
| UX confusion                  | Средняя     | Среднее     | Tooltips + beta-testing + onboarding guide          |
| Performance degradation       | Низкая      | Среднее     | DB indexing + caching + load testing                |
| Cloud API rate limits        | Средняя     | Среднее     | Кеширование + retry logic + fallback to local       |
| AI tool reliability          | Низкая      | Низкое      | Graceful degradation + fallback UI                  |

---

## 🚀 Quick Reference

```bash
# Feature flags
npm run feature-flag enable weighted-products
npm run feature-flag enable ai-cloud-integration

# Tests
npm run test:weighted-products  
npm run test:ai-integration

# Logs
npm run logs:view    # Открыть /admin/logs
npm run logs:clear   # Очистить debug.log
```

**Архитектурные файлы:**
- `docs/architecture/04-logging.md` - Система логирования
- `docs/architecture/01-vision.md` - Общая архитектура  
- `src/ai/qa-flow.ts` - AI-инструменты

---

📌 *Документ обновляется по мере прогресса. Новые эпики добавляются по мере необходимости.*
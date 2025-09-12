# 📋 Tasklist — Weighted Products

Этот документ отслеживает прогресс разработки по крупным функциональным блокам (эпикам) с приоритизацией и четкими критериями готовности.

---

## 📊 Прогресс и приоритеты

| Эпик / Функционал           | Статус       | Прогресс          | Приоритет | Blockers              | Ответственный | Следующий шаг                   |
| :-------------------------- | :----------- | :---------------- | :-------- | :-------------------- | :------------ | :------------------------------ |
| **MVP Foundation**          | ✅ Завершено  | ▓▓▓▓▓▓▓▓▓▓ (100%) | P1        | -                     | AI-Ассистент  | -                               |
| **Гибкое управление весом** | ⏳ В процессе | ▒▒▒▒▒▒▒▒▒▒ (50%)  | P1        | - | AI-Ассистент  | Phase 2: Backend Services |

---

## 🎯 Эпик: Гибкое управление весовыми товарами

**Цель:** создать систему управления весовыми товарами с автоматическим пересчетом цен и финализацией заказов после сборки.

**Feature Flag:** `feature.weighted-products` (OFF по умолчанию)

---

## 📑 Dependencies

* Phase 3 (Admin UI) зависит от Phase 2 (Backend)
* Phase 4 (User UI) требует Phase 1 + 2
* Phase 5 (Order Flow) можно начинать параллельно с Phase 4

---

## ✅ Definition of Ready (DoR)

Перед стартом каждой фазы должно быть:

* [ ] Техническое решение согласовано
* [ ] API contracts определены
* [ ] Test strategy понятна
* [ ] Breaking changes выявлены

---

## 📋 Phases (с приоритетами)

### Phase 1: Data Model & Migration (P1)
- [x] Типы, миграции, валидация
- **DoD:** `npm run build && npm run typecheck` проходят без ошибок, миграция + rollback протестированы

### Phase 2: Backend Services (P1)

* Валидация, conversion utils, бизнес-логика
* **DoD:** unit + integration тесты, покрытие ≥80%

### Phase 3: Admin Interface (P2)

* Расширение форм, auto-fill rules
* **DoD:** E2E тест создания весового товара

### Phase 4: User Interface (P2)

* Product card, корзина, step quantity logic
* **DoD:** UI тесты проходят, responsive + a11y выполнены

### Phase 5: Order Flow (P1 → simplified)

* Базовый статус-флоу: `created → assembled → finalized`
* Продвинутая логика доплат/возвратов = P2
* **DoD:** финализация заказа с реальным весом работает end-to-end

### Phase 6: Testing & QA (P1/P2)

* Unit, integration, E2E
* Performance + security audit
* **DoD:** CI блокирует merge при падении тестов

### Phase 7: Documentation & Rollout (P2/P3)

* API docs, admin guide, migration guide
* Feature flag rollout + monitoring
* **DoD:** staged rollout, rollback план проверен

---

## 🚨 Risk Mitigation

| Риск                          | Вероятность | Воздействие | Митигация                                           |
| :---------------------------- | :---------- | :---------- | :-------------------------------------------------- |
| Несовместимость данных        | Средняя     | Высокое     | Migration testing + staged rollout + feature flag   |
| UX confusion                  | Средняя     | Среднее     | Tooltips + beta-testing + onboarding guide          |
| Performance degradation       | Низкая      | Среднее     | DB indexing + caching + load testing                |
| Rounding errors               | Низкая      | Высокое     | Централизованная библиотека + unit tests edge cases |
| Payment adjustment complexity | Высокая     | Среднее     | Пошаговая реализация, fallback сценарии             |

---

## 🚀 Quick Wins

* [ ] Создать feature flag `weighted-products`
* [ ] Добавить placeholder UI ("Coming soon")
* [ ] Подготовить структуру документации:

  ```
  docs/
  ├── tasklist.md
  ├── weighted-products/
  │   ├── technical-spec.md
  │   ├── api-contracts.md
  │   ├── testing-strategy.md
  │   └── rollout-plan.md
  ```

---

## 📈 Success Metrics

* **Technical:** 100% тестов проходят, performance в SLA
* **Business:** ≥X% товаров переведено на весовое управление
* **User:** NPS не снижается, complaint rate < 1%
* **Operational:** Onboarding admin < 30 мин

---

## 🔧 Quick Reference

```bash
# Feature flag
npm run feature-flag enable weighted-products

# Tests
npm run test:weighted-products

# Migration
npm run migrate:up weighted-products
npm run migrate:down weighted-products
```

**Key files:**

* `src/lib/types.ts`
* `src/lib/services/products.service.ts`
* `src/lib/utils/weight-converter.ts`
* `components/admin/product-form.tsx`
* `components/cart/cart.tsx`
* `migrations/xxx-weighted-products.sql`

---

📌 *Документ живой, обновляется по мере прогресса. Blockers фиксируются сразу.*

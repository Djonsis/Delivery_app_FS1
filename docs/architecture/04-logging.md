# 04 - Архитектура Системы Логирования

> **Версия:** 1.0.0  
> **Дата:** Декабрь 2024  
> **Статус:** Реализовано (Phase 1 - Локальные логи)

Этот документ описывает архитектуру системы логирования и её интеграцию с AI-инструментами для анализа состояния приложения.

---

## 🎯 Обзор

Наша система логирования состоит из трех основных компонентов:

1. **Двухуровневая система логгеров** (client/server separation)
2. **Файловая система логов** с UI для администраторов  
3. **AI-интеграция** для автоматического анализа логов

Это позволяет не только эффективно отлаживать приложение, но и задавать AI-ассистенту вопросы вроде: *"Что показывают логи? Есть ли ошибки?"*

---

## 🏗 Архитектура

### 1. Логгеры (Client/Server Separation)

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGGING ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CLIENT-SIDE                    SERVER-SIDE                 │
│  ┌─────────────────────────────┐ ┌─────────────────────────┐ │
│  │     logger.ts               │ │   server-logger.ts      │ │
│  │                             │ │                         │ │
│  │ • React components          │ │ • Server Actions        │ │
│  │ • Client hooks              │ │ • API Routes            │ │
│  │ • Browser environment       │ │ • Database services     │ │
│  │                             │ │                         │ │
│  │ Output: Console only        │ │ Output: Console + File  │ │
│  └─────────────────────────────┘ └─────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### `logger.ts` (Универсальный)
- **Область применения:** Client + Server
- **Вывод:** Только консоль
- **Безопасность:** Полностью безопасен для браузера

#### `server-logger.ts` (Серверный)  
- **Область применения:** Только Server Actions/Routes
- **Вывод:** Консоль + файл `public/debug.log`
- **Формат:** Настраиваемый (text/json)

### 2. Файловая система логов

```
┌─────────────────────────────────────────────────────────────┐
│                     LOG FILE SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  server-logger.ts ──────────┐                              │
│                             ▼                              │
│                    public/debug.log                        │
│                             │                              │
│                             ▼                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              log.actions.ts                             │ │
│  │                                                         │ │
│  │  • getLogsAction() ─────► Читает файл                  │ │
│  │  • clearLogsAction() ───► Очищает файл                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                             │                              │
│                             ▼                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │         /admin/logs UI                                  │ │
│  │                                                         │ │
│  │  • Просмотр логов в реальном времени                   │ │
│  │  • Фильтрация по категориям/уровням                    │ │  
│  │  • Очистка с подтверждением                            │ │
│  │  • Автоматическая ротация (5MB лимит)                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. AI-интеграция (Genkit Tools)

```
┌─────────────────────────────────────────────────────────────┐
│                    AI INTEGRATION FLOW                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Question: "Что в логах?"                             │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                qa-flow.ts                               │ │
│  │                                                         │ │
│  │  Genkit Flow: "analyzeProjectStatus"                   │ │
│  │         │                                               │ │
│  │         ▼                                               │ │
│  │  Genkit Tool: "readProjectLogs"                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              log.actions.ts                             │ │
│  │                                                         │ │
│  │  getLogsAction() ──────► public/debug.log              │ │
│  └─────────────────────────────────────────────────────────┘ │
│           │                                                 │
│           ▼                                                 │
│  AI анализирует логи и отвечает пользователю               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Компоненты системы

### Core Files

| Файл | Назначение | Область |
|------|------------|---------|
| `src/lib/logger.ts` | Универсальный логгер | Client + Server |
| `src/lib/server-logger.ts` | Серверный логгер с файловым выводом | Server only |
| `src/lib/actions/log.actions.ts` | Server Actions для работы с файлом логов | Server only |
| `src/app/admin/logs/page.tsx` | UI для просмотра логов в админ-панели | Admin UI |
| `src/ai/qa-flow.ts` | AI-инструменты для анализа логов | AI Tools |

### Key Features

#### 1. Категоризация логов
```typescript
const orderLogger = serverLogger.withCategory('ORDER_SERVICE');
const authLogger = logger.withCategory('AUTH_COMPONENT');
```

#### 2. Уровни логирования
- `debug()` - Техническая отладка
- `info()` - Бизнес-события  
- `warn()` - Предупреждения
- `error()` - Критические ошибки

#### 3. Замер производительности
```typescript
logger.time('database-query');
// ... операция ...  
logger.timeEnd('database-query');
```

#### 4. Структурированные данные
```typescript
orderLogger.info("Order created", { 
  orderId: "123", 
  amount: 1500,
  customer: "john@example.com" 
});
```

---

## 🛠 Использование

### В React компонентах (Client)

```typescript
import { logger } from '@/lib/logger';

const cartLogger = logger.withCategory('CART_COMPONENT');

export function CartComponent() {
  const handleAddItem = (product: Product) => {
    cartLogger.info("Adding item to cart", { 
      productId: product.id,
      title: product.title 
    });
  };
}
```

### В Server Actions

```typescript
import { serverLogger } from '@/lib/server-logger';

const orderLogger = serverLogger.withCategory('ORDER_ACTION');

export async function createOrderAction(data: OrderData) {
  orderLogger.info("Creating new order", { customer: data.customer });
  
  try {
    const order = await createOrder(data);
    orderLogger.info("Order created successfully", { orderId: order.id });
    return { success: true };
  } catch (error) {
    orderLogger.error("Failed to create order", error as Error);
    return { success: false };
  }
}
```

### AI-запросы к логам

```typescript
// Пользователь может спросить:
// "Есть ли ошибки в логах за последний час?"
// "Покажи все предупреждения по категории ORDER_SERVICE"
// "Что происходило с системой сегодня?"

// AI использует Genkit Tool для автоматического чтения и анализа
```

---

## 🔄 Roadmap

### ✅ Phase 1: Local File Logging (Completed)
- Двухуровневая система логгеров
- Файловый вывод в `public/debug.log`  
- Admin UI для просмотра логов
- AI-инструменты для анализа локальных логов

### 🔄 Phase 2: Cloud Integration (Planned)
- **Цель:** Замена `public/debug.log` на Google Cloud Logging
- **Изменения:** Только в `server-logger.ts` + `log.actions.ts`
- **AI-инструменты:** Без изменений (та же архитектура)

### 🔄 Phase 3: Advanced Analytics (Future)
- Метрики и дашборды
- Алерты по критическим ошибкам
- Автоматические отчеты для AI

---

## 🔐 Конфигурация

### Environment Variables

```bash
# .env.local
LOG_LEVEL=debug              # debug | info | warn | error
LOG_FORMAT=text              # text | json  
MAX_LOG_FILE_SIZE=5242880    # 5MB в байтах
AUTO_CLEAR_LOGS=true         # автоочистка при превышении размера
```

### Файловая ротация

- **Максимальный размер:** 5MB (настраиваемо)
- **Поведение при превышении:** Автоматическая очистка
- **UI управление:** Ручная очистка с подтверждением

---

## 🎯 Архитектурные принципы

### 1. Client/Server Separation
- **Проблема:** Client-код не может писать в файлы
- **Решение:** Раздельные логгеры с четкими границами

### 2. Security First  
- **Файл логов:** Только в `public/` (доступен через HTTP)
- **Чувствительные данные:** Автоматическая фильтрация
- **Доступ к UI:** Только для администраторов

### 3. AI-Ready Architecture
- **Стандартизированный формат:** Легко парсимый AI
- **Структурированные данные:** JSON-metadata для анализа  
- **Инструментальный доступ:** Через безопасные Server Actions

### 4. Extensible Design
- **Замена бэкенда:** От файлов к Cloud без изменений в AI
- **Добавление источников:** Легко подключить внешние API
- **Кастомные анализаторы:** Простое добавление новых инструментов

---

## 🚀 Мигация на Cloud (Phase 2)

Когда будем готовы к интеграции с Google Cloud Logging:

### Что изменится:
```typescript
// В server-logger.ts
async function writeToCloud(entry: LogEntry) {
  // Заменим fs.appendFile на Cloud Logging API
  await cloudLogging.write(entry);
}

// В log.actions.ts  
export async function getLogsAction() {
  // Заменим fs.readFile на запрос к Cloud Logging
  return await cloudLogging.getEntries();
}
```

### Что останется неизменным:
- ✅ API Server Actions (`getLogsAction`, `clearLogsAction`)
- ✅ Admin UI (`/admin/logs`)  
- ✅ AI-инструменты (`qa-flow.ts`)
- ✅ Вся клиентская логика

**Это идеальный пример расширяемой архитектуры!** 🎉

---

## 📊 Мониторинг и метрики

### Текущие возможности:
- Просмотр размера файла логов
- Фильтрация по категориям и уровням
- Мануальная и автоматическая очистка

### Планируемые (Phase 3):
- Статистика по категориям ошибок
- Тренды производительности  
- Интеграция с системами мониторинга
- Автоматические отчеты

---

*Этот документ обновляется по мере развития системы логирования.*

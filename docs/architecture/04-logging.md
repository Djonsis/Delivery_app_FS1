# 04 - Архитектура Системы Логирования

> **Версия:** 1.1.0  
> **Дата:** 2025-10-18  
> **Статус:** Реализовано

Этот документ описывает архитектуру системы логирования, обеспечивающую четкое разделение между клиентским и серверным окружением, и её интеграцию с AI-инструментами.

---

## 🎯 Обзор

Система логирования решает три ключевые задачи:

1.  **Безопасность и Изоляция:** Гарантированное разделение логгеров для клиентского и серверного кода.
2.  **Унифицированный API:** Предоставление удобного и консистентного API для разработки.
3.  **Аналитика и AI-интеграция:** Сбор серверных логов для анализа и возможность задавать AI-ассистенту вопросы о состоянии системы.

---

## 🏗 Архитектура

### 1. Визуальная схема

```
┌──────────────────────────────────────────────────────────────────┐
│                 LOGGING SYSTEM ARCHITECTURE                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLIENT CODE                 │         SERVER CODE              │
│  ┌────────────────────┐      │      ┌─────────────────────────┐ │
│  │   logger.ts        │      │      │  server-logger.ts       │ │
│  │                    │      │      │  + 'server-only'        │ │
│  │  • React           │      │      │  • Server Actions       │ │
│  │  • Hooks           │      │      │  • Route Handlers       │ │
│  │  • Client Utils    │      │      │  • API Routes           │ │
│  │                    │      │      │                         │ │
│  │  Output:           │      │      │  Output:                │ │
│  │  ✅ Console only   │      │      │  ✅ Console             │ │
│  │                    │      │      │  ✅ File (debug.log)    │ │
│  │                    │      │      │  ✅ Winston             │ │
│  └────────────────────┘      │      └─────────────────────────┘ │
│       ✅ Safe                │            🛡️ Protected         │
│    for Browser              │         Compile Error if         │
│                             │         imported in client       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2. Двухуровневая система с унифицированным API

Система состоит из двух физически разделенных модулей, чтобы гарантировать, что серверный код никогда не попадет в клиентский бандл.

#### **`src/lib/logger.ts` (Универсальный / Client-Safe):**
- **Назначение:** Используется в любом коде, включая React-компоненты и хуки.
- **Ограничения:** Полностью безопасен для браузера, **не содержит импортов Node.js API (например, `fs`)**.
- **Вывод:** Только в консоль (`console.log`, `console.error` и т.д.).
- **API:**
    - `logger.withCategory('CATEGORY')` — предпочтительный способ.
    - `logger('CATEGORY')` — для обратной совместимости.

#### **`src/lib/server-logger.ts` (Серверный):**
- **Назначение:** Используется **строго** в коде, который выполняется только на сервере (Server Actions, Route Handlers).
- **Защита:** Модуль защищен директивой `import 'server-only';`. Это вызывает ошибку на этапе сборки, если кто-то попытается импортировать его в клиентский компонент.
- **Функционал:**
    - Использует **Winston** для расширенного логирования.
    - Вывод: Дублируется в консоль и в файл `public/debug.log`.
    - Поддержка Google Cloud Logging (в production).
- **API:**
    - `serverLogger.withCategory('CATEGORY')`

### 3. Ключевые улучшения текущей версии

- **Унифицированный API:** Несмотря на разделение файлов, API логгеров (`withCategory`, `info`, `error` и т.д.) идентичен, что упрощает разработку.
- **Обратная совместимость:** Старый синтаксис `logger('CATEGORY')` продолжает работать, позволяя проводить рефакторинг постепенно.
- **Надежная изоляция:** Использование `'server-only'` является compile-time гарантией безопасности, что важнее, чем удобство импорта из одного файла.

---

## 🔐 Безопасность

### Server-Only Protection

`serverLogger` защищен директивой `import 'server-only'`, которая:
- **Предотвращает** его импорт в клиентском коде (вызывает ошибку сборки).
- **Гарантирует**, что модули `fs` и `winston` никогда не попадут в браузерный бандл.
- **Обеспечивается** фреймворком Next.js (v13+) на уровне сборки, что является лучшей практикой.

### Фильтрация чувствительных данных

**Рекомендации по безопасности:**
- ❌ Никогда не логируйте пароли, токены, API ключи
- ❌ Избегайте логирования полных данных кредитных карт
- ✅ Используйте маскирование для чувствительных полей
- ✅ Логируйте только идентификаторы (user ID, order ID)

```typescript
// ❌ ПЛОХО: Пароли в логах
logger.info('User login', { password: user.password });

// ✅ ХОРОШО: Только безопасные данные
logger.info('User login', { userId: user.id, email: user.email });

// ✅ ЕЩЕ ЛУЧШЕ: Маскирование email
logger.info('User login', { 
  userId: user.id, 
  email: maskEmail(user.email) // u***@example.com
});
```

---

## 🛠 Использование

### В React компонентах (Client-Side)

```typescript
import { logger } from '@/lib/logger';

// Предпочтительный паттерн (v1.1):
const log = logger.withCategory('CART_COMPONENT');

// Legacy паттерн (работает, но рекомендуется к обновлению):
const legacyLog = logger('CART_COMPONENT');

export function CartComponent() {
  const handleAddItem = (product: Product) => {
    log.info('Adding item to cart', { 
      productId: product.id,
      title: product.title 
    });
  };

  const handleRemoveItem = (productId: string) => {
    log.warn('Removing item from cart', { productId });
  };

  return (
    // JSX...
  );
}
```

### В Server Actions (Server-Side)

```typescript
import { serverLogger } from '@/lib/server-logger';

const orderLogger = serverLogger.withCategory('ORDER_ACTION');

export async function createOrderAction(data: OrderData) {
  orderLogger.info('Creating new order', { 
    customer: data.customer,
    itemsCount: data.items.length 
  });

  orderLogger.time('order-creation');
  
  try {
    const order = await db.orders.create(data);
    orderLogger.timeEnd('order-creation'); // Выведет: "order-creation took 123ms"
    
    orderLogger.info('Order created successfully', { 
      orderId: order.id,
      totalAmount: order.totalAmount 
    });
    
    return { success: true, orderId: order.id };
  } catch (error) {
    orderLogger.error('Failed to create order', error);
    return { success: false, error: 'Order creation failed' };
  }
}
```

### В API Routes

```typescript
// src/app/api/products/route.ts
import { serverLogger } from '@/lib/server-logger';

const apiLogger = serverLogger.withCategory('PRODUCTS_API');

export async function GET(request: Request) {
  apiLogger.info('Fetching products list');
  
  try {
    const products = await getProducts();
    apiLogger.info('Products fetched successfully', { 
      count: products.length 
    });
    
    return Response.json(products);
  } catch (error) {
    apiLogger.error('Failed to fetch products', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

## 📋 Миграция со старого API

Если в вашем коде используется старый паттерн:

```typescript
// ❌ Старый способ (устарел):
import { logger } from '@/lib/logger';
const log = logger('CATEGORY');

// ✅ Новый способ (рекомендуется):
import { logger } from '@/lib/logger';
const log = logger.withCategory('CATEGORY');
```

### Почему менять:
- ✅ Консистентность с `serverLogger` API
- ✅ Лучшая типизация и автодополнение в IDE
- ✅ Соответствие conventions проекта
- ✅ Единый стиль во всей кодовой базе

### Когда менять:
- **При работе над файлом** (Boy Scout Rule - оставь код чище, чем нашел)
- **Постепенно** - не требуется массовый рефакторинг
- **В новом коде** - всегда используй новый синтаксис

### Автоматизация миграции:

Для массового рефакторинга можно использовать regex замену:

```bash
# Найти все вхождения старого паттерна:
grep -r "logger('.*')" src/

# Или использовать codemod (опционально):
npx jscodeshift -t transforms/migrate-logger.js src/
```

---

## ⚠️ Частые ошибки

### 1. Импорт serverLogger в клиентском коде

```typescript
// ❌ ОШИБКА: Вызовет compile error
"use client";
import { serverLogger } from '@/lib/server-logger';

export function MyComponent() {
  serverLogger.info('This will fail!'); // 💥 Build error!
  return <div>Hello</div>;
}
```

**Ошибка сборки:**
```
Module not found: Package path ./server-only is not exported from package 'server-only'
```

**Исправление:** Используйте `logger` из `@/lib/logger`.

```typescript
// ✅ ПРАВИЛЬНО
"use client";
import { logger } from '@/lib/logger';

const componentLogger = logger.withCategory('MY_COMPONENT');

export function MyComponent() {
  componentLogger.info('This works!'); // ✅
  return <div>Hello</div>;
}
```

---

### 2. Использование serverLogger в shared utils

```typescript
// ❌ ПЛОХО: src/lib/utils.ts (используется и в клиенте, и на сервере)
import { serverLogger } from '@/lib/server-logger'; // 💥 Ошибка!

export function formatPrice(amount: number) {
  serverLogger.debug('Formatting price', { amount });
  return `$${amount.toFixed(2)}`;
}
```

**Исправление:** Используйте универсальный `logger`:

```typescript
// ✅ ПРАВИЛЬНО: src/lib/utils.ts
import { logger } from '@/lib/logger';

const utilsLogger = logger.withCategory('UTILS');

export function formatPrice(amount: number) {
  utilsLogger.debug('Formatting price', { amount });
  return `$${amount.toFixed(2)}`;
}
```

---

### 3. Логирование объектов без категории

```typescript
// ❌ ПЛОХО: Трудно найти источник лога
logger.info('User logged in');

// ✅ ХОРОШО: Ясный источник
const authLogger = logger.withCategory('AUTH');
authLogger.info('User logged in', { userId: user.id });
```

---

### 4. Избыточное логирование в циклах

```typescript
// ❌ ПЛОХО: Засоряет логи
products.forEach(product => {
  logger.debug('Processing product', { id: product.id }); // 1000 строк логов!
});

// ✅ ХОРОШО: Агрегированная информация
logger.debug('Processing products batch', { count: products.length });
products.forEach(product => processProduct(product));
logger.debug('Products processed successfully');
```

---

## ⚡ Оптимизация производительности

### 1. Правильное использование уровней логов

```typescript
// ❌ ПЛОХО: debug в production замедляет
logger.debug('Processing item', { 
  data: largeObject, // Сериализация большого объекта
  metadata: expensiveComputation() 
});

// ✅ ХОРОШО: Условное логирование
if (process.env.NODE_ENV === 'development') {
  logger.debug('Processing item', { data: largeObject });
}

// ✅ ЕЩЕ ЛУЧШЕ: Настроить LOG_LEVEL в .env
// .env.production:
// LOG_LEVEL=info  (debug автоматически отключается)
```

### 2. Ленивое вычисление данных для логов

```typescript
// ❌ ПЛОХО: Вычисления выполняются даже если лог не выведется
logger.debug('User stats', expensiveCalculation(user));

// ✅ ХОРОШО: Вычисления только если нужны
if (LOG_LEVELS.debug >= configuredLevel) {
  logger.debug('User stats', expensiveCalculation(user));
}
```

### 3. Использование performance timers

```typescript
const orderLogger = serverLogger.withCategory('ORDER_SERVICE');

export async function processOrder(orderId: string) {
  // Замер общего времени
  orderLogger.time('order-processing');
  
  // Замер отдельных этапов
  orderLogger.time('db-fetch');
  const order = await db.orders.findById(orderId);
  orderLogger.timeEnd('db-fetch'); // "db-fetch took 45ms"
  
  orderLogger.time('payment-processing');
  await processPayment(order);
  orderLogger.timeEnd('payment-processing'); // "payment-processing took 320ms"
  
  orderLogger.timeEnd('order-processing'); // "order-processing took 365ms"
}
```

### 4. Оптимизация размера файла логов

В production окружении размер `public/debug.log` контролируется автоматически:

```typescript
// src/lib/config.ts
export const loggingConfig = {
  logDir: 'public',
  logFile: 'debug.log',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  autoClear: true // Автоматическая очистка при превышении
};
```

**Рекомендации:**
- Регулярно проверяйте размер логов в Admin UI (`/admin/logs`)
- Используйте `info` и выше для production
- `debug` только для development/staging

---

## 🔧 Конфигурация

### Environment Variables

```bash
# .env.local (development)
LOG_LEVEL=debug              # debug | info | warn | error
LOG_FORMAT=text              # text | json (для Winston)
NODE_ENV=development

# .env.production
LOG_LEVEL=info               # Отключает debug логи
LOG_FORMAT=json              # Структурированные логи для парсинга
NODE_ENV=production
```

### Уровни логирования

| Уровень | Приоритет | Назначение | Production? |
|---------|-----------|------------|-------------|
| `debug` | 0 (lowest) | Техническая отладка, детали | ❌ Отключен |
| `info` | 1 | Бизнес-события, успешные операции | ✅ Включен |
| `warn` | 2 | Предупреждения, нештатные ситуации | ✅ Включен |
| `error` | 3 (highest) | Критические ошибки, exceptions | ✅ Включен |

### Примеры использования уровней

```typescript
const logger = serverLogger.withCategory('PAYMENT');

// debug - детали для отладки
logger.debug('Payment request prepared', { 
  gatewayUrl, 
  paymentMethod,
  amount 
});

// info - важные бизнес-события
logger.info('Payment processed successfully', { 
  transactionId,
  amount,
  currency 
});

// warn - нештатные, но не критичные ситуации
logger.warn('Payment gateway slow response', { 
  responseTime: 5000,
  threshold: 3000 
});

// error - критические проблемы
logger.error('Payment processing failed', error);
```

---

## 🔄 Roadmap и будущие улучшения

### Phase 1: Local File Logging ✅ (Completed)
- Двухуровневая система логгеров
- Файловый вывод в `public/debug.log`
- Admin UI для просмотра логов (`/admin/logs`)
- Winston integration для серверных логов
- AI-инструменты для анализа локальных логов

---

### Phase 2: Google Cloud Logging 🔄 (Planned)

Когда приложение масштабируется, файл `public/debug.log` будет заменен на Google Cloud Logging.

#### Что изменится:
```typescript
// src/lib/server-logger.ts - только изменения в транспортах Winston
if (isCloud()) {
  winstonLogger.add(new LoggingWinston()); // ← Уже реализовано!
} else {
  winstonLogger.add(new winston.transports.File(...)); // ← Локальный режим
}
```

```typescript
// src/lib/actions/log.actions.ts - изменения в чтении логов
export async function getLogsAction() {
  if (isCloud()) {
    // Читаем из Cloud Logging API
    return await cloudLogging.getEntries();
  } else {
    // Читаем из файла (как сейчас)
    return await fs.readFile('public/debug.log');
  }
}
```

#### Что останется без изменений:
- ✅ API логгеров (`logger.withCategory`, `serverLogger.info`)
- ✅ Весь клиентский код
- ✅ Admin UI (`/admin/logs`)
- ✅ AI-инструменты для анализа

#### Преимущества Cloud Logging:
- **Централизованное хранилище:** Логи со всех инстансов в одном месте
- **Продвинутая фильтрация:** Поиск по категориям, временным меткам, severity
- **Автоматическая ротация:** Retention policies без ручной очистки
- **Интеграция с мониторингом:** Алерты при критических ошибках
- **Масштабируемость:** Поддержка high-traffic приложений

---

### Phase 3: Advanced Analytics 🔮 (Future)

#### Метрики и дашборды:
- Статистика по категориям ошибок
- Тренды производительности (среднее время операций)
- Heat maps активности по времени суток
- Top-N самых частых ошибок

#### Алерты:
- Email/SMS при критических ошибках
- Slack notifications для team
- PagerDuty integration для on-call engineers

#### AI-powered анализ:
- Автоматическое обнаружение аномалий
- Предсказание проблем на основе трендов
- Умные саммари: "За последний час произошло X ошибок категории Y"
- Рекомендации по оптимизации

---

## 📊 Мониторинг и Admin UI

### Доступ к логам

**Admin Panel:** `/admin/logs`

**Функционал:**
- 📋 Просмотр логов в реальном времени
- 🔍 Фильтрация по тексту
- 📊 Отображение размера файла
- 🗑️ Очистка логов с подтверждением
- ☁️ Индикация источника (Cloud/Local)

### Метрики (текущие возможности):
- ✅ Размер файла логов
- ✅ Количество записей
- ✅ Источник логов (Cloud/Local)
- ✅ Статус файла (существует/не существует)

### Метрики (планируемые в Phase 3):
- 📈 Статистика по уровням логов
- 🏷️ Группировка по категориям
- ⏱️ Среднее время выполнения операций
- 🚨 Top критических ошибок

---

## 🤖 AI-интеграция

### Использование логов с AI-ассистентом

Система логирования интегрирована с AI-инструментами через Genkit Tools.

**Примеры запросов:**
```
"Есть ли ошибки в логах за последний час?"
"Покажи все предупреждения по категории ORDER_SERVICE"
"Что происходило с системой сегодня?"
"Найди в логах упоминания user_id=123"
```

### Техническая реализация

```typescript
// src/ai/tools/logs-tool.ts
import { getLogsAction } from '@/lib/actions/log.actions';

export const readLogsToolDefinition = defineToolDefinition({
  name: 'readProjectLogs',
  description: 'Read application logs for debugging and analysis',
  async execute() {
    const result = await getLogsAction();
    return result.logs || [];
  }
});
```

AI автоматически:
- Читает логи через Server Action
- Анализирует паттерны ошибок
- Выделяет критичные проблемы
- Предлагает решения

---

## 🎓 Best Practices

### 1. Категоризация логов
```typescript
// ✅ ХОРОШО: Логичная иерархия категорий
const authLogger = serverLogger.withCategory('AUTH');
const paymentLogger = serverLogger.withCategory('PAYMENT');
const dbLogger = serverLogger.withCategory('DATABASE');

// ❌ ПЛОХО: Неструктурированные категории
const logger1 = serverLogger.withCategory('stuff');
const logger2 = serverLogger.withCategory('things');
```

### 2. Структурированные данные
```typescript
// ✅ ХОРОШО: Легко парсится и фильтруется
logger.info('Order created', {
  orderId: '123',
  userId: 'user_456',
  amount: 1500,
  currency: 'RUB'
});

// ❌ ПЛОХО: Сложно парсить
logger.info(`Order 123 created by user_456 for 1500 RUB`);
```

### 3. Контекстная информация
```typescript
// ✅ ХОРОШО: Достаточно контекста для отладки
logger.error('Failed to process payment', {
  orderId,
  userId,
  amount,
  paymentGateway: 'stripe',
  errorCode: error.code,
  errorMessage: error.message
});

// ❌ ПЛОХО: Недостаточно информации
logger.error('Payment failed');
```

### 4. Избегайте логирования в hot paths
```typescript
// ❌ ПЛОХО: Логирование в высоконагруженном цикле
for (let i = 0; i < 10000; i++) {
  logger.debug(`Processing item ${i}`); // 10,000 логов!
  processItem(items[i]);
}

// ✅ ХОРОШО: Агрегированное логирование
logger.info(`Starting batch processing`, { count: items.length });
for (let i = 0; i < items.length; i++) {
  processItem(items[i]);
}
logger.info(`Batch processing completed`, { 
  count: items.length,
  duration: Date.now() - startTime 
});
```

---

## 📚 Ссылки и ресурсы

### Внутренние документы:
- `docs/architecture/02-conventions.md` - Code conventions (import rules)
- `docs/process/01-workflow.md` - Workflow и Boy Scout Rule
- `src/lib/config.ts` - Конфигурация логирования

### Внешние ресурсы:
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Google Cloud Logging](https://cloud.google.com/logging/docs)
- [Next.js Server-Only Package](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment)

---

## 🔖 Версионная история

| Версия | Дата | Изменения |
|--------|------|-----------|
| 1.0.0 | 2024-12 | Первая версия документа |
| 1.1.0 | 2025-10-18 | • Добавлен унифицированный API<br>• Улучшена документация безопасности<br>• Добавлены best practices и примеры<br>• Добавлен roadmap для Cloud Logging |

---

*Этот документ отражает текущую реализацию системы логирования. Любые дальнейшие архитектурные изменения должны быть согласованы перед реализацией согласно workflow, описанному в `docs/process/01-workflow.md`.*
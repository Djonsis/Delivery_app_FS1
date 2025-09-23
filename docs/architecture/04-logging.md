
# Руководство по Системе Логирования

Этот документ описывает архитектуру и правила использования системы логирования в приложении.

## 1. Архитектура

Система логирования разделена на два модуля для обеспечения безопасности и корректной работы на клиенте и сервере.

*   **Универсальный Логгер (`src/lib/logger.ts`)**:
    *   **Назначение**: Безопасен для использования как на клиенте (в React компонентах), так и на сервере.
    *   **Вывод**: Пишет сообщения только в консоль (браузера или сервера).
    *   **Возможности**: Поддерживает уровни логирования (`debug`, `info`, `warn`, `error`), категории и замеры производительности (`time`, `timeEnd`).

*   **Серверный Логгер (`src/lib/server-logger.ts`)**:
    *   **Назначение**: Используется **только** в серверном коде (Server Actions, Route Handlers).
    *   **Вывод**: Пишет одновременно в консоль сервера и в файл `public/debug.log`.
    *   **Формат**: Может выводить как обычный текст, так и `json` (управляется `LOG_FORMAT` в `.env`).
    *   **Возможности**: Полностью дублирует функционал универсального логгера, но с возможностью записи в файл.

*   **Серверные Экшены (`src/lib/actions/log.actions.ts`)**:
    *   `getLogsAction()`: Читает файл `debug.log` и возвращает его содержимое и размер для отображения в UI.
    *   `clearLogsAction()`: Полностью очищает файл `debug.log`.

*   **Интерфейс Администратора (`src/app/admin/logs/page.tsx`)**:
    *   **Доступ**: Страница доступна в админ-панели.
    *   **Функционал**:
        *   Просмотр, обновление, очистка (с подтверждением) и фильтрация логов.
        *   Отображение текущего размера файла `debug.log`.
        *   Возможность включить автоматическую очистку файла, если его размер превышает установленный лимит (5 МБ).

## 2. Как использовать логгер

### Основные правила

1.  **В клиентских компонентах (React)**: Всегда импортируйте `logger` из `@/lib/logger`.
    ```typescript
    import { logger } from '@/lib/logger';
    ```
2.  **В серверном коде (Server Actions)**: Используйте `serverLogger` из `@/lib/server-logger` для записи в файл.
    ```typescript
    import { serverLogger } from '@/lib/server-logger';
    ```
3.  **Категории**: Для каждого "модуля" или файла создавайте свой экземпляр логгера с категорией. Это делает логи легко фильтруемыми.
    ```typescript
    // Пример из cart-context.tsx (клиент)
    const cartLogger = logger.withCategory('CART_CONTEXT');
    
    // Пример из create-order.ts (сервер)
    const orderLogger = serverLogger.withCategory('ORDER_ACTION');
    ```
4.  **Уровни**: Используйте правильный уровень для каждого события.
    *   `error()`: Для критических ошибок. Всегда передавайте объект ошибки.
    *   `warn()`: Для некритичных, но неожиданных ситуаций.
    *   `info()`: Для ключевых бизнес-событий (например, "Пользователь добавил товар в корзину").
    *   `debug()`: Для подробной технической информации, полезной при отладке.

### Примеры использования

#### Логирование на клиенте (в компоненте)
```typescript
// src/components/cart.tsx
import { logger } from '@/lib/logger';

const cartComponentLogger = logger.withCategory("CART_COMPONENT");

// ...
try {
    const result = await createOrder(orderPayload);
    cartComponentLogger.info("Order successfully created.", { orderId: result.orderId });
} catch (error) {
    cartComponentLogger.error("Failed to create order during checkout.", error as Error);
}
```

#### Логирование на сервере (в Server Action)
```typescript
// src/app/actions/create-order.ts
import { serverLogger } from "@/lib/server-logger";

const orderLogger = serverLogger.withCategory("ORDER_ACTION");

export async function createOrder(payload: CreateOrderPayload) {
    orderLogger.info("Attempting to create a new order...", { customer: payload.customer });
    try {
        // ...
        orderLogger.info(`Successfully created new order.`, { orderId: docRef.id });
    } catch (error) {
        orderLogger.error("Error creating order in Firestore", error as Error);
        throw new Error("Не удалось сохранить заказ.");
    }
}
```

#### Замер производительности (работает везде)
```typescript
const operationId = `process-file`;
logger.time(operationId);

// ... длительная операция ...

logger.info(`Processing finished.`);
logger.timeEnd(operationId);

// В логе (text):
// [2025-07-25T10:10:00.000Z] [DEBUG] [APP] process-file took 5432ms
```
---
**Вывод:** Текущая реализация системы логирования является завершенной и соответствует лучшим практикам. Она предоставляет все необходимые инструменты для эффективной отладки и мониторинга приложения, разделяя логику для клиента и сервера.

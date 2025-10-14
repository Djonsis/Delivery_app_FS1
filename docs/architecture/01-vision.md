## 1. Технологии

- **Фреймворк:** Next.js (App Router)
- **Язык:** TypeScript
- **UI-библиотека:** React, ShadCN UI
- **Стилизация:** Tailwind CSS
- **База данных:** PostgreSQL (через Google Cloud SQL)
- **Хранилище файлов:** Google Cloud Storage (S3-совместимый API)
- **AI/LLM:** Google Genkit
- **Деплоймент:** Firebase App Hosting

## 2. Архитектура проекта

Проект строится на основе классической **трехслойной архитектуры**, адаптированной под Next.js App Router:

1.  **Слой представления (UI Layer):**
    -   Находится в `src/app` (страницы и компоненты) и `src/components`.
    -   Отвечает исключительно за отображение данных и взаимодействие с пользователем.
    -   Компоненты не содержат прямой бизнес-логики или запросов к базе данных. Они вызывают `Server Actions`.

2.  **Слой действий и сервисов (Actions & Services Layer):**
    -   Находится в `src/app/actions` и `src/lib/services`.
    -   `Actions` служат точкой входа для UI. Они валидируют данные и вызывают соответствующие сервисы.
    -   `Services` (например, `products.service.ts`) инкапсулируют бизнес-логику и являются единственным местом, где происходит работа с данными (CRUD). Это гарантирует, что UI отделен от деталей реализации хранилища.

3.  **Слой доступа к данным (Data Access Layer):**
    -   Представлен модулем `src/lib/db.ts` и `src/lib/s3-client.ts`.
    -   Обеспечивает низкоуровневое подключение и взаимодействие с PostgreSQL и S3.
    -   Сервисный слой использует этот модуль, полностью абстрагируясь от деталей подключения (будь то Cloud SQL Proxy или Unix-сокет в продакшене).

## 3. Модель данных и Роли

### 3.1. Основные сущности (Таблицы БД)

Модель данных спроектирована в реляционной парадигме и хранится в PostgreSQL. Ключевые сущности включают:

-   **Users:** Пользователи системы (клиенты, администраторы).
-   **Roles:** Роли пользователей (`admin`, `customer`).
-   **UserRoles:** Связующая таблица для назначения ролей.
-   **Products:** Каталог товаров со всеми характеристиками (цена, описание, SKU).
-   **Categories:** Иерархические категории товаров с префиксами для SKU.
-   **Orders:** Информация о заказах клиентов.
-   **OrderItems:** Позиции товаров внутри каждого заказа.
-   **Media:** Метаданные о файлах, загруженных в S3 (например, изображения товаров).

*Подробная схема находится в `docs/architecture/03-data-and-storage.md`.*

### 3.2. Ролевая модель (Права доступа)

Система будет поддерживать следующие роли с четким разделением прав:

1.  **Гость (неавторизованный пользователь):**
    -   Может: просматривать каталог, товары, категории; добавлять товары в корзину (корзина хранится на клиенте).
    -   Не может: оформлять заказ, просматривать историю заказов, заходить в админ-панель.

2.  **Клиент (Customer, авторизованный пользователь):**
    -   Может: всё, что может Гость, плюс оформлять заказы, просматривать свою историю заказов, управлять своим профилем.
    -   Не может: заходить в админ-панель.

3.  **Администратор (Admin):**
    -   Может: всё, что может Клиент, плюс полный дост3.  **Администратор (Admin):**
    -   Может: всё, что может Клиент, плюс полный доступ к админ-панели (`/admin`) для управления товарами, категориями, заказами и просмотра системных логов.

*На текущем этапе аутентификация и разделение ролей не реализованы. Все пользователи фактически имеют права Гостя. Админ-панель открыта для доступа без авторизации. Серверные действия (Server Actions) для просмотра и очистки логов (`getLogsAction`, `clearLogsAction`) реализованы, но также не защищены авторизацией. Это будет исправлено на следующих этапах разработки.*
уп к админ-панели (`/admin`) для управления товарами, категориями, заказами и просмотра системных логов.

*На текущем этапе аутентификация и разделение ролей не реализованы. Все пользователи фактически имеют права Гостя. Админ-панель открыта для доступа без авторизации. Это будет исправлено на следующих этапах разработки.*

# 4. Работа с LLM

Работа с генеративным AI будет строиться на двух уровнях, чтобы обеспечить гибкость на старте и масштабируемость в будущем.

## 4.1. Идеальная архитектура (Vision)

В долгосрочной перспективе, вся логика, связанная с LLM, будет инкапсулирована в виде атомарных, переиспользуемых модулей — **"Потоков" (Flows)**. Эта архитектура защитит систему от рисков и обеспечит предсказуемость.

### Технический стек
- **Основной инструмент:** Google Genkit. Это единый фреймворк для всех AI-операций.
- **Поставщик моделей:** Google Vertex AI (Gemini Pro), но Genkit позволяет легко переключаться на других провайдеров.
- **Слой абстракции:** Между бизнес-логикой и Genkit для возможности смены фреймворка без переписывания кода.

### Принципы работы
1. **Изоляция:** Каждый "Поток" (например, `substituteProductFlow.ts`) решает одну конкретную задачу, не имея прямого доступа к базе данных или другим частям системы.

2. **Структурированный вывод:** Все потоки возвращают данные в формате JSON, строго соответствующем Zod-схемам. Это исключает работу с "сырым" текстом.

3. **Контроль контекста:** Вся информация передается модели через входные данные потока.

4. **Инструменты (Tools):** Для выполнения сложных задач (например, проверки наличия товара) LLM получает доступ к специально разработанным инструментам, а не к бизнес-логике напрямую.

5. **Аудит и логирование:** Каждый вызов LLM логируется для отладки, мониторинга и анализа стоимости.

6. **Стратегия отката:** При сбое LLM-потока система автоматически переходит к резервному поведению, чтобы не прерывать пользовательский опыт.

### Архитектура результата
```typescript
interface RecommendationResult {
  suggestions: Product[];
  source: 'llm' | 'rules' | 'fallback';
  confidence: number;
  cost?: number;
  processingTime: number;
}
```

## 4.2. Прагматичный план для MVP

Для быстрого старта и проверки гипотез используем **гибридный подход**, сочетающий LLM с простыми эвристическими правилами.

### Стратегия внедрения

**1. Начинаем с малого**
Сосредоточимся на создании 1-2 ключевых LLM-потоков:
- `substituteProductFlow`: Умная замена отсутствующих товаров
- `optimizeWeeklyCartFlow`: Оптимизация еженедельной корзины

**2. Сначала — эвристика**
Для простых задач (например, "предложить похожий товар из той же категории") используем обычную бизнес-логику без вызова LLM. Это быстрее и дешевле.

**3. Критерии перехода от правил к LLM**
- Если accuracy простых правил < 70% — переводим на LLM
- Если cost per conversion через LLM > 500₽ — возвращаемся к правилам
- Если время ответа > 3 секунд — оптимизируем или возвращаемся к правилам

### Контроль рисков и бюджета

**Budget Control:**
- Максимум 1000 вызовов LLM на пользователя в день
- Circuit breaker при превышении месячного лимита затрат на AI
- Автоматическое переключение на правила при достижении лимитов

**Мониторинг метрик:**

*Технические метрики:*
- Время ответа LLM (target: <2 сек)
- Стоимость на запрос
- Частота fallback'ов на простые правила
- Процент успешных вызовов LLM

*Бизнес-метрики:*
- Конверсия рекомендаций в покупки
- User satisfaction с рекомендациями
- ROI от использования LLM vs простых алгоритмов
- Increase в среднем чеке благодаря LLM

### A/B тестирование

Для каждой задачи будем тестировать три подхода:
- **Группа A:** Только простые правила
- **Группа B:** LLM + fallback на правила
- **Контрольная группа:** Без рекомендаций

Критерии успеха для перехода на LLM:
- Конверсия в группе B > группы A минимум на 15%
- Увеличение среднего чека в группе B минимум на 10%
- Cost per acquisition через LLM не превышает маржинальность

## 4.3. План поэтапного внедрения

### Неделя 1-2: Базовые правила
- Реализация простых эвристических правил для всех задач
- Настройка мониторинга базовых метрик
- Подготовка инфраструктуры для A/B тестирования

### Неделя 3-4: Первый LLM поток
- Интеграция `substituteProductFlow` для замены товаров
- Настройка логирования и fallback стратегии
- Запуск A/B теста: LLM vs правила

### Неделя 5-8: Измерение и оптимизация
- Анализ результатов A/B теста
- Оптимизация промптов и логики
- Настройка budget controls

### Неделя 9+: Масштабирование
- Если ROI положительный — добавление следующего потока
- Постепенное увеличение доли LLM-рекомендаций
- Переход к полноценной архитектуре Flows

## 4.4. Технические детали реализации

### Структура абстракции
```typescript
interface AIRecommendationService {
  getProductSubstitutes(product: Product, userPreferences: UserPreferences): Promise<RecommendationResult>;
  optimizeWeeklyCart(currentCart: CartItem[], userHistory: Order[]): Promise<RecommendationResult>;
}

// Реализации
class SimpleRulesService implements AIRecommendationService { ... }
class LLMBasedService implements AIRecommendationService { ... }
class HybridService implements AIRecommendationService { ... }
```

### Fallback стратегия
1. **Первичный:** Вызов LLM
2. **Вторичный:** Простые правила при сбое LLM
3. **Финальный:** Статичные рекомендации при полном сбое системы

Такой подход обеспечит **гибкость** для быстрого тестирования гипотез, сохраняя при этом **продуманный план** для масштабирования в будущем.

# 5. Мониторинг и контроль LLM

Надёжность и предсказуемость затрат — ключевой фактор для использования LLM в продакшене.  
Мы строим многоуровневую систему мониторинга, которая охватывает технические метрики, бизнес-показатели и соответствие требованиям безопасности.

---

## 5.1. SLI / SLO / SLA для AI-функций

**SLI (Service Level Indicators):**
- Latency P95 (95-й перцентиль времени ответа): ≤ 2 сек
- Success Rate вызовов LLM: ≥ 98%
- Accuracy рекомендаций (по ручной валидации): ≥ 85%
- Стоимость на 1000 запросов: ≤ $2 (mini-модели)

**SLO (Service Level Objectives):**
- 99% пользователей получают ответ < 3 сек
- Средняя стоимость на активного пользователя ≤ $0.15/день
- Доля fallback < 10%

**SLA (Service Level Agreement):**
- Availability AI-сервиса: 99.5%
- Компенсации (B2B): SLA-кредит при простое > 1 часа подряд

---

## 5.2. Runbook для инцидентов

**Инциденты уровня Critical:**
- Ошибки LLM > 5% за 5 мин
- Latency > 5 сек у 20% запросов
- Превышение бюджета на 150%

**Действия:**
1. Автоматический алерт в Slack/Telegram
2. Автоматическое переключение на fallback-правила
3. Проверка статуса API-провайдера (OpenAI/Gemini/Anthropic)
4. При подтверждённом инциденте → уведомление клиента (статус-страница)
5. Пост-инцидентный отчёт (post-mortem) в Confluence

---

## 5.3. Compliance & Security

- **PII Protection:** маскирование персональных данных в логах (имена, телефоны, адреса)
- **Data Retention:** детализированные логи храним ≤ 30 дней
- **GDPR/152-ФЗ:** возможность полного удаления данных пользователя по запросу
- **Prompt Injection Defense:** очистка входных данных от вредоносных инструкций
- **Model Usage Transparency:** документация используемых моделей и провайдеров

---

## 5.4. Roadmap развития мониторинга

**Этап 1 (MVP):**
- Genkit Inspector для локальной отладки
- Unit / integration тесты AI-потоков
- Логирование токенов и latency

**Этап 2 (MVP+):**
- Интеграция с Cloud Logging + Trace
- Метрики SLI в Cloud Monitoring
- Базовые алерты (ошибки, задержки, стоимость)

**Этап 3 (Scale):**
- Экспорт логов в BigQuery + Looker Studio
- Дашборды ROI и бизнес-метрик
- Автоматические правила (отключение убыточных потоков)

**Этап 4 (Enterprise):**
- SLA для B2B клиентов
- Runbook + пост-инцидентные отчёты
- Многоуровневый аудит (безопасность, комплаенс)

---

## 5.5. Актуальные ориентиры по стоимости (2025)

| Модель / тип задач      | Input (1M токенов) | Output (1M токенов) | Средний запрос (500 in + 200 out) | Стоимость 1000 запросов |
|--------------------------|--------------------|---------------------|-----------------------------------|--------------------------|
| GPT-4.1-mini / Flash     | $0.2–0.6           | $0.6–1.2            | ~$0.001–0.003                     | $1–3                    |
| GPT-4.1 / Pro / Claude   | $3–10              | $10–30              | ~$0.02–0.05                       | $20–50                  |

**Наш таргет:**
- Для MVP → ≤ $5 / 1000 запросов (mini-модели, кэширование)
- Для продакшена → ≤ $2 / 1000 запросов
- ROI на LLM-потоки ≥ 1.5 в течение квартала

---

## 5.6. Graceful degradation

- Автоматический переход на правила при проблемах с LLM
- Ограничение затрат на пользователя ($0.30/день)
- Автоматическое отключение неэффективных промптов
- Уведомления в логах и отчёт в аналитике

## 6. Ключевые сценарии работы (Use Cases)
Этот раздел описывает основные пользовательские пути в приложении, сгруппированные по ролям. Сценарии представлены в едином формате, что упрощает их декомпозицию в задачи для последующей разработки.

### 6.1. Обзор ролей и сценариев
| Роль | Категория | Сценарии |
| :--- | :--- | :--- |
| **Гость** | MVP | Просмотр каталога; Добавление товара в корзину; Регистрация/Логин |
| **Клиент** | MVP | Покупка товара; Просмотр истории заказов; Управление профилем; (Будущее: Умная замена товара) |
| **Администратор** | MVP | Управление контентом (товары, категории); Управление заказами |
| **Курьер** | Будущее | Подтверждение доставки; Отслеживание статуса заказа |
| **Руководитель** | Будущее | Просмотр бизнес-аналитики и отчётов |

### 6.2. Сценарии MVP
**Сценарий: Просмотр и покупка товара**
*Роль: Гость / Клиент*

**Предусловия:**
- Каталог товаров загружен в базу данных.
- Пользователь находится на главной странице или в каталоге.

**Основной поток:**
1. Пользователь просматривает каталог.
2. Применяет фильтры по категории, цене или другим характеристикам.
3. Переходит на страницу конкретного продукта.
4. Нажимает кнопку "Добавить в корзину".
5. Система добавляет товар в корзину, которая хранится на стороне клиента.
6. Пользователь переходит в корзину для проверки содержимого.
7. Нажимает кнопку "Оформить заказ".
8. Система отображает форму для ввода данных (ФИО, телефон, адрес).
9. Пользователь заполняет форму и подтверждает заказ.
10. Система создает новый заказ в базе данных со статусом "Новый заказ" и очищает корзину.

**Альтернативные потоки:**
- **Товар закончился:** Если товар отсутствует на складе, система отображает сообщение "Нет в наличии" и не позволяет добавить его в корзину.
- **Некорректные данные:** Если пользователь вводит некорректные данные в форму оформления заказа, система отображает ошибки валидации.

**Результат:**
- В базе данных создан новый заказ со статусом "Новый заказ".
- Пользователь видит экран подтверждения заказа.

**Сценарий: Управление контентом**
*Роль: Администратор*

**Предусловия:**
- Пользователь является администратором и авторизован в системе.
- Существует админ-панель по адресу `/admin`.

**Основной поток:**
1. Администратор переходит на страницу админ-панели (`/admin`).
2. Выбирает раздел "Категории".
3. Нажимает кнопку "Создать новую категорию" и заполняет форму.
4. Система сохраняет категорию в базе данных.
5. Администратор переходит в раздел "Товары".
6. Нажимает "Создать новый товар", заполняет форму и выбирает категорию из выпадающего списка.
7. Система автоматически генерирует SKU на основе префикса категории и сохраняет новый товар.
8. Администратор может редактировать или удалять существующие товары и категории.
9. При удалении категории, к которой привязан хотя бы один товар, система выдаёт ошибку и блокирует удаление.

**Альтернативные потоки:**
- **Неверные данные:** Система блокирует создание или обновление товара/категории, если обязательные поля не заполнены.

**Результат:**
- База данных обновлена: добавлены, отредактированы или удалены товары/категории.
- Администратор видит сообщение об успешном выполнении операции.

### 6.3. Будущие сценарии (LLM & Другие)
**Сценарий: Умная замена товара**
*Роль: Клиент + LLM*

**Предусловия:**
- Клиент оформил заказ, который содержит товар, отсутствующий на складе.
- Подключен LLM-сервис (`substituteProductFlow`).

**Основной поток:**
1. При оформлении заказа система обнаруживает, что товар А закончился.
2. Бизнес-логика вызывает Genkit-поток `substituteProductFlow`, передавая ему: информацию о товаре A, данные о всей корзине и историю покупок клиента.
3. LLM-модель анализирует переданный контекст и предлагает 1-2 наиболее релевантные замены, например, товар B.
4. LLM возвращает ответ в виде строго структурированного JSON.
5. Система получает ответ и отображает его пользователю в интерфейсе: "Товара А нет в наличии. Хотите заменить его на товар B?".
6. Пользователь нажимает "Принять замену", и система обновляет заказ.

**Альтернативные потоки:**
- **LLM не вернул результат:** Если LLM-поток вернул ошибку, система переключается на простую эвристику (например, "Предложить похожий товар из той же категории") или выводит сообщение "Товар А закончился, свяжемся с вами позже".

**Результат:**
- Заказ клиента обновлен с учетом предложенной и принятой замены.
- Пользователь доволен, так как получил решение проблемы.

## 7. Окружение и Эксплуатация (DevOps)

### 7.1. Развертывание (Deployment)

#### Стратегия эволюции платформы

*   **MVP (0-6 месяцев):** Firebase App Hosting - минимальные настройки, быстрый старт
*   **Рост (6-18 месяцев):** Cloud Run - больше контроля, экономия затрат
*   **Масштабирование (18+ месяцев):** GKE - enterprise-grade reliability

#### Критерии перехода между платформами

**Firebase App Hosting → Cloud Run:**
*Переходим когда:*
*   Monthly infrastructure costs > $500 (экономия 30-50% на Cloud Run)
*   Нужны background jobs (email campaigns, batch processing)
*   Требуются custom runtime environments
*   Firebase App Hosting ограничивает рост

*НЕ переходим если:*
*   Команда < 3 разработчиков
*   Нет DevOps экспертизы в команде
*   MVP еще не достиг product-market fit
*   Текущее решение работает стабильно

**Cloud Run → GKE:**
*Переходим когда:*
*   > 5 микросервисов в production
*   Нужны advanced deployment strategies (blue-green, canary)
*   Enterprise compliance требования
*   Complex service mesh необходим

#### CI/CD Pipeline Evolution

**Этап 1 (MVP):**
*Pipeline:*
*   Manual deploy через Firebase CLI
*   Automated tests в GitHub Actions
*   Manual approval для production
*   Rollback: manual restore from backup

**Этап 2 (после product-market fit):**
*Pipeline:*
*   Auto-deploy из main ветки после тестов
*   Preview environments для каждого PR (TTL: 7 дней)
*   Automated rollback при critical errors
*   Infrastructure as Code (Terraform)
*   Feature flags для инкрементальных релизов

### 7.2. Среды (Environments)

#### MVP-конфигурация
*   **Local:** Firebase Studio + моковые данные
*   **Production:** Боевая среда с реальными данными

#### Расширенная конфигурация (после PMF)
*   **Staging:** Полная копия prod с тестовыми данными
*   **Preview:** Динамические среды для feature branches
*   **Production:** Боевая среда с мониторингом и алертами

**Принцип:** Environment parity - все среды используют идентичную конфигурацию инфраструктуры.

### 7.3. Конфигурирование (Configuration)

#### Принципы
*   Строгое разделение кода и конфигурации (12-factor app)
*   Все секреты только через Google Secret Manager
*   Никаких hardcoded значений в коде

#### Инструменты по фазам

**MVP:**
*   `.env` файлы для local development (не коммитятся)
*   `apphosting.yaml` для production secrets
*   Manual secret rotation по необходимости

**Growth:**
*   Google Secret Manager для всех secrets
*   Automated secret rotation (каждые 90 дней)
*   Infrastructure as Code через Terraform

### 7.4. Логгирование и Мониторинг

#### Архитектура логгирования
Единый безопасный логгер со structured logs и request correlation:
```typescript
// src/lib/logger.ts
import { randomUUID } from "crypto";

export const withRequestId = (reqId: string = randomUUID()) => ({
  info: (message: string, context?: object) => {
    console.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      requestId: reqId,
      message,
      service: process.env.K_SERVICE || 'local',
      ...context
    }));
  }
  // ... другие уровни
});
```

#### Startup-Oriented Метрики

**Survival Level (MVP, 0-6 месяцев):**
*   **Availability:**
    *   Failed orders < 5% от общего числа
    *   Жалобы на недоступность < 3 в неделю
    *   Инструменты: UptimeRobot (бесплатно), Google Analytics
*   **Performance:**
    *   LCP < 4 секунды на mobile
    *   Cart abandonment < 70%
    *   Инструменты: Google Search Console, Core Web Vitals
*   **Errors:**
    *   < 10 уникальных JS errors в день
    *   < 5 server errors в день
    *   Payment success rate > 85%
    *   Инструменты: Sentry free tier, Cloud Logging

**Growth Level (6-12 месяцев):**
*   **User Experience:**
    *   7-day retention > 20%
    *   Session duration > 2 минуты для новых пользователей
    *   Returning users > 5 pages за сессию
*   **Business Impact:**
    *   Technical revenue loss < 5% от total
    *   Technical support tickets < 10%
    *   Performance-conversion correlation positive

#### Алерты по приоритету

**Immediate action (SMS/PagerDuty):**
*   Site completely down
*   Payment processing >50% failure rate
*   Database connection failed

**Daily review (Email/Slack):**
*   Performance degradation (LCP +2s)
*   Error rate spike (>20/hour)
*   Conversion drop >20% day-over-day

#### Cost Management

**AI Usage Controls:**
1.  LLM budget limits - первоочередной приоритет
2.  Circuit breakers для AI вызовов
3.  Real-time cost tracking для каждого LLM потока
4.  Soft degradation вместо полного отключения

**Infra Cost Controls:**
*   Cloud Billing export → BigQuery → Dashboard
*   Monthly budget alerts (+20% overspend warning)
*   Cost per Active User KPI (goal: <$0.5/user)

### 7.5. Безопасность (Security)

#### MVP Security (минимально необходимое)
*   IAM принцип минимальных привилегий
*   MFA для всех production аккаунтов
*   Dependency scanning: GitHub Dependabot (бесплатно)
*   Basic secrets management: Google Secret Manager

#### Growth Security (после PMF)
*   SAST: SonarCloud для статического анализа
*   Vulnerability management: Snyk для deep scanning
*   Security audit: ежегодный internal review
*   `npm audit --production` при каждом CI прогоне

**Принцип:** Безопасность важна, но не должна блокировать development velocity на раннем этапе.

### 7.6. Disaster Recovery

#### MVP Backup Strategy
*   **Database:** Automated backups каждые 12 часов (Cloud SQL default)
*   **File storage:** Single-region с manual backup procedures
*   **Configuration:** Version control в Git

#### Recovery Targets (реалистичные для стартапа)
*   **RTO:** 8 часов для полного восстановления (business hours)
*   **RPO:** Максимальная потеря данных 2 часа
*   **Procedure:** Documented runbooks, tested ежемесячно

#### Chaos Testing Light
*Раз в месяц симулировать:*
*   Падение БД
*   Потерю сети
*   Недоступность API

*Проверка:* recovery runbook действительно работает

### 7.7. Resource Allocation Framework

#### 60/20/20 Rule для стартапа
*   **60%** - Core product features (пользовательская ценность)
*   **20%** - Infrastructure/DevOps (минимум для стабильности)
*   **20%** - Technical debt/R&D (эксперименты и улучшения)

#### Decision Framework
*При любом техническом решении:*
1.  Поможет ли привлечь новых пользователей?
2.  Поможет ли удержать существующих?
3.  Критично ли для core value proposition?
4.  Можем ли обойтись без этого 3 месяца?

Если первые 3 ответа "нет", а 4-й "да" - откладываем.

#### Feature Freeze Triggers
*Немедленная остановка новых features:*
*   Site down >2 часов в неделю
*   Payment success rate <80% на 2+ дня
*   > 50 technical support tickets в неделю
*   Core Web Vitals failing для >50% users

---

## 8. Progressive Web App (PWA)

### 8.1. Текущий статус
*   HTTPS enabled, responsive design реализован
*   Next.js App Router для оптимальной производительности
*   Lighthouse Score: Performance 90+, Accessibility 95+
*   PWA-ready foundation без дополнительной работы

### 8.2. Business-Driven PWA Roadmap

#### Критерии для начала PWA развития
*НЕ начинаем PWA пока:*
*   Monthly Active Users < 1000
*   7-day retention < 15%
*   Отсутствует product-market fit

*Начинаем PWA когда:*
*   Stable user growth 20%+ месяц к месяцу
*   Пользователи просят offline функциональность
*   Mobile traffic > 70% от общего

#### Phase 1: Basic PWA (После PMF + 1000 MAU)
*   **Timeline:** 2-3 недели разработки
*   **Investment:** ~40 developer-hours
*   **Deliverables:**
    *   Web App Manifest для home screen installation
    *   Basic Service Worker для offline fallback
    *   Custom splash screens и app icons
    *   Push Notifications через Firebase Messaging
*   **Success Metrics:**
    *   Install rate > 10% активных пользователей за 3 месяца
    *   Installed users retention +15% vs non-installed
*   **Exit Criteria:**
    *   Install rate < 3% после 2 месяцев → прекращаем PWA development
    *   No retention improvement → focus на другие priorities

#### Phase 2: Smart Offline (После Phase 1 success)
*   **Timeline:** 4-6 недель разработки
*   **Investment:** ~120 developer-hours
*   **Deliverables:**
    *   Intelligent caching strategy (stale-while-revalidate)
    *   Offline cart management через IndexedDB
    *   Background sync для delayed order submission
*   **Success Metrics:**
    *   5% sessions частично offline
    *   Offline-initiated orders > 2% от total
    *   Session duration +25% для PWA users

#### Phase 3: Advanced Features (Month 12+)
*   **Timeline:** 6-8 недель разработки
*   **Investment:** ~200 developer-hours
*   **Deliverables:**
    *   Advanced push notifications (segmentation, promotions)
    *   Background updates для product catalog
    *   Optional: Offline AI caching (только если user demand подтверждён)
*   **Success Metrics:**
    *   Push notification CTR > 5%
    *   Offline sessions > 5% от total
    *   Customer satisfaction +0.5 points

### 8.3. Technical Implementation Strategy

#### Performance Considerations
*   Service Worker bundle size < 20KB
*   IndexedDB operations в Web Workers (non-blocking UI)
*   Cache storage management < 50MB per domain
*   Progressive enhancement approach

#### Monitoring и Analytics
*Track:*
*   PWA install events
*   Offline usage patterns
*   Cache hit/miss ratios
*   Service worker error rates
*   Business impact metrics
*Tools:*
*   Google Analytics (PWA events)
*   Workbox Analytics
*   Custom performance marks

### 8.4. Cost-Benefit Analysis

#### Development Investment
*   Phase 1: ~$6,000 (40 hours × $150/hour)
*   Phase 2: ~$18,000 (120 hours × $150/hour)
*   Phase 3: ~$30,000 (200 hours × $150/hour)
*   **Total:** ~$54,000 over 12-18 months

#### Expected Business Returns
*   Phase 1: Install users +15% retention → +$5,000 monthly revenue
*   Phase 2: Offline functionality → +10% conversion → +$8,000 monthly
*   Phase 3: Push notifications → +5% re-engagement → +$3,000 monthly
*   **Total potential monthly lift:** +$16,000
*   **Payback period:** ~4 months after full implementation

#### Risk Mitigation
*   **Technical risk:** Start with proven technologies (Workbox)
*   **Business risk:** Clear exit criteria для каждой фазы
*   **Resource risk:** PWA development только после core product stability
*   **Market risk:** Validate user demand перед major investment

### 8.5. Integration с Overall Product Strategy

#### PWA как Competitive Advantage
*   Faster mobile experience vs competitors
*   Offline functionality unique в food delivery space
*   App-like experience без App Store friction
*   Push notifications без mobile app development costs

#### Alignment с Business Goals
*   **Customer acquisition:** Improved mobile experience
*   **Customer retention:** Offline access, push notifications
*   **Customer lifetime value:** Enhanced engagement через app-like features
*   **Cost efficiency:** PWA cheaper чем native mobile apps

**Key Principle:** PWA развитие следует за business success, не предшествует ему.

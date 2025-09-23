'use server';
/**
 * @fileOverview Поток для ответов на вопросы с использованием внешних источников.
 *
 * Этот файл реализует архитектуру RAG (Retrieval-Augmented Generation).
 * - `askQuestionFlow` - основной поток, который принимает вопрос и ищет на него ответ.
 * - `searchGoogleCloudDocs` - инструмент, который LLM может использовать для поиска информации
 *   в документации Google Cloud.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Определение инструмента для поиска по документации
export const searchGoogleCloudDocs = ai.defineTool(
  {
    name: 'searchGoogleCloudDocs',
    description: 'Искать в документации Google Cloud. Используй, когда пользователь задает вопрос о Google Cloud, Firebase или связанных технологиях.',
    inputSchema: z.object({
      query: z.string().describe('Поисковый запрос для поиска по документации.'),
    }),
    outputSchema: z.string().describe('Результат поиска в формате Markdown.'),
  },
  async ({query}) => {
    console.log(`[Tool] Поиск по документации с запросом: "${query}"`);
    // ЗАГЛУШКА: В реальном приложении здесь будет вызов API поиска
    // (например, Google Custom Search API или embedding-based search).
    // Сейчас мы просто возвращаем фиктивный релевантный ответ.
    if (query.toLowerCase().includes('cloud sql')) {
      return `
        ## Подключение к Cloud SQL из App Hosting

        Для подключения к инстансу Cloud SQL из Firebase App Hosting необходимо:
        1. Указать инстанс в файле apphosting.yaml в секции 'cloudsql'.
        2. Использовать специальный путь для подключения через Unix-сокет: /cloudsql/INSTANCE_CONNECTION_NAME.
        3. Убедиться, что у сервисного аккаунта App Hosting есть роль "Клиент Cloud SQL".

        Источник: Официальная документация Google Cloud.
      `;
    }
    return 'По вашему запросу ничего не найдено. Попробуйте переформулировать.';
  }
);

// Определение промпта, который будет использовать наш инструмент
const questionAnsweringPrompt = ai.definePrompt({
    name: 'questionAnsweringPrompt',
    system: 'Ты — эксперт-помощник, который отвечает на вопросы пользователя. Если для ответа на вопрос тебе нужна информация о Google Cloud или Firebase, используй доступный инструмент `searchGoogleCloudDocs`. В своем ответе всегда ссылайся на источник, если он был получен с помощью инструмента.',
    tools: [searchGoogleCloudDocs],
});


// Определение основного потока
export const askQuestionFlow = ai.defineFlow(
  {
    name: 'askQuestionFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (question) => {
    const llmResponse = await questionAnsweringPrompt(question);
    return llmResponse.text;
  }
);


'use server';
/**
 * @fileOverview Поток для ответов на вопросы с использованием внешних инструментов.
 *
 * - askQuestionFlow - основной поток, который принимает вопрос и использует инструменты.
 * - readProjectLogs - инструмент для чтения локальных логов.
 */

import {ai} from '@/ai/genkit';
import {getLogsAction} from '@/lib/actions/log.actions';
import {z} from 'genkit';

// Определение инструмента для чтения логов проекта
export const readProjectLogs = ai.defineTool(
  {
    name: 'readProjectLogs',
    description: 'Читает последние записи из файла логов проекта. Используй, когда пользователь спрашивает о логах, ошибках или о том, что происходит в системе.',
    inputSchema: z.object({}), // Инструмент не требует входных данных
    outputSchema: z.string().describe('Содержимое файла логов или сообщение об ошибке.'),
  },
  async () => {
    console.log(`[Tool] Вызван инструмент readProjectLogs`);
    const result = await getLogsAction();

    if (result.error) {
      return `Ошибка при получении логов: ${result.error}`;
    }

    if (!result.logs || result.logs.length === 0) {
      return 'Логи пусты или отсутствуют.';
    }

    const logsText = result.logs.join('\n');
    // Возвращаем только последние 2000 символов, чтобы не перегружать контекст LLM
    return logsText.slice(-2000);
  }
);


// Определение промпта, который будет использовать наш инструмент
const questionAnsweringPrompt = ai.definePrompt({
  name: 'questionAnsweringPrompt',
  system: 'Ты — эксперт-помощник, который отвечает на вопросы пользователя о состоянии проекта. Используй доступные инструменты, чтобы получить актуальную информацию.',
  tools: [readProjectLogs],
});


// Определение основного потока
export const askQuestionFlow = ai.defineFlow(
  {
    name: 'askQuestionFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (question) => {
    const llmResponse = await questionAnsweringPrompt.generate({ body: question });
    return llmResponse.text();
  }
);

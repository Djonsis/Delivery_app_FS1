// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // КРИТИЧЕСКИЙ ФИКС №1: Aliases должны быть в 'resolve'
  resolve: {
    alias: {
      // Перенаправляем импорт 'server-only' на наш пустой мок-файл
      'server-only': path.resolve(__dirname, 'test/mocks/server-only.ts'),
      
      // (Опционально) Полезный alias для путей, как в tsconfig.json
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  test: {
    // КРИТИЧЕСКИЙ ФИКС №2: 'node' для серверного кода
    environment: 'node', 
    
    // BEST PRACTICE №1: Явно импортируем 'test', 'expect', 'describe'
    globals: false, 
    
    // BEST PRACTICE №2: Явно указываем, где искать тесты
    include: ['src/**/*.test.{ts,tsx}'],
    
    // (Опционально) Указываем setup-файл, если он вам понадобится
    // setupFiles: ['./test/setup.ts'],
  },
});

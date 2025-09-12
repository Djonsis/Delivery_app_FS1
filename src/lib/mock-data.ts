import type { Product, Category, Order } from './types';

// Используем фиксированную дату для консистентности моковых данных
const MOCK_DATE = new Date('2024-08-28T10:00:00Z').toISOString();

export const mockCategory: Category = {
  id: 'mock-cat-01',
  name: 'Овощи (Тест)',
  slug: 'vegetables-mock',
  sku_prefix: 'МК',
  description: 'Это тестовая категория для локальной разработки.',
  created_at: MOCK_DATE,
  updated_at: MOCK_DATE,
};

export const mockProduct: Product = {
  id: 'mock-prod-01',
  sku: 'МК-001',
  name: 'Помидоры «Бычье Сердце» (Тест)',
  title: 'Помидоры «Бычье Сердце» (Тест)',
  description: 'Сочные и мясистые тестовые помидоры, выращенные в виртуальных условиях. Идеально подходят для отладки интерфейса.',
  price: 199.99,
  currency: 'RUB',
  tags: ['тест', 'отладка'],
  created_at: MOCK_DATE,
  updated_at: MOCK_DATE,
  deleted_at: null,
  category: mockCategory.name,
  category_id: mockCategory.id,
  image_url: 'https://placehold.co/600x400/f87171/ffffff?text=Mock+Tomato',
  imageUrl: 'https://placehold.co/600x400/f87171/ffffff?text=Mock+Tomato',
  rating: 4.8,
  reviews: 123,
  weight: '1кг',
  brand: 'ТестБренд',
  manufacturer: 'МокЗавод',
  min_order_quantity: 0.5,
  step_quantity: 0.5,
  nutrition: {
    calories: 20,
    protein: 0.9,
    fat: 0.2,
    carbs: 4,
  },
  // New fields for weighted products
  is_weighted: true,
  weight_category: 'middle',
  unit: 'kg',
  price_per_unit: 199.99,
  price_unit: 'kg',
};

export const mockOrder: Order = {
    id: 'mock-order-01',
    user_id: 'mock-user-id',
    customer_name: 'Тестовый Покупатель',
    total_amount: 499.50,
    status: 'Собирается',
    cancellation_reason: null,
    created_at: MOCK_DATE,
    updated_at: MOCK_DATE,
}

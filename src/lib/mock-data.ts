import type { Product, Category, Order, WeightTemplate } from './types';

// Используем фиксированную дату для консистентности моковых данных
const MOCK_DATE = new Date('2024-08-28T10:00:00Z').toISOString();

export const mockCategory: Category = {
  id: 'mock-cat-01',
  name: 'Овощи (Тест)',
  slug: 'vegetables-mock',
  sku_prefix: 'МК',
  description: 'Тестовая категория для локальной разработки',
  created_at: MOCK_DATE,
  updated_at: MOCK_DATE,
};

export const mockProduct: Product = {
  id: 'mock-prod-01',
  sku: 'МК-001',
  title: 'Помидоры «Бычье Сердце» (Тест)',
  description: 'Сочные и мясистые тестовые помидоры для отладки интерфейса',
  price: 199.99,
  currency: 'RUB',
  tags: ['тест', 'отладка'],
  created_at: MOCK_DATE,
  updated_at: MOCK_DATE,
  deleted_at: null,

  category: mockCategory.name,
  category_id: mockCategory.id,

  imageUrl: 'https://placehold.co/600x400/f87171/ffffff?text=Mock+Tomato',

  rating: 4.8,
  reviews: 123,

  is_weighted: true,
  unit: 'kg',
  weight_category: 'middle',
  min_order_quantity: 0.5,
  step_quantity: 0.5,
  price_per_unit: 199.99,
  price_unit: 'kg',

  brand: 'ТестБренд',
  manufacturer: 'МокЗавод',
  nutrition: {
    calories: 20,
    protein: 0.9,
    fat: 0.2,
    carbs: 4,
  },
};

export const mockProducts: Product[] = [mockProduct];


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

export const mockTemplates: WeightTemplate[] = [
    {
        id: 'mock-template-kg',
        name: 'Овощи (кг)',
        description: 'Шаблон для овощей, продаваемых на килограммы',
        unit: 'kg',
        min_order_quantity: 0.5,
        step_quantity: 0.1,
        is_active: true,
        created_at: MOCK_DATE,
        updated_at: MOCK_DATE,
    },
    {
        id: 'mock-template-pcs',
        name: 'Штучные товары',
        description: 'Шаблон для товаров, продаваемых поштучно',
        unit: 'pcs',
        min_order_quantity: 1,
        step_quantity: 1,
        is_active: true,
        created_at: MOCK_DATE,
        updated_at: MOCK_DATE,
    },
];
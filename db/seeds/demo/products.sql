-- Demo products seed with valid UUIDs
-- IMPORTANT: This file should run AFTER categories and weight_templates
-- Uses INSERT OR IGNORE for idempotency (SQLite-compatible)

INSERT OR IGNORE INTO products (
  id, 
  sku, 
  title, 
  description, 
  price, 
  currency, 
  category_id, 
  image_url,
  rating,
  reviews,
  is_weighted,
  unit,
  min_order_quantity,
  step_quantity,
  weight_template_id
)
VALUES 
  -- Product 1: Weighted vegetable
  (
    '770e8400-e29b-41d4-a716-446655440001',
    'VEG-001',
    'Помидоры свежие',
    'Спелые сочные помидоры. Идеально подходят для салатов и приготовления соусов.',
    150.00,
    'RUB',
    '550e8400-e29b-41d4-a716-446655440001',  -- Овощи и зелень
    '/images/products/tomatoes.jpg',
    4.7,
    42,
    1,
    'kg',
    0.1,
    0.1,
    '660e8400-e29b-41d4-a716-446655440001'  -- Овощи (кг, шаг 0.1)
  ),
  
  -- Product 2: Weighted fruit
  (
    '770e8400-e29b-41d4-a716-446655440002',
    'FRT-001',
    'Яблоки Гренни Смит',
    'Зеленые яблоки с кисло-сладким вкусом. Отлично подходят для выпечки.',
    180.00,
    'RUB',
    '550e8400-e29b-41d4-a716-446655440002',  -- Фрукты и ягоды
    '/images/products/apples.jpg',
    4.8,
    67,
    1,
    'kg',
    0.05,
    0.05,
    '660e8400-e29b-41d4-a716-446655440002'  -- Фрукты (кг, шаг 0.05)
  ),
  
  -- Product 3: Piece count product (dairy)
  (
    '770e8400-e29b-41d4-a716-446655440003',
    'MLK-001',
    'Молоко "Простоквашино" 3.2%',
    'Натуральное пастеризованное молоко. Объем: 1 литр.',
    85.00,
    'RUB',
    '550e8400-e29b-41d4-a716-446655440003',  -- Молочные продукты
    '/images/products/milk.jpg',
    4.9,
    134,
    0,
    'pcs',
    1.0,
    1.0,
    '660e8400-e29b-41d4-a716-446655440005'  -- Штучный товар
  );
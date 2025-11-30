-- ============================================
-- weight-templates.sql
-- Initial seed data for weight templates
-- ============================================
-- IDEMPOTENT: Safe to run multiple times
-- Uses ON CONFLICT DO NOTHING to skip existing records
-- ============================================

-- Weight templates seed with mass INSERT
-- Uses INSERT OR REPLACE for true UPSERT behavior in SQLite

INSERT OR REPLACE INTO weight_templates (id, name, description, unit, min_order_quantity, step_quantity, is_active, created_at, updated_at)
VALUES 
  -- Template 1: Vegetables (kg, step 0.1)
  (
    '660e8400-e29b-41d4-a716-446655440001',
    'Овощи (кг, шаг 0.1)',
    'Стандартный шаблон для овощей продаваемых на вес',
    'kg',
    0.1,
    0.1,
    1,
    COALESCE((SELECT created_at FROM weight_templates WHERE id = '660e8400-e29b-41d4-a716-446655440001'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  ),
  
  -- Template 2: Fruits (kg, step 0.05)
  (
    '660e8400-e29b-41d4-a716-446655440002',
    'Фрукты (кг, шаг 0.05)',
    'Точный шаблон для легких фруктов и ягод',
    'kg',
    0.05,
    0.05,
    1,
    COALESCE((SELECT created_at FROM weight_templates WHERE id = '660e8400-e29b-41d4-a716-446655440002'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  ),
  
  -- Template 3: Spices (g, step 10)
  (
    '660e8400-e29b-41d4-a716-446655440003',
    'Специи (г, шаг 10)',
    'Шаблон для специй и приправ в граммах',
    'g',
    10,
    10,
    1,
    COALESCE((SELECT created_at FROM weight_templates WHERE id = '660e8400-e29b-41d4-a716-446655440003'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  ),
  
  -- Template 4: Meat (kg, step 0.2)
  (
    '660e8400-e29b-41d4-a716-446655440004',
    'Мясо (кг, шаг 0.2)',
    'Стандартный шаблон для мясной продукции',
    'kg',
    0.2,
    0.2,
    1,
    COALESCE((SELECT created_at FROM weight_templates WHERE id = '660e8400-e29b-41d4-a716-446655440004'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  ),
  
  -- Template 5: Piece count (for non-weighted)
  (
    '660e8400-e29b-41d4-a716-446655440005',
    'Штучный товар',
    'Шаблон для товаров продаваемых поштучно',
    'pcs',
    1.0,
    1.0,
    1,
    COALESCE((SELECT created_at FROM weight_templates WHERE id = '660e8400-e29b-41d4-a716-446655440005'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  );

-- ============================================
-- Seed summary:
-- 5 weight templates created (if not exist)
-- ============================================
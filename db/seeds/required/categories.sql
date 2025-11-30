-- ============================================
-- categories.sql
-- Initial seed data for categories
-- ============================================
-- IDEMPOTENT: Safe to run multiple times
-- Uses ON CONFLICT DO NOTHING to skip existing records
-- ============================================

-- Categories seed with mass INSERT
-- Uses INSERT OR REPLACE for true UPSERT behavior in SQLite
-- Compatible with both SQLite and PostgreSQL

INSERT OR REPLACE INTO categories (id, name, slug, sku_prefix, description, created_at, updated_at)
VALUES 
  -- Vegetables & Greens
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Овощи и зелень',
    'ovoschi-i-zelen',
    'VEG',
    'Свежие овощи, салаты и зелень',
    COALESCE((SELECT created_at FROM categories WHERE id = '550e8400-e29b-41d4-a716-446655440001'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  ),
  
  -- Fruits & Berries
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'Фрукты и ягоды',
    'frukty-i-yagody',
    'FRT',
    'Свежие фрукты, ягоды и экзотические плоды',
    COALESCE((SELECT created_at FROM categories WHERE id = '550e8400-e29b-41d4-a716-446655440002'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  ),
  
  -- Dairy Products
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Молочные продукты',
    'molochnye-produkty',
    'MLK',
    'Молоко, кефир, йогурты, сметана, творог',
    COALESCE((SELECT created_at FROM categories WHERE id = '550e8400-e29b-41d4-a716-446655440003'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  ),
  
  -- Meat & Poultry
  (
    '550e8400-e29b-41d4-a716-446655440004',
    'Мясо и птица',
    'myaso-i-ptitsa',
    'MET',
    'Свежее мясо, птица, полуфабрикаты',
    COALESCE((SELECT created_at FROM categories WHERE id = '550e8400-e29b-41d4-a716-446655440004'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  ),
  
  -- Grocery (dry goods)
  (
    '550e8400-e29b-41d4-a716-446655440005',
    'Бакалея',
    'bakaleya',
    'GRC',
    'Крупы, макароны, мука, сахар, соль, специи',
    COALESCE((SELECT created_at FROM categories WHERE id = '550e8400-e29b-41d4-a716-446655440005'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  );

-- ============================================
-- Seed summary:
-- 5 categories created (if not exist)
-- ============================================
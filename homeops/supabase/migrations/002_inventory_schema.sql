-- ==========================================
-- HOMEOPS - Modulo de Estoque/Inventario
-- ==========================================

-- ==========================================
-- MODULO: GESTAO DE ESTOQUE DOMESTICO
-- ==========================================

CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  location TEXT DEFAULT 'other' CHECK (location IN ('pantry', 'fridge', 'freezer', 'bathroom', 'cleaning', 'other')),
  is_default BOOLEAN DEFAULT FALSE
);

-- Inserir categorias padrao
INSERT INTO inventory_categories (name, icon, color, location, is_default) VALUES
  -- Despensa
  ('Graos e Cereais', 'leaf-outline', '#F59E0B', 'pantry', TRUE),
  ('Massas', 'pizza-outline', '#EF4444', 'pantry', TRUE),
  ('Enlatados', 'cube-outline', '#6B7280', 'pantry', TRUE),
  ('Condimentos', 'flask-outline', '#8B5CF6', 'pantry', TRUE),
  ('Snacks', 'ice-cream-outline', '#EC4899', 'pantry', TRUE),
  ('Bebidas', 'beer-outline', '#0EA5E9', 'pantry', TRUE),
  -- Geladeira
  ('Laticinios', 'cafe-outline', '#FBBF24', 'fridge', TRUE),
  ('Frutas', 'nutrition-outline', '#22C55E', 'fridge', TRUE),
  ('Verduras', 'leaf-outline', '#10B981', 'fridge', TRUE),
  ('Frios', 'snow-outline', '#3B82F6', 'fridge', TRUE),
  -- Freezer
  ('Carnes', 'fast-food-outline', '#DC2626', 'freezer', TRUE),
  ('Congelados', 'snow-outline', '#0EA5E9', 'freezer', TRUE),
  -- Banheiro
  ('Higiene Pessoal', 'body-outline', '#A855F7', 'bathroom', TRUE),
  ('Remedios', 'medkit-outline', '#EF4444', 'bathroom', TRUE),
  -- Limpeza
  ('Limpeza Geral', 'water-outline', '#06B6D4', 'cleaning', TRUE),
  ('Lavanderia', 'shirt-outline', '#8B5CF6', 'cleaning', TRUE),
  -- Outros
  ('Outros', 'ellipsis-horizontal', '#6B7280', 'other', TRUE)
ON CONFLICT DO NOTHING;

-- Itens do inventario/estoque
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES inventory_categories(id),

  -- Detalhes do item
  name TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 0,
  unit TEXT DEFAULT 'un' CHECK (unit IN ('un', 'kg', 'g', 'l', 'ml', 'pack')),

  -- Alertas de estoque baixo
  min_quantity DECIMAL(10,2), -- quantidade minima antes de alerta

  -- Validade
  expiration_date DATE,

  -- Localizacao
  location TEXT DEFAULT 'pantry' CHECK (location IN ('pantry', 'fridge', 'freezer', 'bathroom', 'cleaning', 'other')),

  -- Compra recorrente
  is_recurring BOOLEAN DEFAULT FALSE,
  purchase_interval_days INTEGER, -- a cada X dias
  last_purchase_date DATE,

  -- Extras
  notes TEXT,
  barcode TEXT, -- para futuro scan

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lista de compras
CREATE TABLE IF NOT EXISTS shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'un' CHECK (unit IN ('un', 'kg', 'g', 'l', 'ml', 'pack')),

  is_checked BOOLEAN DEFAULT FALSE,

  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  checked_at TIMESTAMPTZ,

  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  notes TEXT
);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Trigger para updated_at
CREATE TRIGGER inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

-- Politicas para inventory_items
CREATE POLICY "Users can manage inventory items"
  ON inventory_items FOR ALL
  USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- Politicas para shopping_list
CREATE POLICY "Users can manage shopping list"
  ON shopping_list FOR ALL
  USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- Categorias de inventario sao publicas (somente leitura)
CREATE POLICY "Anyone can view inventory categories"
  ON inventory_categories FOR SELECT
  USING (true);

-- ==========================================
-- INDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_inventory_items_household ON inventory_items(household_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON inventory_items(location);
CREATE INDEX IF NOT EXISTS idx_inventory_items_expiration ON inventory_items(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopping_list_household ON shopping_list(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_checked ON shopping_list(is_checked);

-- ==========================================
-- HOMEOPS - Schema Inicial
-- ==========================================

-- Casa/Moradia (para funcionalidade de roommates futuro)
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Casa',
  invite_code TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfis de usuario (extende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  household_id UUID REFERENCES households(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- MODULO: TAREFAS E ROTINAS
-- ==========================================

CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE
);

-- Inserir categorias padrao
INSERT INTO task_categories (name, icon, color, is_default) VALUES
  ('Limpeza', 'water-outline', '#3B82F6', TRUE),
  ('Cozinha', 'restaurant-outline', '#F59E0B', TRUE),
  ('Lavanderia', 'shirt-outline', '#8B5CF6', TRUE),
  ('Organizacao', 'folder-outline', '#10B981', TRUE),
  ('Compras', 'cart-outline', '#EC4899', TRUE),
  ('Outros', 'ellipsis-horizontal', '#6B7280', TRUE)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES task_categories(id),
  title TEXT NOT NULL,
  description TEXT,

  -- Recorrencia
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'custom')),
  recurrence_days INTEGER[], -- [0,1,2,3,4,5,6] para dias da semana
  recurrence_interval INTEGER DEFAULT 1, -- a cada X dias/semanas/meses

  -- Datas
  due_date DATE,
  due_time TIME,
  next_occurrence DATE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),

  -- Atribuicao (para roommates)
  assigned_to UUID REFERENCES auth.users(id),

  -- Metadados
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 3), -- 1=baixa, 2=media, 3=alta
  estimated_minutes INTEGER,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historico de conclusoes (para tracking e gamificacao futura)
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- ==========================================
-- MODULO: MANUTENCOES PREVENTIVAS
-- ==========================================

CREATE TABLE IF NOT EXISTS maintenance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE
);

INSERT INTO maintenance_categories (name, icon, color, is_default) VALUES
  ('Ar Condicionado', 'snow-outline', '#0EA5E9', TRUE),
  ('Eletrica', 'flash-outline', '#FBBF24', TRUE),
  ('Hidraulica', 'water-outline', '#3B82F6', TRUE),
  ('Eletrodomesticos', 'tv-outline', '#8B5CF6', TRUE),
  ('Veiculo', 'car-outline', '#EF4444', TRUE),
  ('Dedetizacao', 'bug-outline', '#84CC16', TRUE),
  ('Outros', 'construct-outline', '#6B7280', TRUE)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS maintenance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES maintenance_categories(id),

  -- Detalhes do item
  name TEXT NOT NULL, -- "Ar condicionado do quarto"
  brand TEXT,
  model TEXT,
  purchase_date DATE,
  warranty_until DATE,

  -- Manutencao recorrente
  maintenance_interval_months INTEGER, -- a cada X meses
  last_maintenance_date DATE,
  next_maintenance_date DATE,

  -- Fornecedor preferido
  preferred_provider TEXT,
  provider_phone TEXT,

  -- Documentos
  manual_url TEXT,
  receipt_url TEXT,

  -- Alertas
  alert_days_before INTEGER DEFAULT 7,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historico de manutencoes realizadas
CREATE TABLE IF NOT EXISTS maintenance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES maintenance_items(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL,
  description TEXT,
  cost DECIMAL(10,2),
  provider TEXT,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- MODULO: FINANCAS DOMESTICAS
-- ==========================================

CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT CHECK (type IN ('expense', 'income')),
  is_default BOOLEAN DEFAULT FALSE
);

INSERT INTO finance_categories (name, icon, color, type, is_default) VALUES
  ('Moradia', 'home-outline', '#3B82F6', 'expense', TRUE),
  ('Alimentacao', 'restaurant-outline', '#F59E0B', 'expense', TRUE),
  ('Transporte', 'car-outline', '#EF4444', 'expense', TRUE),
  ('Utilidades', 'flash-outline', '#FBBF24', 'expense', TRUE),
  ('Lazer', 'game-controller-outline', '#8B5CF6', 'expense', TRUE),
  ('Saude', 'heart-outline', '#10B981', 'expense', TRUE),
  ('Outros', 'ellipsis-horizontal', '#6B7280', 'expense', TRUE),
  ('Salario', 'wallet-outline', '#22C55E', 'income', TRUE),
  ('Freelance', 'briefcase-outline', '#14B8A6', 'income', TRUE)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES finance_categories(id),

  name TEXT NOT NULL, -- "Aluguel", "Internet", "Luz"
  amount DECIMAL(10,2) NOT NULL,

  -- Recorrencia
  is_recurring BOOLEAN DEFAULT TRUE,
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31), -- dia do vencimento

  -- Status do mes atual
  current_month_status TEXT DEFAULT 'pending' CHECK (current_month_status IN ('pending', 'paid', 'overdue')),
  current_month_paid_at TIMESTAMPTZ,
  current_month_paid_amount DECIMAL(10,2),

  -- Alertas
  alert_days_before INTEGER DEFAULT 3,

  -- Dados extras
  payment_method TEXT,
  auto_debit BOOLEAN DEFAULT FALSE,
  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transacoes avulsas (gastos nao recorrentes)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES finance_categories(id),

  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT CHECK (type IN ('expense', 'income')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Opcional: vincular a uma conta
  bill_id UUID REFERENCES bills(id),

  notes TEXT,
  receipt_url TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- FUNCOES E TRIGGERS
-- ==========================================

-- Funcao: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER maintenance_items_updated_at BEFORE UPDATE ON maintenance_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bills_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Politicas para profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Politicas para households
CREATE POLICY "Users can view own household"
  ON households FOR SELECT
  USING (
    id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create household"
  ON households FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own household"
  ON households FOR UPDATE
  USING (
    id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- Politica generica para tabelas que usam household_id
CREATE POLICY "Users can view household tasks"
  ON tasks FOR ALL
  USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage task completions"
  ON task_completions FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE household_id IN (
        SELECT household_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage maintenance items"
  ON maintenance_items FOR ALL
  USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage maintenance history"
  ON maintenance_history FOR ALL
  USING (
    item_id IN (
      SELECT id FROM maintenance_items WHERE household_id IN (
        SELECT household_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage bills"
  ON bills FOR ALL
  USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage transactions"
  ON transactions FOR ALL
  USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- Categorias sao publicas (somente leitura)
CREATE POLICY "Anyone can view task categories"
  ON task_categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view maintenance categories"
  ON maintenance_categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view finance categories"
  ON finance_categories FOR SELECT
  USING (true);

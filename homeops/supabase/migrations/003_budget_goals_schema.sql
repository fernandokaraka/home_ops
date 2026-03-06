-- ==========================================
-- HOMEOPS - Modulo de Orcamento e Metas Financeiras
-- ==========================================

-- ==========================================
-- MODULO: PLANEJAMENTO FINANCEIRO
-- ==========================================

-- Orcamentos mensais por categoria
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES finance_categories(id),

  -- Periodo (primeiro dia do mes: 2024-01-01, 2024-02-01, etc)
  month DATE NOT NULL,

  -- Valor orcado
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),

  -- Observacoes
  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Evitar duplicatas (uma categoria por mes por household)
  UNIQUE(household_id, category_id, month)
);

-- Metas financeiras
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

  -- Detalhes da meta
  name TEXT NOT NULL,
  description TEXT,

  -- Valores
  target_amount DECIMAL(10,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(10,2) DEFAULT 0 CHECK (current_amount >= 0),

  -- Prazo
  target_date DATE NOT NULL,

  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,

  -- Metadados
  icon TEXT DEFAULT 'trending-up-outline',
  color TEXT DEFAULT '#10B981',

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Trigger para updated_at
CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER financial_goals_updated_at BEFORE UPDATE ON financial_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- Politicas para budgets
CREATE POLICY "Users can manage budgets"
  ON budgets FOR ALL
  USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- Politicas para financial_goals
CREATE POLICY "Users can manage financial goals"
  ON financial_goals FOR ALL
  USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- ==========================================
-- INDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_budgets_household ON budgets(household_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household_month ON budgets(household_id, month);

CREATE INDEX IF NOT EXISTS idx_financial_goals_household ON financial_goals(household_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(status);
CREATE INDEX IF NOT EXISTS idx_financial_goals_target_date ON financial_goals(target_date);

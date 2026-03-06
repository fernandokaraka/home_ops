-- ==========================================
-- HOMEOPS - Financas por Pessoa
-- ==========================================
-- Adiciona rastreamento de quem pagou e divisao de despesas entre membros

-- ==========================================
-- ALTERACOES NA TABELA TRANSACTIONS
-- ==========================================

-- Adicionar coluna paid_by para rastrear quem fez o pagamento
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES auth.users(id);

-- ==========================================
-- TABELA DE DIVISAO DE TRANSACOES
-- ==========================================

-- Tabela para dividir transacoes entre membros da casa
CREATE TABLE IF NOT EXISTS transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id),
  share_amount DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Garantir que cada membro aparece apenas uma vez por transacao
  UNIQUE(transaction_id, member_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;

-- Politica para transaction_splits (usuarios podem gerenciar divisoes da sua casa)
CREATE POLICY "Users can manage transaction splits"
  ON transaction_splits FOR ALL
  USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE household_id IN (
        SELECT household_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ==========================================
-- INDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_transactions_paid_by ON transactions(paid_by);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_member ON transaction_splits(member_id);

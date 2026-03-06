-- ==========================================
-- HOMEOPS - Modulo de Anexos e Documentos
-- ==========================================

-- ==========================================
-- MODULO: ANEXOS (FOTOS, PDFs, DOCUMENTOS)
-- ==========================================

-- Tabela de anexos (suporta multiplos tipos de entidades)
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

  -- Vinculo polimórfico (pode referenciar maintenance_items, transactions ou tasks)
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('maintenance_item', 'transaction', 'task')),

  -- Detalhes do arquivo
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- URL no Supabase Storage
  file_type TEXT NOT NULL, -- 'image/jpeg', 'image/png', 'application/pdf', etc
  file_size INTEGER, -- tamanho em bytes

  -- Metadados opcionais
  description TEXT,

  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Trigger para updated_at
CREATE TRIGGER attachments_updated_at BEFORE UPDATE ON attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Politicas para attachments (isolamento por household)
CREATE POLICY "Users can manage household attachments"
  ON attachments FOR ALL
  USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- ==========================================
-- INDICES PARA PERFORMANCE
-- ==========================================

-- Indice para buscar anexos por entidade pai (item_id + item_type)
CREATE INDEX IF NOT EXISTS idx_attachments_item ON attachments(item_id, item_type);

-- Indice para filtrar anexos por household (para queries gerais)
CREATE INDEX IF NOT EXISTS idx_attachments_household ON attachments(household_id);

-- Indice para buscar por tipo de arquivo (util para filtrar imagens vs PDFs)
CREATE INDEX IF NOT EXISTS idx_attachments_file_type ON attachments(file_type);

-- Indice composto para queries comuns (household + item_type)
CREATE INDEX IF NOT EXISTS idx_attachments_household_type ON attachments(household_id, item_type);

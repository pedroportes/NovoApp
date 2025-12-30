-- Add financial control columns to Service Orders
ALTER TABLE ordens_servico 
ADD COLUMN IF NOT EXISTS paga_ao_tecnico BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE;

-- Create index for faster financial queries
CREATE INDEX IF NOT EXISTS idx_os_financeiro ON ordens_servico(tecnico_id, status, paga_ao_tecnico);

-- Ensure financeiro_fluxo exists (just in case)
CREATE TABLE IF NOT EXISTS financeiro_fluxo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  empresa_id UUID NOT NULL,
  tecnico_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ADIANTAMENTO', 'BONUS', 'FECHAMENTO')),
  valor DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PROCESSADO'))
);

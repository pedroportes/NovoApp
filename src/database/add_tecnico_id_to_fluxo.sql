-- Adiciona a coluna tecnico_id à tabela financeiro_fluxo
-- Necessário para vincular adiantamentos e fechamentos a técnicos específicos

ALTER TABLE public.financeiro_fluxo
ADD COLUMN IF NOT EXISTS tecnico_id UUID REFERENCES usuarios(id);

-- Index para melhorar performance de queries por técnico
CREATE INDEX IF NOT EXISTS idx_fluxo_tecnico ON public.financeiro_fluxo(tecnico_id);

-- Confirmar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'financeiro_fluxo';

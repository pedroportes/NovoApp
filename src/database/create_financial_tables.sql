-- PASSO 1: Corrigir tabela despesas_tecnicos existente
-- Adicionar colunas faltantes

ALTER TABLE public.despesas_tecnicos ADD COLUMN IF NOT EXISTS tecnico_id UUID;
ALTER TABLE public.despesas_tecnicos ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.despesas_tecnicos ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.despesas_tecnicos ADD COLUMN IF NOT EXISTS valor DECIMAL(10,2);
ALTER TABLE public.despesas_tecnicos ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'outros';
ALTER TABLE public.despesas_tecnicos ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pendente';
ALTER TABLE public.despesas_tecnicos ADD COLUMN IF NOT EXISTS comprovante_url TEXT;
ALTER TABLE public.despesas_tecnicos ADD COLUMN IF NOT EXISTS aprovado_por UUID;
ALTER TABLE public.despesas_tecnicos ADD COLUMN IF NOT EXISTS observacao TEXT;
ALTER TABLE public.despesas_tecnicos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Indices
CREATE INDEX IF NOT EXISTS idx_despesas_tecnicos_empresa ON public.despesas_tecnicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_despesas_tecnicos_tecnico ON public.despesas_tecnicos(tecnico_id);

-- RLS
ALTER TABLE public.despesas_tecnicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "despesas_select" ON public.despesas_tecnicos;
DROP POLICY IF EXISTS "despesas_insert" ON public.despesas_tecnicos;
DROP POLICY IF EXISTS "despesas_update" ON public.despesas_tecnicos;

CREATE POLICY "despesas_select" ON public.despesas_tecnicos
    FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()));

CREATE POLICY "despesas_insert" ON public.despesas_tecnicos
    FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()));

CREATE POLICY "despesas_update" ON public.despesas_tecnicos
    FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()));

-- PASSO 2: Criar tabela historico_comissoes
CREATE TABLE IF NOT EXISTS public.historico_comissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    tecnico_id UUID NOT NULL,
    ordem_servico_id UUID,
    valor_comissao DECIMAL(10,2) NOT NULL,
    percentual_aplicado DECIMAL(5,2),
    status_pagamento VARCHAR(20) DEFAULT 'a_pagar',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.historico_comissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comissoes_all" ON public.historico_comissoes;
CREATE POLICY "comissoes_all" ON public.historico_comissoes
    FOR ALL USING (empresa_id IN (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()));

-- PASSO 3: Criar tabela financeiro_fluxo
CREATE TABLE IF NOT EXISTS public.financeiro_fluxo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    tecnico_id UUID,
    tipo VARCHAR(20) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50),
    forma_pagamento VARCHAR(50),
    status VARCHAR(20) DEFAULT 'PENDENTE',
    data_lancamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.financeiro_fluxo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fluxo_all" ON public.financeiro_fluxo;
CREATE POLICY "fluxo_all" ON public.financeiro_fluxo
    FOR ALL USING (empresa_id IN (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()));

SELECT 'OK' AS resultado;

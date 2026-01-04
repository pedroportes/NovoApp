
-- Garantir que a tabela financeiro_fluxo existe para evitar erros na página Financeira
CREATE TABLE IF NOT EXISTS public.financeiro_fluxo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    empresa_id UUID NOT NULL,
    tipo TEXT NOT NULL, -- 'ENTRADA', 'SAIDA', 'COMISSAO', 'ADIANTAMENTO', 'BONUS', 'FECHAMENTO'
    valor NUMERIC(10,2) NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT,
    data_lancamento DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'realizado'
);

-- Ativar RLS
ALTER TABLE public.financeiro_fluxo ENABLE ROW LEVEL SECURITY;

-- Permissões
DROP POLICY IF EXISTS "Fluxo permissions" ON public.financeiro_fluxo;
CREATE POLICY "Fluxo permissions" ON public.financeiro_fluxo
    FOR ALL
    USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid)
    WITH CHECK (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

-- Index
CREATE INDEX IF NOT EXISTS idx_fluxo_empresa ON public.financeiro_fluxo(empresa_id);

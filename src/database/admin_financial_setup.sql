
-- 1. Create veiculos table
CREATE TABLE IF NOT EXISTS public.veiculos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    empresa_id UUID NOT NULL, 
    placa TEXT NOT NULL,
    modelo TEXT NOT NULL,
    ano INTEGER,
    UNIQUE(empresa_id, placa)
);

-- 2. Create despesas_tecnicos table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.despesas_tecnicos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    empresa_id UUID NOT NULL,
    tecnico_id UUID, -- Nullable for Admin expenses
    descricao TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    categoria TEXT,
    data_gasto DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pendente', -- 'pago', 'pendente'
    status_aprovacao TEXT DEFAULT 'pendente', -- 'aprovado', 'pendente', 'rejeitado'
    -- New columns
    placa_carro TEXT,
    origem_pagamento TEXT DEFAULT 'empresa_caixa', -- 'empresa_caixa' or 'reembolso'
    tipo_despesa TEXT DEFAULT 'outros' -- 'manutencao', 'combustivel', 'outros'
);

-- 3. Enable RLS
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_tecnicos ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Veiculos
DROP POLICY IF EXISTS "Veiculos permissions" ON public.veiculos;
CREATE POLICY "Veiculos permissions" ON public.veiculos
    FOR ALL
    USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid)
    WITH CHECK (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

-- Despesas Tecnicos
DROP POLICY IF EXISTS "Despesas permissions" ON public.despesas_tecnicos;
CREATE POLICY "Despesas permissions" ON public.despesas_tecnicos
    FOR ALL
    USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid)
    WITH CHECK (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

-- 5. Add indexes
CREATE INDEX IF NOT EXISTS idx_veiculos_empresa ON public.veiculos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_despesas_empresa ON public.despesas_tecnicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_despesas_status_aprovacao ON public.despesas_tecnicos(status_aprovacao);

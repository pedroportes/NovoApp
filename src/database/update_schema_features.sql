-- Add 'placa_carro' to users for vehicle tracking
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS placa_carro TEXT;

-- Add 'fotos' (JSONB for before/after) and 'assinatura_cliente_url' to service orders
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS assinatura_cliente_url TEXT;

-- Add 'placa_carro' to expenses if useful for tracking which car generated the expense
ALTER TABLE public.despesas_tecnicos 
ADD COLUMN IF NOT EXISTS placa_carro TEXT;

-- Ensure 'percentual_comissao' is correctly typed if legal (already validated as numeric, but safe to ignore)
-- COMMENT: 'percentual_comissao' exists and is numeric.

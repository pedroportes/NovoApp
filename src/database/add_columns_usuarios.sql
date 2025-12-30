-- Adiciona colunas faltantes na tabela usuarios
-- Execute no SQL Editor do Supabase

-- Primeiro adiciona as colunas que estao faltando
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS nome_completo TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS percentual_comissao NUMERIC DEFAULT 0;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS salario_base NUMERIC DEFAULT 0;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS placa_carro TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT true;

SELECT 'Colunas adicionadas!' AS resultado;

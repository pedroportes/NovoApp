-- Migration: Add Focus NFe columns to empresas table
-- Essa migration adiciona os campos necessários para cada empresa configurar sua própria API da Focus NFe.

ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS focus_nfe_token TEXT, -- Token de produção ou homologação
ADD COLUMN IF NOT EXISTS focus_nfe_ambiente TEXT DEFAULT 'homologacao' CHECK (focus_nfe_ambiente IN ('homologacao', 'producao')),
ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT, -- Obrigatório para emissão de NFe
ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT, -- Para NFSe (serviços)
ADD COLUMN IF NOT EXISTS regime_tributario TEXT; -- Simples Nacional, Lucro Presumido, etc.

-- Comentários para documentação
COMMENT ON COLUMN public.empresas.focus_nfe_token IS 'Token da API Focus NFe configurado pelo usuário.';
COMMENT ON COLUMN public.empresas.focus_nfe_ambiente IS 'Ambiente de emissão: homologacao (testes) ou producao (valendo).';

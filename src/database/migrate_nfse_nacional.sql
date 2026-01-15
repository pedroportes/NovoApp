-- Migration: Suporte a NFSe Nacional
-- Adiciona campos necessários para emissão no novo padrão nacional

-- 1. Empresas: Flag para ativar e código IBGE do município
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS usa_nfse_nacional BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS codigo_municipio TEXT;

COMMENT ON COLUMN public.empresas.usa_nfse_nacional IS 'Indica se a empresa emite NFSe pelo sistema Nacional (v2/nfse_nacional)';
COMMENT ON COLUMN public.empresas.codigo_municipio IS 'Código IBGE do município da empresa (7 dígitos)';

-- 2. Serviços: Código de Tributação Nacional (substitui LC116 em alguns casos no padrão novo)
ALTER TABLE public.servicos
ADD COLUMN IF NOT EXISTS codigo_tributacao_nacional TEXT;

COMMENT ON COLUMN public.servicos.codigo_tributacao_nacional IS 'Código de tributação nacional do serviço (ex: 14.01.01). Necessário para NFSe Nacional.';

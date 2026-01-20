-- Migration: Adicionar campos Webmania e renomear estrutura para NF genérica
-- Mantém compatibilidade com campos existentes

-- 1. Adicionar campos Webmania na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS webmania_access_token TEXT,
ADD COLUMN IF NOT EXISTS webmania_ambiente TEXT DEFAULT 'homologacao',
ADD COLUMN IF NOT EXISTS webmania_classe_imposto TEXT,
ADD COLUMN IF NOT EXISTS webmania_habilitado BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.empresas.webmania_access_token IS 'Access Token da API Webmania v2';
COMMENT ON COLUMN public.empresas.webmania_ambiente IS 'Ambiente Webmania: producao ou homologacao';
COMMENT ON COLUMN public.empresas.webmania_classe_imposto IS 'REF da classe de imposto padrão (ex: REF000001)';
COMMENT ON COLUMN public.empresas.webmania_habilitado IS 'Se a emissão via Webmania está ativa';

-- 2. Adicionar campo UUID na tabela ordens_servico (usado pela Webmania)
ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS nf_uuid TEXT,
ADD COLUMN IF NOT EXISTS nf_codigo_verificacao TEXT;

COMMENT ON COLUMN public.ordens_servico.nf_uuid IS 'UUID da nota fiscal na Webmania';
COMMENT ON COLUMN public.ordens_servico.nf_codigo_verificacao IS 'Código de verificação da NFS-e';

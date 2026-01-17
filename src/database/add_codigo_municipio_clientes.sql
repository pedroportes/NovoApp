-- Migration: Adicionar código IBGE do município aos clientes
-- Data: 2026-01-17
-- Objetivo: Permitir código de município dinâmico para emissão de NFSe

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS codigo_municipio TEXT;

COMMENT ON COLUMN public.clientes.codigo_municipio IS 'Código IBGE do município do cliente (7 dígitos). Exemplo: 4106902 (Curitiba), 3550308 (São Paulo)';

-- Para clientes do PR sem código, usar código de Curitiba como padrão
UPDATE public.clientes 
SET codigo_municipio = '4106902' 
WHERE codigo_municipio IS NULL 
  AND (cidade ILIKE '%curitiba%' OR uf = 'PR');

-- Códigos IBGE de referência (capitais):
-- AC: 1200401 (Rio Branco)
-- AL: 2704302 (Maceió)
-- AP: 1600303 (Macapá)
-- AM: 1302603 (Manaus)
-- BA: 2927408 (Salvador)
-- CE: 2304400 (Fortaleza)
-- DF: 5300108 (Brasília)
-- ES: 3205309 (Vitória)
-- GO: 5208707 (Goiânia)
-- MA: 2111300 (São Luís)
-- MT: 5103403 (Cuiabá)
-- MS: 5002704 (Campo Grande)
-- MG: 3106200 (Belo Horizonte)
-- PA: 1501402 (Belém)
-- PB: 2507507 (João Pessoa)
-- PR: 4106902 (Curitiba)
-- PE: 2611606 (Recife)
-- PI: 2211001 (Teresina)
-- RJ: 3304557 (Rio de Janeiro)
-- RN: 2408102 (Natal)
-- RS: 4314902 (Porto Alegre)
-- RO: 1100205 (Porto Velho)
-- RR: 1400100 (Boa Vista)
-- SC: 4205407 (Florianópolis)
-- SP: 3550308 (São Paulo)
-- SE: 2800308 (Aracaju)
-- TO: 1721000 (Palmas)

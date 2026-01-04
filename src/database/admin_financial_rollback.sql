
-- ROLLBACK SCRIPT - USE WITH CAUTION
-- This script reverses the changes made by admin_financial_setup.sql

-- 1. Drop the veiculos table
-- WARMING: This will DELETE all data in the veiculos table
DROP TABLE IF EXISTS public.veiculos;

-- 2. Remove columns from despesas_tecnicos
-- WARNING: This will DELETE data in these specific columns
ALTER TABLE public.despesas_tecnicos 
DROP COLUMN IF EXISTS placa_carro,
DROP COLUMN IF EXISTS origem_pagamento,
DROP COLUMN IF EXISTS tipo_despesa;

-- 3. Drop Indexes (Optional, usually dropped with table/columns but good to be sure)
DROP INDEX IF EXISTS idx_veiculos_empresa;
DROP INDEX IF EXISTS idx_despesas_modelo;

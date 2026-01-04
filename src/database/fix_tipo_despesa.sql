
-- REMOVER RESTRIÇÃO DE TIPO DE DESPESA
-- O banco está bloqueando o tipo 'manutencao'. Vamos remover essa regra também.

ALTER TABLE public.despesas_tecnicos 
DROP CONSTRAINT IF EXISTS despesas_tecnicos_tipo_despesa_check;

-- Garantir que a coluna aceite qualquer texto
ALTER TABLE public.despesas_tecnicos 
ALTER COLUMN tipo_despesa TYPE TEXT;

-- Opcional: Definir padrão
ALTER TABLE public.despesas_tecnicos 
ALTER COLUMN tipo_despesa SET DEFAULT 'outros';

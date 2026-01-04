
-- TENTATIVA DE LIMPEZA GERAL DE VEÍCULOS E CORREÇÃO DE PERMISSÃO

-- 1. Limpar tabela de veículos completamente (Como admin/postgres isso deve ignorar RLS se usar TRUNCATE)
TRUNCATE TABLE public.veiculos RESTART IDENTITY CASCADE;

-- 2. Garantir que você é o 'dono' de tudo (pode ajudar com o erro de salvar)
GRANT ALL ON TABLE public.veiculos TO authenticated;
GRANT ALL ON TABLE public.veiculos TO service_role;
GRANT ALL ON TABLE public.despesas_tecnicos TO authenticated;
GRANT ALL ON TABLE public.despesas_tecnicos TO service_role;

-- 3. Confirmar a remoção da trava de pagamento (reforço)
ALTER TABLE public.despesas_tecnicos 
DROP CONSTRAINT IF EXISTS despesas_tecnicos_origem_pagamento_check;

ALTER TABLE public.despesas_tecnicos 
ALTER COLUMN origem_pagamento TYPE TEXT;

ALTER TABLE public.despesas_tecnicos 
ALTER COLUMN origem_pagamento DROP NOT NULL;

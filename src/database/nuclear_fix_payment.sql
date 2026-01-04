
-- NUCLEAR FIX: Forçar a remoção de qualquer restrição na coluna origem_pagamento

-- 1. Tentar remover a constraint pelo nome exato (mais uma vez)
ALTER TABLE public.despesas_tecnicos 
DROP CONSTRAINT IF EXISTS despesas_tecnicos_origem_pagamento_check;

-- 2. Tentar remover variações comuns de nome (caso o banco tenha criado automático diferente)
ALTER TABLE public.despesas_tecnicos 
DROP CONSTRAINT IF EXISTS despesas_tecnicos_origem_pagamento_check1;

ALTER TABLE public.despesas_tecnicos 
DROP CONSTRAINT IF EXISTS ck_despesas_tecnicos_origem_pagamento;

-- 3. FORÇAR a mudança do tipo da coluna para TEXT (isso remove validações de enum/tamanho)
ALTER TABLE public.despesas_tecnicos 
ALTER COLUMN origem_pagamento TYPE TEXT;

-- 4. Garantir que não é obrigatório
ALTER TABLE public.despesas_tecnicos 
ALTER COLUMN origem_pagamento DROP NOT NULL;

-- 5. Definir o padrão como 'outros' para evitar nulls futuros
ALTER TABLE public.despesas_tecnicos 
ALTER COLUMN origem_pagamento SET DEFAULT 'outros';

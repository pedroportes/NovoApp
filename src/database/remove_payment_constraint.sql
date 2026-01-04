
-- Solução Definitiva: Remover a restrição de verificação (CHECK constraint)
-- Isso vai permitir que o sistema salve qualquer valor na coluna 'origem_pagamento'
-- evitando o erro de "empresa_caixa".

ALTER TABLE public.despesas_tecnicos 
DROP CONSTRAINT IF EXISTS despesas_tecnicos_origem_pagamento_check;

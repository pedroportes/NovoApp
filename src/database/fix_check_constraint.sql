
-- Remover a restrição antiga que bloqueava 'empresa_caixa'
ALTER TABLE public.despesas_tecnicos 
DROP CONSTRAINT IF EXISTS despesas_tecnicos_origem_pagamento_check;

-- Adicionar nova restrição aceitando os novos tipos
ALTER TABLE public.despesas_tecnicos 
ADD CONSTRAINT despesas_tecnicos_origem_pagamento_check 
CHECK (origem_pagamento IN (
    'dinheiro', 
    'pix', 
    'cartao_credito', 
    'cartao_debito', 
    'boleto', 
    'transferencia', 
    'reembolso', 
    'empresa_caixa', -- AQUI ESTÁ O QUE FALTAVA
    'outros'
));

-- ===================================================
-- CORRIGIR CARGO DE TODOS OS TÉCNICOS
-- ===================================================

-- 1. PRIMEIRO: Listar todos os usuários para você identificar quem é técnico
SELECT 
    id,
    email,
    nome_completo as nome,
    cargo,
    created_at
FROM public.usuarios
ORDER BY created_at DESC;

-- 2. Opção A: Corrigir técnicos por LISTA DE EMAILS
-- (Substitua os emails pelos emails reais dos seus técnicos)
/*
UPDATE public.usuarios
SET cargo = 'tecnico'
WHERE email IN (
    'pedrosportesfinal@gmail.com',
    'tecnico1@empresa.com',
    'tecnico2@empresa.com'
    -- Adicione mais emails aqui
);
*/

-- 3. Opção B: Corrigir TODOS exceto o admin principal
-- (Use apenas se você tiver certeza de qual é o email do admin)
/*
UPDATE public.usuarios
SET cargo = 'tecnico'
WHERE email != 'admin@flowdrain.com'  -- SUBSTITUA pelo email do seu admin
  AND cargo != 'tecnico';  -- Não altera quem já está correto
*/

-- 4. Opção C: Corrigir técnicos por padrão de email
-- Exemplo: todos que NÃO são 'admin@' viram técnicos
/*
UPDATE public.usuarios
SET cargo = 'tecnico'
WHERE email NOT LIKE 'admin@%'
  AND cargo != 'tecnico';
*/

-- 5. VERIFICAR: Listar situação final
SELECT 
    cargo,
    COUNT(*) as quantidade,
    STRING_AGG(email, ', ') as emails
FROM public.usuarios
GROUP BY cargo;

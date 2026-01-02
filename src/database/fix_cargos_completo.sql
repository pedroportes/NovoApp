-- ===================================================
-- CORREÇÃO COMPLETA DE CARGOS
-- ===================================================

-- 1. CORRIGIR admin@flowdrain.com para ADMIN (CRÍTICO!)
UPDATE public.usuarios
SET cargo = 'admin'
WHERE email = 'admin@flowdrain.com';

-- 2. CORRIGIR possíveis admins que deveriam ser técnicos
-- (Verifique a lista abaixo e remova os emails que DEVEM ser admin)
UPDATE public.usuarios
SET cargo = 'tecnico'
WHERE email IN (
    'movedenovogmail.com',
    'pedrosportes@gmail.com',
    'desentupidorabaixa@gmail.com',
    'pedrosportesteste@gmail.com'
    -- Adicione ou remova conforme necessário
)
AND cargo = 'admin';

-- 3. GARANTIR que o admin principal está correto
-- (Substitua pelo SEU email de admin se não for pedrosporteste@gmail.com)
UPDATE public.usuarios
SET cargo = 'admin'
WHERE email IN (
    'admin@flowdrain.com',
    'pedrosporteste@gmail.com',  -- Parece ser o admin principal
    'admin@teste.com'
);

-- 4. VERIFICAR resultado final
SELECT 
    cargo,
    COUNT(*) as quantidade
FROM public.usuarios
GROUP BY cargo;

-- 5. LISTAR todos admins (para você conferir)
SELECT email, nome_completo, cargo
FROM public.usuarios
WHERE cargo = 'admin'
ORDER BY email;

-- 6. LISTAR todos técnicos (para você conferir)
SELECT email, nome_completo, cargo
FROM public.usuarios  
WHERE cargo = 'tecnico'
ORDER BY email;

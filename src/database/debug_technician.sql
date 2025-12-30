-- =====================================================
-- SCRIPT DE DEBUG - Verificar criação de técnico
-- =====================================================
-- Execute este script para verificar se o técnico foi criado

-- 1. Verificar se o técnico aparece na tabela usuarios
SELECT 
    id,
    email,
    nome,
    cargo,
    empresa_id,
    created_at
FROM public.usuarios
WHERE cargo = 'tecnico'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Verificar se existe no auth.users
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    encrypted_password IS NOT NULL as tem_senha
FROM auth.users
WHERE email LIKE '%tecnico%' OR email LIKE '%teste%'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Testar a função create_technician_user manualmente
-- DESCOMENTE E AJUSTE OS DADOS ABAIXO:
/*
SELECT public.create_technician_user(
    'teste.debug@tecnico.com',  -- Email
    '123456',                     -- Senha
    'Técnico Teste Debug',        -- Nome
    '11999999999',                -- Telefone
    10.0,                         -- Comissão %
    2000.0,                       -- Salário
    'chave-pix-teste',           -- PIX
    NULL,                         -- Avatar
    NULL                          -- Assinatura
);
*/

-- =====================================================
-- SCRIPT DE VERIFICAÇÃO DE SENHA
-- =====================================================

-- 1. Verificar se a senha foi criptografada (deve retornar TRUE)
SELECT 
    email,
    encrypted_password IS NOT NULL as tem_senha_criptografada,
    LENGTH(encrypted_password) as tamanho_senha,
    email_confirmed_at IS NOT NULL as email_confirmado
FROM auth.users
WHERE email = 'Pedrotecnico@gmail.com';

-- 2. Ver TODOS os campos do usuário no auth.users
SELECT *
FROM auth.users
WHERE email = 'Pedrotecnico@gmail.com';

-- 3. Comparar com um admin que FUNCIONA
SELECT 
    email,
    encrypted_password IS NOT NULL as tem_senha,
    email_confirmed_at IS NOT NULL as email_ok,
    confirmation_token,
    aud,
    role
FROM auth.users
WHERE email NOT LIKE '%tecnico%'
LIMIT 1;

-- 4. TESTE: Criar técnico usando método diferente
-- Descomente para testar:
/*
-- Primeiro, delete o técnico antigo se quiser
DELETE FROM public.usuarios WHERE email = 'novo.teste@tecnico.com';
DELETE FROM auth.users WHERE email = 'novo.teste@tecnico.com';

-- Cria novo técnico
SELECT public.create_technician_user(
    'novo.teste@tecnico.com',
    'senha123',
    'Novo Teste',
    NULL,
    0,
    0,
    NULL,
    NULL,
    NULL
);
*/

-- ==============================================================================
-- LIMPAR USUÁRIO TRAVADO (RESET)
-- ==============================================================================
-- Se o seu amigo tentou criar conta, deu erro, e agora diz "User already registered",
-- rode este comando para apagar o cadastro incompleto dele e tentar do zero.

-- 👇 Mude o email abaixo para o email do seu amigo
DELETE FROM auth.users 
WHERE email = 'INSIRA_O_EMAIL_AQUI@EMAIL.COM';

-- Depois de rodar, ele poderá criar a conta novamente na tela de Cadastro.

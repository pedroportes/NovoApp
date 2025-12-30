-- =====================================================
-- ANÁLISE PROFUNDA - ISOANDO O PROBLEMA
-- =====================================================

-- 1. Vamos pegar o hash de senha do SEU usuário (Admin) que funciona
-- e copiar para o técnico. Assim saberemos se o problema é o hash.

DO $$
DECLARE
    admin_hash text;
    tech_email text := 'tecnico.teste@flowdrain.com'; -- Email do técnico que criamos antes
BEGIN
    -- Pega o hash do seu usuário (assumindo que você é o dono da empresa criada mais recente ou logado)
    -- Se houver múltiplos, pega o primeiro admin encontrado
    SELECT encrypted_password INTO admin_hash
    FROM auth.users
    WHERE email NOT LIKE '%tecnico%' -- evitar pegar outro técnico
    AND encrypted_password IS NOT NULL
    LIMIT 1;

    IF admin_hash IS NULL THEN
        RAISE EXCEPTION 'Não encontrei nenhum usuário Admin com senha para copiar.';
    END IF;

    -- Atualiza o técnico com o MESMO hash do admin
    UPDATE auth.users
    SET encrypted_password = admin_hash
    WHERE email = tech_email;

    RAISE NOTICE 'Senha copiada do Admin para %', tech_email;
END $$;

-- 2. VERIFICAÇÃO FINAL DA ESTRUTURA
SELECT 
    email,
    role,
    aud,
    email_confirmed_at,
    encrypted_password,
    raw_app_meta_data,
    raw_user_meta_data
FROM auth.users
WHERE email = 'tecnico.teste@flowdrain.com';

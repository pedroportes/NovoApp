-- PASSO 3: VINCULAR TÉCNICO CRIADO NO PAINEL
-- Substitua O_EMAIL_DO_TECNICO pelo email que você acabou de criar no painel

DO $$
DECLARE
    target_email TEXT := 'tecnico.painel@teste.com'; -- COLOQUE O EMAIL AQUI
    user_record RECORD;
    caller_empresa_id UUID;
BEGIN
    -- 1. Busca o ID da empresa do admin atual (você precisa rodar isso logado no SQL Editor)
    SELECT empresa_id INTO caller_empresa_id 
    FROM public.usuarios 
    WHERE id = auth.uid();

    -- 2. Busca o usuário recém criado no auth.users
    SELECT * INTO user_record 
    FROM auth.users 
    WHERE email = target_email;

    IF user_record.id IS NULL THEN
        RAISE EXCEPTION 'Usuário % não encontrado! Crie ele no menu Authentication primeiro.', target_email;
    END IF;

    -- 3. Insere na tabela public.usuarios (se não existir)
    INSERT INTO public.usuarios (
        id,
        empresa_id,
        cargo,
        nome,
        email,
        created_at
    ) VALUES (
        user_record.id,
        caller_empresa_id,
        'tecnico', -- Garante cargo técnico
        'Técnico Painel', -- Nome provisório
        target_email,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET cargo = 'tecnico', empresa_id = caller_empresa_id;

    RAISE NOTICE 'Sucesso! Técnico vinculado.';
END $$;

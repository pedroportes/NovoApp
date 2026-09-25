-- CORREÇÃO DA FUNÇÃO RPC create_technician_user
-- Esta versão corrige os nomes das colunas para bater com a tabela public.usuarios real.
-- NÃO CRIA NOVAS COLUNAS.

CREATE OR REPLACE FUNCTION public.create_technician_user(
    new_email TEXT,
    new_password TEXT,
    new_name TEXT,
    new_phone TEXT DEFAULT NULL,
    new_commission_rate NUMERIC DEFAULT 0,
    new_base_salary NUMERIC DEFAULT 0,
    new_pix_key TEXT DEFAULT NULL,
    new_avatar_url TEXT DEFAULT NULL,
    new_signature_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_empresa_id UUID;
    new_user_id UUID;
BEGIN
    -- 1. Obter o empresa_id do admin que está chamando a função
    SELECT empresa_id INTO caller_empresa_id 
    FROM public.usuarios 
    WHERE id = auth.uid();
    
    IF caller_empresa_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Empresa não encontrada para o usuário admin');
    END IF;
    
    -- 2. Verificar duplicidade de e-mail no Auth
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
        RETURN json_build_object('success', false, 'error', 'Email já cadastrado no sistema');
    END IF;
    
    -- 3. Gerar novo UUID
    new_user_id := gen_random_uuid();
    
    -- 4. Criar usuário no auth.users (Manual bypass)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        is_super_admin, created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        new_email,
        crypt(new_password, gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        json_build_object('full_name', new_name)::jsonb,
        false,
        NOW(),
        NOW()
    );
    
    -- 5. Criar perfil na tabela public.usuarios (USANDO COLUNAS REAIS)
    INSERT INTO public.usuarios (
        id,
        empresa_id,
        cargo,
        nome_completo, -- Coluna Real
        nome,          -- Coluna Real (mantida para compatibilidade)
        email,         -- Coluna Real
        telefone,      -- Coluna Real
        percentual_comissao, -- Coluna Real (era commission_rate)
        salario_base,        -- Coluna Real (era base_salary)
        pix_key,       -- Coluna Real
        avatar,        -- Coluna Real
        signature_url, -- Coluna Real
        status         -- Coluna Real
    ) VALUES (
        new_user_id,
        caller_empresa_id,
        'tecnico',
        new_name,
        new_name,
        new_email,
        new_phone,
        new_commission_rate,
        new_base_salary,
        new_pix_key,
        new_avatar_url,
        new_signature_url,
        true
    );
    
    RETURN json_build_object('success', true, 'user_id', new_user_id);
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

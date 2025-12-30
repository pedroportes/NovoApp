-- =====================================================
-- CORREÇÃO FINAL DA EXTENSÃO DE CRIPTOGRAFIA
-- =====================================================

-- 1. Habilita a extensão no schema correto (geralmente extensions ou public)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 2. Recria a função apontando para o schema CORRETO
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
SET search_path = public, extensions -- IMPORTANTE: Adiciona extensions no path
AS $$
DECLARE
    caller_empresa_id UUID;
    new_user_id UUID;
BEGIN
    -- Pega empresa_id do admin
    SELECT empresa_id INTO caller_empresa_id 
    FROM public.usuarios 
    WHERE id = auth.uid();
    
    IF caller_empresa_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Empresa não encontrada');
    END IF;
    
    -- Verifica email duplicado
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
        RETURN json_build_object('success', false, 'error', 'Email já cadastrado');
    END IF;
    
    -- Gera ID
    new_user_id := gen_random_uuid();
    
    -- Cria usuário
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password, -- AQUI ESTAVA O ERRO
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        new_email,
        extensions.crypt(new_password, extensions.gen_salt('bf')), -- USO EXPLÍCITO DO SCHEMA EXTENSIONS
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        json_build_object('full_name', new_name)::jsonb,
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );
    
    -- Cria perfil
    INSERT INTO public.usuarios (
        id,
        empresa_id,
        cargo,
        nome,
        email,
        telefone,
        commission_rate,
        base_salary,
        pix_key,
        avatar,
        signature_url
    ) VALUES (
        new_user_id,
        caller_empresa_id,
        'tecnico',
        new_name,
        new_email,
        new_phone,
        new_commission_rate,
        new_base_salary,
        new_pix_key,
        new_avatar_url,
        new_signature_url
    );
    
    RETURN json_build_object('success', true, 'user_id', new_user_id);
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

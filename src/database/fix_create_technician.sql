-- CORRECAO FINAL: Insere TODOS os campos de uma vez
-- Execute no SQL Editor do Supabase

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DROP FUNCTION IF EXISTS public.create_technician_user(text,text,text,text,numeric,numeric,text,text,text);

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
SET search_path = public, extensions
AS $$
DECLARE
    caller_empresa_id UUID;
    new_user_id UUID;
    existing_user_id UUID;
BEGIN
    SELECT empresa_id INTO caller_empresa_id 
    FROM public.usuarios 
    WHERE id = auth.uid();
    
    IF caller_empresa_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Empresa nao encontrada');
    END IF;
    
    SELECT id INTO existing_user_id FROM auth.users WHERE email = LOWER(new_email);
    IF existing_user_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Email ja cadastrado');
    END IF;
    
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        email_change_token_current,
        email_change_confirm_status,
        reauthentication_token,
        is_sso_user
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        LOWER(new_email),
        extensions.crypt(new_password, extensions.gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        json_build_object('full_name', new_name)::jsonb,
        false,
        NOW(),
        NOW(),
        '',
        '',
        '',
        '',
        '',
        0,
        '',
        false
    );
    
    -- Insere TUDO de uma vez, incluindo campos opcionais
    INSERT INTO public.usuarios (
        id,
        empresa_id,
        cargo,
        email,
        nome_completo,
        telefone,
        percentual_comissao,
        salario_base,
        pix_key,
        avatar,
        signature_url,
        status
    ) VALUES (
        new_user_id,
        caller_empresa_id,
        'tecnico',
        LOWER(new_email),
        new_name,
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

SELECT 'Funcao corrigida para inserir todos os campos!' AS resultado;

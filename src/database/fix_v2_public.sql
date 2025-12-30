-- =====================================================
-- CORREÇÃO FINAL V2 - Forçando Pgcrypto na Public
-- =====================================================

-- 1. Garante que pgcrypto existe no schema PUBLIC (mais simples)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- 2. Remove versões anteriores da função para evitar conflito
DROP FUNCTION IF EXISTS public.create_technician_user(text,text,text,text,numeric,numeric,text,text,text);

-- 3. Cria a função sem prefixos de schema, confiando no public
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
SET search_path = public -- Força busca no public
AS $$
DECLARE
    caller_empresa_id UUID;
    new_user_id UUID;
BEGIN
    -- Busca empresa do admin
    SELECT empresa_id INTO caller_empresa_id 
    FROM public.usuarios 
    WHERE id = auth.uid();
    
    IF caller_empresa_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Empresa não encontrada');
    END IF;
    
    -- Verifica duplicidade
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
        RETURN json_build_object('success', false, 'error', 'Email já cadastrado');
    END IF;
    
    new_user_id := gen_random_uuid();
    
    -- Insere usuário
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
        created_at, public.
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
        crypt(new_password, gen_salt('bf'::text)), -- Cast explícito para texto
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
    
    -- Insere perfil do técnico
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

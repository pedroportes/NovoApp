-- =====================================================
-- SOLUÇÃO FINAL - Usando Admin API do Supabase
-- =====================================================

-- Remove função antiga
DROP FUNCTION IF EXISTS public.create_technician_user(text,text,text,text,numeric,numeric,text,text,text);

-- Nova função usando extensão do Supabase
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
SET search_path = public
AS $$
DECLARE
    caller_empresa_id UUID;
    new_user_id UUID;
    user_data JSONB;
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
    
    -- Cria usuário usando ADMIN API (mais confiável)
    BEGIN
        -- Usa a extensão http para chamar a API do Supabase
        -- OU insere com TODOS os campos necessários
        new_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            invited_at,
            confirmation_token,
            confirmation_sent_at,
            recovery_token,
            recovery_sent_at,
            email_change_token_new,
            email_change,
            email_change_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            phone_change_sent_at,
            email_change_token_current,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at,
            is_sso_user,
            deleted_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id,
            'authenticated',
            'authenticated',
            new_email,
            crypt(new_password, gen_salt('bf')),
            NOW(),
            NULL,
            '',
            NULL,
            '',
            NULL,
            '',
            '',
            NULL,
            NULL,
            '{"provider":"email","providers":["email"]}'::jsonb,
            json_build_object('full_name', new_name)::jsonb,
            false,
            NOW(),
            NOW(),
            NULL,
            NULL,
            '',
            '',
            NULL,
            '',
            0,
            NULL,
            '',
            NULL,
            false,
            NULL
        );
        
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Erro ao criar usuário: ' || SQLERRM);
    END;
    
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

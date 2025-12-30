-- NOVA ABORDAGEM: Trigger automatico para criar perfil
-- Execute no SQL Editor do Supabase

-- 1. Atualizar tecnicos sem nome (nao deletar por causa de foreign keys)
UPDATE public.usuarios 
SET nome_completo = 'Técnico ' || SUBSTRING(email FROM 1 FOR 10),
    cargo = 'tecnico'
WHERE (nome_completo IS NULL OR nome_completo = '') 
  AND cargo = 'tecnico';

-- 2. Criar funcao de trigger para auto-criar perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (
    id,
    email,
    cargo,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    'tecnico',
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 3. Criar trigger (remove se existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Criar um tecnico de teste manualmente
DO $$
DECLARE
  test_user_id UUID;
  test_empresa_id UUID;
BEGIN
  -- Pega empresa_id do admin atual (primeiro admin encontrado)
  SELECT empresa_id INTO test_empresa_id FROM public.usuarios WHERE cargo = 'admin' LIMIT 1;
  
  IF test_empresa_id IS NULL THEN
    RAISE NOTICE 'Nenhuma empresa encontrada';
    RETURN;
  END IF;

  -- Gera ID
  test_user_id := gen_random_uuid();
  
  -- Cria no auth
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    confirmation_token,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    test_user_id,
    'authenticated',
    'authenticated',
    'tecnico.teste@flowdrain.com',
    extensions.crypt('senha123', extensions.gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '',
    false
  );
  
  -- Atualiza perfil criado pelo trigger
  UPDATE public.usuarios 
  SET 
    empresa_id = test_empresa_id,
    nome_completo = 'Técnico de Teste',
    cargo = 'tecnico',
    telefone = '11999998888',
    status = true
  WHERE id = test_user_id;
  
  RAISE NOTICE 'Técnico de teste criado: tecnico.teste@flowdrain.com / senha123';
END $$;

SELECT 'Setup completo!' AS resultado;

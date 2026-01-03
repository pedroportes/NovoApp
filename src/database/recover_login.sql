-- ==============================================================================
-- SISTEMA DE "AUTO-CURA" PARA LOGIN (Self-Healing Login)
-- ==============================================================================
-- Função segura para garantir que o usuário tenha perfil e empresa.
-- Se o cadastro falhou na criação, esta função conserta na hora do Login.

CREATE OR REPLACE FUNCTION public.ensure_complete_signup()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões totais para poder criar empresa
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_meta jsonb;
  v_nome_empresa text;
  v_full_name text;
  v_empresa_id uuid;
  v_exists boolean;
BEGIN
  -- 1. Identificar usuário atual que está chamando a função
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- 2. Verificar se já tem perfil
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = v_user_id) INTO v_exists;
  
  IF v_exists THEN
    RETURN json_build_object('success', true, 'message', 'Perfil já existe');
  END IF;

  -- 3. Buscar dados do cadastro (Auth)
  SELECT email, raw_user_meta_data INTO v_email, v_meta
  FROM auth.users
  WHERE id = v_user_id;

  v_nome_empresa := v_meta->>'nome_empresa';
  v_full_name := v_meta->>'full_name';

  -- 4. Se for cadastro de Dono/Admin (tem nome da empresa)
  IF v_nome_empresa IS NOT NULL THEN
    
    -- Cria a empresa (se ainda não existir para este user, mas aqui criamos uma nova)
    -- Nota: Idealmente verificaríamos se o email já tem empresa, mas assumimos novo cadastro.
    INSERT INTO public.empresas (nome, email)
    VALUES (v_nome_empresa, v_email)
    RETURNING id INTO v_empresa_id;

    -- Cria o perfil
    INSERT INTO public.usuarios (id, empresa_id, cargo, nome, email)
    VALUES (v_user_id, v_empresa_id, 'admin', COALESCE(v_full_name, v_email), v_email);

    RETURN json_build_object('success', true, 'message', 'Perfil admin recriado com sucesso');

  ELSE
    -- 5. Se for técnico ou outro sem nome_empresa
    -- Tenta ver se foi criado via fluxo de técnico mas falhou
    -- (Lógica simplificada: técnicos geralmente são criados por admins, então o perfil já deveria existir.
    --  Se chegou aqui, é um técnico órfão. Vamos tentar criar um perfil básico solto ou dar erro).
    RETURN json_build_object('success', false, 'error', 'Cadastro de técnico incompleto. Contate seu admin.');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permite que usuários autenticados chamem esta função
GRANT EXECUTE ON FUNCTION public.ensure_complete_signup() TO authenticated;

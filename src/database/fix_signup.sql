-- ==============================================================================
-- CORREÇÃO DO FLUXO DE CADASTRO (SIGN UP)
-- ==============================================================================
-- Este script corrige o problema onde "Perfil não encontrado" aparecia após criar conta.
-- Ele restaura a lógica de criar a EMPRESA e o ADMIN automaticamente.

-- 1. Cria/Substitui a função do trigger com a lógica correta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_nome_empresa text;
  v_full_name text;
  v_empresa_id uuid;
BEGIN
  -- Extrair dados do metadata (enviados pelo SignUp.tsx)
  v_nome_empresa := new.raw_user_meta_data->>'nome_empresa';
  v_full_name := new.raw_user_meta_data->>'full_name';

  -- CENÁRIO 1: Cadastro de Nova Empresa (Dono/Admin)
  IF v_nome_empresa IS NOT NULL THEN
    
    -- a) Criar a Empresa
    INSERT INTO public.empresas (nome, email)
    VALUES (v_nome_empresa, new.email)
    RETURNING id INTO v_empresa_id;

    -- b) Criar o Perfil do Admin
    INSERT INTO public.usuarios (id, empresa_id, cargo, nome, email)
    VALUES (new.id, v_empresa_id, 'admin', COALESCE(v_full_name, new.email), new.email);

  -- CENÁRIO 2: Outros (ex: convite técnico, criação manual)
  -- Se não tem 'nome_empresa', assume-se que o script de criação manual (create_technician_user)
  -- lidará com a inserção na tabela usuarios, para evitar conflitos.
  ELSE
    NULL; -- Não faz nada, deixa o outro processo cuidar
  END IF;

  RETURN new;
END;
$$;

-- 2. Recria o Trigger na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- RECUPERAÇÃO DE CONTAS "QUEBRADAS" (Opcional)
-- ==============================================================================
-- Se seus amigos já criaram conta e deu erro, isso vai consertar o cadastro deles
-- criando a empresa e o perfil que faltaram.

DO $$
DECLARE
  r RECORD;
  v_emp_id uuid;
BEGIN
  -- Busca usuários que existem no Auth mas NÃO existem na tabela usuarios
  FOR r IN 
    SELECT * FROM auth.users 
    WHERE id NOT IN (SELECT id FROM public.usuarios)
    AND raw_user_meta_data->>'nome_empresa' IS NOT NULL
  LOOP
    -- Cria empresa que faltou
    INSERT INTO public.empresas (nome, email)
    VALUES (r.raw_user_meta_data->>'nome_empresa', r.email)
    RETURNING id INTO v_emp_id;

    -- Cria perfil que faltou
    INSERT INTO public.usuarios (id, empresa_id, cargo, nome, email)
    VALUES (r.id, v_emp_id, 'admin', COALESCE(r.raw_user_meta_data->>'full_name', r.email), r.email);
    
    RAISE NOTICE 'Conta recuperada com sucesso: %', r.email;
  END LOOP;
END $$;

-- Confirmação visual no final
SELECT 'Correção aplicada com sucesso! Pode tentar logar novamente.' as status;

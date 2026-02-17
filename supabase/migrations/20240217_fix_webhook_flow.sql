-- Adiciona coluna must_change_password se não existir
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Atualiza o trigger handle_new_user para capturar esse metadado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_empresa_id uuid;
  meta_nome text;
  meta_empresa text;
  meta_must_change_password boolean;
BEGIN
  -- Extrai dados do cadastro
  meta_nome := COALESCE(new.raw_user_meta_data->>'full_name', new.email);
  meta_empresa := COALESCE(new.raw_user_meta_data->>'nome_empresa', 'Minha Empresa');
  meta_must_change_password := COALESCE((new.raw_user_meta_data->>'must_change_password')::boolean, false);

  -- Se tiver nome de empresa, cria a empresa e o usuário admin
  IF meta_empresa IS NOT NULL THEN
    
    -- Cria Empresa (Evita duplicidade se o ID já vier vinculado de algum lugar, mas aqui é novo user)
    INSERT INTO public.empresas (id, nome, dono_id)
    VALUES (gen_random_uuid(), meta_empresa, new.id)
    RETURNING id INTO new_empresa_id;

    -- Cria o Perfil do Usuário
    INSERT INTO public.usuarios (id, empresa_id, cargo, nome_completo, email, must_change_password)
    VALUES (
      new.id, 
      new_empresa_id, 
      'admin', 
      meta_nome, 
      new.email, 
      meta_must_change_password
    );

  END IF;

  RETURN new;
END;
$$;

-- Função de Segurança para garantir perfil (chamada pelo Webhook em casos de orfandade)
CREATE OR REPLACE FUNCTION public.ensure_complete_signup(
    user_id uuid,
    user_email text,
    user_name text,
    company_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_empresa_id uuid;
    new_empresa_id uuid;
BEGIN
    -- 1. Verifica se usuário já tem perfil
    IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = user_id) THEN
        RETURN; -- Tudo certo, nada a fazer
    END IF;

    -- 2. Verifica se usuário já é dono de alguma empresa (caso raro de integridade)
    SELECT id INTO existing_empresa_id FROM public.empresas WHERE dono_id = user_id LIMIT 1;

    IF existing_empresa_id IS NULL THEN
        -- Cria nova empresa
        INSERT INTO public.empresas (id, nome, dono_id)
        VALUES (gen_random_uuid(), company_name, user_id)
        RETURNING id INTO new_empresa_id;
    ELSE
        new_empresa_id := existing_empresa_id;
    END IF;

    -- 3. Cria o perfil
    INSERT INTO public.usuarios (id, empresa_id, cargo, nome_completo, email, must_change_password)
    VALUES (
        user_id, 
        new_empresa_id, 
        'admin', 
        user_name, 
        user_email, 
        true -- Se caiu aqui, foi forçado pelo webhook, então exige troca de senha
    );
END;
$$;

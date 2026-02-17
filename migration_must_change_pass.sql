-- Adicionar coluna must_change_password na tabela usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Atualizar a função handle_new_user para capturar esse metadado
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
  meta_empresa := new.raw_user_meta_data->>'nome_empresa';
  -- Extrai o booleano (cast seguro)
  meta_must_change_password := (new.raw_user_meta_data->>'must_change_password')::boolean;

  -- Se tiver nome de empresa, cria a empresa e o usuário admin
  IF meta_empresa IS NOT NULL THEN
    
    -- Cria Empresa
    INSERT INTO public.empresas (id, nome, dono_id)
    VALUES (gen_random_uuid(), meta_empresa, new.id)
    RETURNING id INTO new_empresa_id;

    -- Cria o Perfil do Usuário
    INSERT INTO public.usuarios (id, empresa_id, cargo, nome, email, nome_completo, must_change_password)
    VALUES (
      new.id, 
      new_empresa_id, 
      'admin', 
      meta_nome, 
      new.email, 
      meta_nome,
      COALESCE(meta_must_change_password, false)
    );

  END IF;

  RETURN new;
END;
$$;

-- Corrige a função trigger para incluir dono_id na criação da empresa
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nome_empresa text;
  v_full_name text;
  v_empresa_id uuid;
BEGIN
  v_nome_empresa := new.raw_user_meta_data->>'nome_empresa';
  v_full_name := new.raw_user_meta_data->>'full_name';

  -- Case 1: New Company (Admin)
  IF v_nome_empresa IS NOT NULL THEN
    -- Inserir empresa LIGANDO ao dono (dono_id)
    INSERT INTO public.empresas (nome, dono_id)
    VALUES (v_nome_empresa, new.id)
    RETURNING id INTO v_empresa_id;

    -- Inserir usuario vinculado à empresa
    INSERT INTO public.usuarios (id, empresa_id, cargo, nome, nome_completo, email)
    VALUES (
        new.id, 
        v_empresa_id, 
        'admin', 
        COALESCE(v_full_name, new.email), 
        COALESCE(v_full_name, new.email), 
        new.email
    );
  END IF;

  RETURN new;
END;
$function$;

-- Tenta limpar o usuário se ele existir (para permitir novo teste)
-- Isso pode falhar se o usuário não existir, mas o script continua
DO $$
BEGIN
    -- Como não podemos deletar de auth.users diretamente via SQL Editor sempre (depende de permissão),
    -- vamos tentar limpar dados orfãos se houver.
    -- O usuário deve usar "reset_user_manual.sql" se precisar limpar auth.users especificamente via Dashboard.
    NULL;
END $$;

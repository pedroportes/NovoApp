-- Arquivo de Referência do Banco de Dados (Supabase)
-- Essas são as tabelas e funções que criamos para corrigir o erro de Signup

-- 1. Tabela: empresas
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    nome TEXT NOT NULL, -- Antigo nome_fantasia
    cnpj TEXT,
    dono_id UUID REFERENCES auth.users(id)
);

-- RLS: empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.empresas;
CREATE POLICY "Allow all for authenticated" ON public.empresas FOR ALL USING (auth.role() = 'authenticated');


-- 2. Tabela: usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    empresa_id UUID REFERENCES public.empresas(id),
    cargo TEXT CHECK (cargo IN ('admin', 'tecnico')),
    nome TEXT,
    nome_completo TEXT,
    email TEXT
);

-- RLS: usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.usuarios;
CREATE POLICY "Allow all for authenticated" ON public.usuarios FOR ALL USING (auth.role() = 'authenticated');


-- 3. Automação (Trigger) para criar usuário e empresa ao se cadastrar
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
BEGIN
  -- Extrai dados do cadastro
  meta_nome := COALESCE(new.raw_user_meta_data->>'full_name', new.email);
  meta_empresa := new.raw_user_meta_data->>'nome_empresa';

  -- Se tiver nome de empresa, cria a empresa e o usuário admin
  IF meta_empresa IS NOT NULL THEN
    
    -- Cria Empresa
    INSERT INTO public.empresas (id, nome, dono_id)
    VALUES (gen_random_uuid(), meta_empresa, new.id)
    RETURNING id INTO new_empresa_id;

    -- Cria o Perfil do Usuário
    INSERT INTO public.usuarios (id, empresa_id, cargo, nome, email, nome_completo)
    VALUES (
      new.id, 
      new_empresa_id, 
      'admin', 
      meta_nome, 
      new.email, 
      meta_nome
    );

  END IF;

  RETURN new;
END;
$$;

-- Aplica o Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

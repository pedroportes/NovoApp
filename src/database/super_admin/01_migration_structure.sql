-- 01_migration_structure.sql
-- Adiciona estrutura para Super Admin de forma ADITIVA (não destrutiva).

-- 1. Adicionar coluna is_super_admin na tabela public.usuarios (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'is_super_admin') THEN
        ALTER TABLE public.usuarios ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- 2. Permitir que empresa_id seja NULO (para Super Admins globais que não pertencem a uma empresa específica)
ALTER TABLE public.usuarios ALTER COLUMN empresa_id DROP NOT NULL;

-- 3. Criar função auxiliar de segurança (SECURITY DEFINER para acessar dados de todos)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.is_super_admin = true
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS 'Verifica se o usuário atual é um Super Admin.';

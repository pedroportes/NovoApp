-- Migration: Add configs to empresa and created_by to clientes

-- 1. Add 'configs' column to 'empresas' table to store system-wide settings (JSONB)
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS configs JSONB DEFAULT '{}'::jsonb;

-- 2. Add 'criado_por' column to 'clientes' table to track ownership
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id);

-- 3. Update RLS policies (if any) or existing logic? 
-- For now, we assume RLS is open or basic. 
-- We might need to backfill 'criado_por' for existing clients if needed, 
-- but we can leave them null (meaning "Admin" or "Legacy").

-- 4. Grant permissions to authenticated users to update their config
GRANT ALL ON TABLE public.empresas TO authenticated;
GRANT ALL ON TABLE public.clientes TO authenticated;

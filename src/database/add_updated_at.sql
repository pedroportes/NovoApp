-- Add updated_at if not exists
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.ordens_servico;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Backfill existing NULLs just in case (though DEFAULT NOW() handles new ones)
UPDATE public.ordens_servico SET updated_at = created_at WHERE updated_at IS NULL;

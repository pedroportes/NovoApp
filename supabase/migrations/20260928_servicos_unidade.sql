-- Forma de cobrar o serviço do catálogo: valor fixo, por metro ou por litro.
-- Na OS, "por metro"/"por litro" entra como quantidade (metros ou litros) x valor unitário.
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS unidade text NOT NULL DEFAULT 'servico';
DO $$ BEGIN
    ALTER TABLE public.servicos ADD CONSTRAINT servicos_unidade_check CHECK (unidade IN ('servico', 'metro', 'litro'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

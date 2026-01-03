ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS deslocamento_iniciado_em TIMESTAMPTZ DEFAULT NULL;

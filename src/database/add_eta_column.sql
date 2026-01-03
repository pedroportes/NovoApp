-- Add previsao_chegada column
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS previsao_chegada TIMESTAMPTZ DEFAULT NULL;

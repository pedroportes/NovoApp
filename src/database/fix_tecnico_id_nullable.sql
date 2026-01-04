
-- Relaxar a restrição da coluna tecnico_id para permitir despesas administrativas (sem técnico)
ALTER TABLE public.despesas_tecnicos ALTER COLUMN tecnico_id DROP NOT NULL;

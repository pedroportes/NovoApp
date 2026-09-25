-- Relatórios Técnicos de Serviço (laudo entregue ao cliente)
-- Aditivo: cria uma tabela nova, não altera nenhuma tabela existente.
-- Rodar no Supabase: SQL Editor > New query > colar > Run.

CREATE TABLE IF NOT EXISTS public.relatorios_tecnicos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    marca_id uuid NULL REFERENCES public.empresas_marcas(id) ON DELETE SET NULL,
    ordem_servico_id uuid NULL REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
    numero integer NOT NULL,
    status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'emitido')),
    dados jsonb NOT NULL DEFAULT '{}'::jsonb,
    criado_por uuid NULL DEFAULT auth.uid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    emitido_em timestamptz NULL,
    UNIQUE (empresa_id, numero)
);

CREATE INDEX IF NOT EXISTS relatorios_tecnicos_os_idx ON public.relatorios_tecnicos (ordem_servico_id);
CREATE INDEX IF NOT EXISTS relatorios_tecnicos_empresa_idx ON public.relatorios_tecnicos (empresa_id, created_at DESC);

-- Numeração sequencial por empresa (RT-AAAA-0001) e updated_at automático
CREATE OR REPLACE FUNCTION public.relatorios_tecnicos_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM pg_advisory_xact_lock(hashtext('relatorios_tecnicos_' || NEW.empresa_id::text));
        SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero
          FROM public.relatorios_tecnicos
         WHERE empresa_id = NEW.empresa_id;
    ELSE
        NEW.numero := OLD.numero;          -- número não muda depois de criado
        NEW.empresa_id := OLD.empresa_id;  -- relatório não troca de empresa
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS relatorios_tecnicos_before_write ON public.relatorios_tecnicos;
CREATE TRIGGER relatorios_tecnicos_before_write
BEFORE INSERT OR UPDATE ON public.relatorios_tecnicos
FOR EACH ROW EXECUTE FUNCTION public.relatorios_tecnicos_before_write();

-- Segurança: cada empresa só enxerga e altera os próprios relatórios
ALTER TABLE public.relatorios_tecnicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "relatorios_tecnicos_da_empresa" ON public.relatorios_tecnicos;
CREATE POLICY "relatorios_tecnicos_da_empresa" ON public.relatorios_tecnicos
FOR ALL
USING (
    empresa_id IN (SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid())
    OR public.is_super_admin()
)
WITH CHECK (
    empresa_id IN (SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid())
    OR public.is_super_admin()
);

-- Numero é preenchido pelo gatilho; o valor enviado pelo app é ignorado
ALTER TABLE public.relatorios_tecnicos ALTER COLUMN numero SET DEFAULT 0;

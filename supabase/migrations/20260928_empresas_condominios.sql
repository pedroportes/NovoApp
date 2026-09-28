-- Empresa / Condomínio do cliente (ex.: síndica Joana -> Condomínio Sol e Mar).
-- Uma lista por assinante (empresa_id); cada cliente pode estar ligado a uma empresa/condomínio.
-- O app manda só o nome em clientes.empresa_condominio: o gatilho acha (ou cria) o registro
-- da MESMA empresa assinante e grava o vínculo em clientes.empresa_condominio_id.

CREATE TABLE IF NOT EXISTS public.empresas_condominios (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id  uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome        text NOT NULL CHECK (btrim(nome) <> ''),
    cpf_cnpj    text,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS empresas_condominios_nome_uk
    ON public.empresas_condominios (empresa_id, lower(btrim(nome)));

ALTER TABLE public.empresas_condominios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresas/condomínios visíveis por empresa" ON public.empresas_condominios;
CREATE POLICY "Empresas/condomínios visíveis por empresa" ON public.empresas_condominios FOR SELECT
    USING (empresa_id IN (SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid()) OR public.is_super_admin());
DROP POLICY IF EXISTS "Criar empresas/condomínios na empresa" ON public.empresas_condominios;
CREATE POLICY "Criar empresas/condomínios na empresa" ON public.empresas_condominios FOR INSERT
    WITH CHECK (empresa_id IN (SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid()) OR public.is_super_admin());
DROP POLICY IF EXISTS "Atualizar empresas/condomínios da empresa" ON public.empresas_condominios;
CREATE POLICY "Atualizar empresas/condomínios da empresa" ON public.empresas_condominios FOR UPDATE
    USING (empresa_id IN (SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid()) OR public.is_super_admin())
    WITH CHECK (empresa_id IN (SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid()) OR public.is_super_admin());
DROP POLICY IF EXISTS "Excluir empresas/condomínios da empresa" ON public.empresas_condominios;
CREATE POLICY "Excluir empresas/condomínios da empresa" ON public.empresas_condominios FOR DELETE
    USING (empresa_id IN (SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid()) OR public.is_super_admin());

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS empresa_condominio_id uuid
    REFERENCES public.empresas_condominios(id) ON DELETE SET NULL;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS empresa_condominio text;  -- cópia do nome (lista, busca e uso offline)
CREATE INDEX IF NOT EXISTS clientes_empresa_condominio_idx ON public.clientes (empresa_condominio_id);

-- Liga o cliente à empresa/condomínio da MESMA empresa assinante
CREATE OR REPLACE FUNCTION public.clientes_vincular_empresa_condominio()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_nome text;
    v_id   uuid;
BEGIN
    -- Veio só o id (ex.: escolhido numa lista): confere a empresa e copia o nome
    IF NEW.empresa_condominio_id IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.empresa_condominio_id IS DISTINCT FROM OLD.empresa_condominio_id)
       AND (TG_OP = 'INSERT' OR NEW.empresa_condominio IS NOT DISTINCT FROM OLD.empresa_condominio) THEN
        SELECT nome INTO v_nome FROM empresas_condominios
         WHERE id = NEW.empresa_condominio_id AND empresa_id = NEW.empresa_id;
        IF v_nome IS NULL THEN
            RAISE EXCEPTION 'Empresa/condomínio não pertence a esta empresa';
        END IF;
        NEW.empresa_condominio := v_nome;
        RETURN NEW;
    END IF;

    -- Veio o nome: acha ou cria na mesma empresa assinante
    IF TG_OP = 'INSERT' OR NEW.empresa_condominio IS DISTINCT FROM OLD.empresa_condominio
       OR NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
        v_nome := nullif(regexp_replace(btrim(coalesce(NEW.empresa_condominio, '')), '\s+', ' ', 'g'), '');
        IF v_nome IS NULL THEN
            NEW.empresa_condominio := NULL;
            NEW.empresa_condominio_id := NULL;
            RETURN NEW;
        END IF;
        SELECT id, nome INTO v_id, NEW.empresa_condominio FROM empresas_condominios
         WHERE empresa_id = NEW.empresa_id AND lower(btrim(nome)) = lower(v_nome);
        IF v_id IS NULL THEN
            INSERT INTO empresas_condominios (empresa_id, nome) VALUES (NEW.empresa_id, v_nome)
            ON CONFLICT (empresa_id, lower(btrim(nome))) DO UPDATE SET nome = empresas_condominios.nome
            RETURNING id, nome INTO v_id, NEW.empresa_condominio;
        END IF;
        NEW.empresa_condominio_id := v_id;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_clientes_empresa_condominio ON public.clientes;
CREATE TRIGGER trg_clientes_empresa_condominio
    BEFORE INSERT OR UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.clientes_vincular_empresa_condominio();

-- Renomeou a empresa/condomínio: atualiza a cópia nos clientes dela
CREATE OR REPLACE FUNCTION public.empresas_condominios_propagar_nome()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.nome IS DISTINCT FROM OLD.nome THEN
        UPDATE clientes SET empresa_condominio = NEW.nome
         WHERE empresa_condominio_id = NEW.id AND empresa_id = NEW.empresa_id;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_empresas_condominios_nome ON public.empresas_condominios;
CREATE TRIGGER trg_empresas_condominios_nome
    AFTER UPDATE OF nome ON public.empresas_condominios
    FOR EACH ROW EXECUTE FUNCTION public.empresas_condominios_propagar_nome();

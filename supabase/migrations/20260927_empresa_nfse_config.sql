-- Configuração do emissor de NFS-e por empresa (Focus NFe ou Fiscal Contora).
-- Aditiva: cria 2 tabelas novas, não altera nenhuma existente.
--
-- empresa_nfse_config   -> dados visíveis na tela (emissor ativo, ambiente, CNPJ, % do Simples)
-- empresa_nfse_segredos -> token da API. Sem policies: só a Edge Function (service role) lê/grava.
--                          O navegador nunca recebe o token de volta.

CREATE TABLE IF NOT EXISTS public.empresa_nfse_config (
    empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
    provedor text NOT NULL DEFAULT 'focus' CHECK (provedor IN ('focus', 'contora')),
    contora_ambiente text NOT NULL DEFAULT 'producao' CHECK (contora_ambiente IN ('homologacao', 'producao')),
    contora_cnpj text NULL,
    contora_empresa_id text NULL,
    contora_total_tax_rate_sn numeric(5,2) NULL CHECK (contora_total_tax_rate_sn IS NULL OR (contora_total_tax_rate_sn >= 0 AND contora_total_tax_rate_sn <= 100)),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresa_nfse_config ENABLE ROW LEVEL SECURITY;

-- Todos da empresa podem ler (a emissão pela OS precisa saber o emissor ativo)
DROP POLICY IF EXISTS "nfse_config_leitura_empresa" ON public.empresa_nfse_config;
CREATE POLICY "nfse_config_leitura_empresa" ON public.empresa_nfse_config
    FOR SELECT USING (
        empresa_id IN (SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid())
    );

-- Só quem não é técnico altera
DROP POLICY IF EXISTS "nfse_config_escrita_admin" ON public.empresa_nfse_config;
CREATE POLICY "nfse_config_escrita_admin" ON public.empresa_nfse_config
    FOR ALL USING (
        empresa_id IN (
            SELECT u.empresa_id FROM public.usuarios u
            WHERE u.id = auth.uid() AND lower(coalesce(u.cargo, '')) NOT IN ('tecnico', 'técnico')
        )
    ) WITH CHECK (
        empresa_id IN (
            SELECT u.empresa_id FROM public.usuarios u
            WHERE u.id = auth.uid() AND lower(coalesce(u.cargo, '')) NOT IN ('tecnico', 'técnico')
        )
    );

CREATE TABLE IF NOT EXISTS public.empresa_nfse_segredos (
    empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
    contora_token text NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresa_nfse_segredos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.empresa_nfse_segredos FROM authenticated, anon;
-- (sem policies de propósito)

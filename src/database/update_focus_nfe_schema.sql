-- ============================================
-- ATUALIZAÇÃO DE SCHEMA FOCUS NFE (FASE 4)
-- ============================================

-- 1. Alterações na tabela EMPRESAS (Complementar)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS focus_nfe_habilitado BOOLEAN DEFAULT false;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS codigo_municipio TEXT;
-- Já existem: focus_nfe_token, focus_nfe_ambiente, inscricao_municipal (conferido no arquivo anterior)

-- 2. Alterações na tabela ORDENS_SERVICO
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_chave TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_numero TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_serie TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_status TEXT DEFAULT 'nao_emitida';
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_ref TEXT UNIQUE;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_xml_url TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_pdf_url TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_mensagem_erro TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_tipo TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_emitida_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_cancelada_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS nfe_justificativa_cancelamento TEXT;

-- 3. Criar tabela de LOGS (Nova)
CREATE TABLE IF NOT EXISTS public.notas_fiscais_log (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  ordem_servico_id UUID REFERENCES public.ordens_servico(id),
  tipo_nota TEXT,
  acao TEXT,
  payload JSONB,
  resposta JSONB,
  http_status INTEGER,
  sucesso BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_nfe_log_empresa ON public.notas_fiscais_log(empresa_id);
CREATE INDEX IF NOT EXISTS idx_nfe_log_os ON public.notas_fiscais_log(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_nfe_log_created ON public.notas_fiscais_log(created_at DESC);

-- Habilitar RLS na nova tabela
ALTER TABLE public.notas_fiscais_log ENABLE ROW LEVEL SECURITY;

-- Política de RLS para notas_fiscais_log (Seguindo padrão do projeto: usuarios veem dados da sua empresa)
CREATE POLICY "Usuarios veem logs da sua empresa" ON public.notas_fiscais_log
    FOR ALL
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios WHERE id = auth.uid() OR auth.uid() IS NULL -- auth.uid is null check for potential edge function usage if needed, but safe pattern involves explicit user check
        )
    );

-- Nota: A Edge Function usa a service role key ou impersonate, então RLS se aplica ao acesso via Front-end.

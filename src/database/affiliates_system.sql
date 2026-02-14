-- =============================================================================
-- SISTEMA DE AFILIADOS FLOWDRAIN
-- Data: 2026-02-10
-- Descrição: Criação de tabelas, funções e políticas para gestão de afiliados
-- =============================================================================

-- Habilitar extensão para UUIDs se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 0. BACKUP DE SEGURANÇA (TABELA EMPRESAS)
-- Criamos uma cópia datada da tabela empresas antes de alterá-la.
-- =============================================================================
DO $$
BEGIN
    -- Cria backup apenas se ainda não existir um backup para hoje (evita erro em re-execução)
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'empresas_backup_' || to_char(now(), 'YYYYMMDD')) THEN
        EXECUTE 'CREATE TABLE public.empresas_backup_' || to_char(now(), 'YYYYMMDD') || ' AS SELECT * FROM public.empresas';
        RAISE NOTICE 'Backup da tabela empresas criado com sucesso.';
    ELSE
        RAISE NOTICE 'Backup do dia já existe, pulando criação.';
    END IF;
END $$;

-- =============================================================================
-- 1. TABELA: AFILIADOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.afiliados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Link opcional com auth
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefone TEXT,
    
    -- Identificação
    codigo_afiliado TEXT NOT NULL UNIQUE,
    link_afiliado TEXT NOT NULL UNIQUE,
    
    -- Configuração Financeira
    tipo_comissao TEXT NOT NULL CHECK (tipo_comissao IN ('unica', 'recorrente')),
    percentual_comissao DECIMAL(5,2) NOT NULL DEFAULT 10.00 CHECK (percentual_comissao >= 0 AND percentual_comissao <= 100),
    
    -- Métricas (Denormalizadas para performance)
    total_cliques INTEGER DEFAULT 0,
    total_vendas INTEGER DEFAULT 0,
    total_comissoes_geradas DECIMAL(10,2) DEFAULT 0.00,
    total_comissoes_pagas DECIMAL(10,2) DEFAULT 0.00,
    total_comissoes_pendentes DECIMAL(10,2) DEFAULT 0.00,
    
    -- Dados Pagamento
    pix_tipo TEXT CHECK (pix_tipo IN ('cpf', 'cnpj', 'email', 'telefone', 'chave_aleatoria')),
    pix_chave TEXT,
    banco TEXT,
    agencia TEXT,
    conta TEXT,
    tipo_conta TEXT CHECK (tipo_conta IN ('corrente', 'poupanca')),
    
    -- Controle
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
    observacoes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices e Comentários
CREATE INDEX IF NOT EXISTS idx_afiliados_codigo ON public.afiliados(codigo_afiliado);
CREATE INDEX IF NOT EXISTS idx_afiliados_email ON public.afiliados(email);
CREATE INDEX IF NOT EXISTS idx_afiliados_status ON public.afiliados(status);
COMMENT ON TABLE public.afiliados IS 'Cadastro principal dos afiliados e parceiros.';

-- =============================================================================
-- 2. ATUALIZAR TABELA EMPRESAS (Vinculação)
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'afiliado_id') THEN
        ALTER TABLE public.empresas ADD COLUMN afiliado_id UUID REFERENCES public.afiliados(id) ON DELETE SET NULL;
        CREATE INDEX idx_empresas_afiliado_id ON public.empresas(afiliado_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'codigo_afiliado_usado') THEN
        ALTER TABLE public.empresas ADD COLUMN codigo_afiliado_usado TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'data_vinculo_afiliado') THEN
        ALTER TABLE public.empresas ADD COLUMN data_vinculo_afiliado TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- =============================================================================
-- 3. TABELA: AFILIADOS_VENDAS (Registro de Conversões)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.afiliados_vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    afiliado_id UUID NOT NULL REFERENCES public.afiliados(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    
    -- Stripe Link
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    stripe_price_id TEXT,
    
    -- Financeiro da Venda
    valor_assinatura DECIMAL(10,2) NOT NULL,
    valor_comissao DECIMAL(10,2) NOT NULL,
    tipo_comissao TEXT NOT NULL CHECK (tipo_comissao IN ('unica', 'recorrente')),
    
    -- Status da Assinatura/Venda
    status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'cancelada', 'pausada')),
    data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_cancelamento TIMESTAMP WITH TIME ZONE,
    
    -- Acumulados Recorrentes
    total_meses_ativos INTEGER DEFAULT 0,
    total_comissao_gerada DECIMAL(10,2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendas_afiliado ON public.afiliados_vendas(afiliado_id);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa ON public.afiliados_vendas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_stripe_sub ON public.afiliados_vendas(stripe_subscription_id);

-- =============================================================================
-- 4. TABELA: AFILIADOS_PAGAMENTOS (Controle de Repasses)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.afiliados_pagamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    afiliado_id UUID NOT NULL REFERENCES public.afiliados(id) ON DELETE CASCADE,
    
    referencia_mes TEXT NOT NULL, -- YYYY-MM
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    
    valor_total DECIMAL(10,2) NOT NULL,
    quantidade_vendas INTEGER DEFAULT 0,
    
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'pago', 'erro')),
    metodo_pagamento TEXT,
    comprovante_url TEXT,
    data_pagamento TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(afiliado_id, referencia_mes)
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_afiliado ON public.afiliados_pagamentos(afiliado_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.afiliados_pagamentos(status);

-- =============================================================================
-- 5. TABELA: AFILIADOS_CLIQUES (Analytics)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.afiliados_cliques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    afiliado_id UUID NOT NULL REFERENCES public.afiliados(id) ON DELETE CASCADE,
    
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    
    converteu BOOLEAN DEFAULT FALSE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cliques_afiliado ON public.afiliados_cliques(afiliado_id);
CREATE INDEX IF NOT EXISTS idx_cliques_data ON public.afiliados_cliques(created_at);

-- =============================================================================
-- 6. TRIGGER PARA UPDATED_AT
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar Trigger
DROP TRIGGER IF EXISTS update_afiliados_modtime ON public.afiliados;
CREATE TRIGGER update_afiliados_modtime BEFORE UPDATE ON public.afiliados FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendas_modtime ON public.afiliados_vendas;
CREATE TRIGGER update_vendas_modtime BEFORE UPDATE ON public.afiliados_vendas FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pagamentos_modtime ON public.afiliados_pagamentos;
CREATE TRIGGER update_pagamentos_modtime BEFORE UPDATE ON public.afiliados_pagamentos FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- =============================================================================
-- 7. SECURITY (RLS)
-- =============================================================================

-- Habilitar RLS
ALTER TABLE public.afiliados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afiliados_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afiliados_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afiliados_cliques ENABLE ROW LEVEL SECURITY;

-- 7.1 Políticas AFILIADOS
-- Leitura: Próprio usuário ou Service Role (Admin deve bypassar RLS ou usar SR)
CREATE POLICY "Afiliados veem apenas seus dados" ON public.afiliados
    FOR SELECT USING (auth.uid() = user_id);

-- Atualização: Próprio usuário
CREATE POLICY "Afiliados atualizam seus dados" ON public.afiliados
    FOR UPDATE USING (auth.uid() = user_id);

-- Inserção/Deleção: Apenas Admin/Sistema
-- (Não criamos policy pública de insert pois afiliados são criados pelo sistema admin)

-- 7.2 Políticas VENDAS
CREATE POLICY "Afiliados veem suas vendas" ON public.afiliados_vendas
    FOR SELECT USING (afiliado_id IN (SELECT id FROM public.afiliados WHERE user_id = auth.uid()));

-- 7.3 Políticas PAGAMENTOS
CREATE POLICY "Afiliados veem seus pagamentos" ON public.afiliados_pagamentos
    FOR SELECT USING (afiliado_id IN (SELECT id FROM public.afiliados WHERE user_id = auth.uid()));

-- 7.4 Políticas CLIQUES
CREATE POLICY "Afiliados veem seus cliques" ON public.afiliados_cliques
    FOR SELECT USING (afiliado_id IN (SELECT id FROM public.afiliados WHERE user_id = auth.uid()));

-- Insert público para cliques (rastreamento anônimo)
CREATE POLICY "Qualquer um pode registrar clique" ON public.afiliados_cliques
    FOR INSERT WITH CHECK (true);

-- Permissões Service Role (Garante acesso total via API se necessário bypass)
-- Nota: Service Role ignora RLS por padrão, mas é boa prática ter grants explícitos se necessário.
-- GRANT ALL ON public.afiliados TO service_role;
-- GRANT ALL ON public.afiliados_vendas TO service_role;
-- ...

-- =============================================================================
-- 8. STORAGE (Opcional - Comprovantes)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprovantes_afiliados', 'comprovantes_afiliados', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Afiliados veem seus comprovantes" ON storage.objects
FOR SELECT USING (
    bucket_id = 'comprovantes_afiliados' 
    AND (storage.foldername(name))[1] = (SELECT id::text FROM public.afiliados WHERE user_id = auth.uid())
);

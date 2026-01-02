-- =====================================================
-- CRIAR TABELA DE DESPESAS DOS TÉCNICOS
-- Executar no Supabase SQL Editor
-- =====================================================

-- 1. Criar a tabela de despesas
CREATE TABLE IF NOT EXISTS despesas_tecnicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tecnico_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0,
    categoria TEXT DEFAULT 'outros',
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    origem_pagamento TEXT DEFAULT 'empresa' CHECK (origem_pagamento IN ('empresa', 'proprio')),
    comprovante_url TEXT,
    data_despesa DATE DEFAULT CURRENT_DATE,
    aprovado_por UUID REFERENCES usuarios(id),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_despesas_tecnicos_tecnico ON despesas_tecnicos(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_despesas_tecnicos_empresa ON despesas_tecnicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_despesas_tecnicos_status ON despesas_tecnicos(status);

-- 3. Habilitar RLS
ALTER TABLE despesas_tecnicos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
-- Técnicos podem ver suas próprias despesas
CREATE POLICY "Técnicos podem ver suas despesas" ON despesas_tecnicos
    FOR SELECT USING (tecnico_id = auth.uid() OR empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    ));

-- Técnicos podem criar suas próprias despesas
CREATE POLICY "Técnicos podem criar despesas" ON despesas_tecnicos
    FOR INSERT WITH CHECK (tecnico_id = auth.uid());

-- Admins podem atualizar despesas da empresa (aprovar/rejeitar)
CREATE POLICY "Admins podem atualizar despesas da empresa" ON despesas_tecnicos
    FOR UPDATE USING (empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE id = auth.uid() AND cargo = 'admin'
    ));

-- 5. Criar bucket de storage para comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Políticas de Storage
DO $$ 
BEGIN
    -- Permitir upload para autenticados
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Permitir upload de comprovantes para autenticados'
    ) THEN
        CREATE POLICY "Permitir upload de comprovantes para autenticados"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'comprovantes');
    END IF;
    
    -- Permitir leitura pública
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Permitir leitura pública de comprovantes'
    ) THEN
        CREATE POLICY "Permitir leitura pública de comprovantes"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'comprovantes');
    END IF;
END $$;

-- 7. Comentários para documentação
COMMENT ON TABLE despesas_tecnicos IS 'Registro de despesas dos técnicos para aprovação do admin';
COMMENT ON COLUMN despesas_tecnicos.origem_pagamento IS 'empresa = cartão/caixa da empresa, proprio = técnico pagou do bolso (reembolso)';
COMMENT ON COLUMN despesas_tecnicos.comprovante_url IS 'URL da imagem do cupom fiscal/nota fiscal';

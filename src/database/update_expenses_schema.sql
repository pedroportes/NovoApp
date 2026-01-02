-- Adicionar colunas na tabela de despesas dos técnicos
ALTER TABLE despesas_tecnicos
ADD COLUMN IF NOT EXISTS comprovante_url TEXT,
ADD COLUMN IF NOT EXISTS origem_pagamento TEXT DEFAULT 'empresa' CHECK (origem_pagamento IN ('empresa', 'proprio'));

-- Criar bucket de storage para comprovantes (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', true)
ON CONFLICT (id) DO NOTHING;

-- Política de Storage: Permitir upload para usuários autenticados
CREATE POLICY "Permitir upload de comprovantes para autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprovantes');

-- Política de Storage: Permitir leitura pública dos comprovantes (ou restrita, aqui deixaremos pública para facilitar a visualização)
CREATE POLICY "Permitir leitura pública de comprovantes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comprovantes');

-- Comentários para documentação
COMMENT ON COLUMN despesas_tecnicos.comprovante_url IS 'URL da imagem do comprovante/nota fiscal';
COMMENT ON COLUMN despesas_tecnicos.origem_pagamento IS 'Origem do dinheiro: "empresa" (Cartão corporativo/Adiantamento) ou "proprio" (Reembolso)';

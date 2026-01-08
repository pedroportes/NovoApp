-- MIGRATION SCRIPT FOR FLOWDRAIN-SAAS (Active Project)

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Core Tables (Empresas & Usuarios)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    nome TEXT NOT NULL,
    cnpj TEXT,
    dono_id UUID REFERENCES auth.users(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    subscription_price_id TEXT,
    current_period_end TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    cargo TEXT CHECK (cargo IN ('admin', 'tecnico')),
    nome TEXT,
    nome_completo TEXT,
    email TEXT,
    telefone TEXT,
    avatar TEXT,
    signature_url TEXT,
    commission_rate NUMERIC DEFAULT 0,
    base_salary NUMERIC DEFAULT 0,
    pix_key TEXT
);

-- 3. Operational Tables
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome_razao TEXT NOT NULL,
    cpf_cnpj TEXT,
    whatsapp TEXT,
    email TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ordens_servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id),
    tecnico_id UUID REFERENCES public.usuarios(id),
    status TEXT DEFAULT 'PENDENTE',
    tipo TEXT DEFAULT 'ORCAMENTO',
    data_agendamento TIMESTAMP,
    descricao_servico TEXT,
    observacoes TEXT,
    valor_total NUMERIC(10,2) DEFAULT 0,
    desconto NUMERIC(10,2) DEFAULT 0,
    itens JSONB DEFAULT '[]'::jsonb,
    fotos JSONB DEFAULT '{"antes": [], "depois": []}'::jsonb,
    assinatura_cliente_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Financial Tables
CREATE TABLE IF NOT EXISTS public.despesas_tecnicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tecnico_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0,
    categoria TEXT DEFAULT 'outros',
    status TEXT DEFAULT 'pendente',
    origem_pagamento TEXT DEFAULT 'empresa',
    comprovante_url TEXT,
    data_despesa DATE DEFAULT CURRENT_DATE,
    aprovado_por UUID REFERENCES public.usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financeiro_fluxo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES public.usuarios(id),
    tipo VARCHAR(20) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50),
    forma_pagamento VARCHAR(50),
    status VARCHAR(20) DEFAULT 'PENDENTE',
    data_lancamento TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.historico_comissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tecnico_id UUID NOT NULL REFERENCES public.usuarios(id),
    ordem_servico_id UUID REFERENCES public.ordens_servico(id),
    valor_comissao DECIMAL(10,2) NOT NULL,
    status_pagamento VARCHAR(20) DEFAULT 'a_pagar',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Row Level Security
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_fluxo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_comissoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT empresa_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

CREATE POLICY "Access own company data" ON public.empresas FOR ALL USING (dono_id = auth.uid() OR id = public.get_user_company_id());
CREATE POLICY "Access company users" ON public.usuarios FOR ALL USING (empresa_id = public.get_user_company_id() OR id = auth.uid());
CREATE POLICY "Access company clients" ON public.clientes FOR ALL USING (empresa_id = public.get_user_company_id());
CREATE POLICY "Access company os" ON public.ordens_servico FOR ALL USING (empresa_id = public.get_user_company_id());
CREATE POLICY "Access company expenses" ON public.despesas_tecnicos FOR ALL USING (empresa_id = public.get_user_company_id());
CREATE POLICY "Access company finance" ON public.financeiro_fluxo FOR ALL USING (empresa_id = public.get_user_company_id());
CREATE POLICY "Access company commissions" ON public.historico_comissoes FOR ALL USING (empresa_id = public.get_user_company_id());

-- 6. Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_empresa_id uuid;
  meta_nome text;
  meta_empresa text;
BEGIN
  meta_nome := COALESCE(new.raw_user_meta_data->>'full_name', new.email);
  meta_empresa := new.raw_user_meta_data->>'nome_empresa';

  IF meta_empresa IS NOT NULL THEN
    INSERT INTO public.empresas (id, nome, dono_id)
    VALUES (gen_random_uuid(), meta_empresa, new.id)
    RETURNING id INTO new_empresa_id;

    INSERT INTO public.usuarios (id, empresa_id, cargo, nome, email, nome_completo)
    VALUES (new.id, new_empresa_id, 'admin', meta_nome, new.email, meta_nome);
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
insert into storage.buckets (id, name, public) values ('comprovantes', 'comprovantes', true) on conflict (id) do nothing;

create policy "Public Access Avatars" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Auth Upload Avatars" on storage.objects for insert to authenticated with check ( bucket_id = 'avatars' );
create policy "Public Access Comprovantes" on storage.objects for select using ( bucket_id = 'comprovantes' );
create policy "Auth Upload Comprovantes" on storage.objects for insert to authenticated with check ( bucket_id = 'comprovantes' );

-- Enable Vector Extension
create extension if not exists vector;

-- Tabela de Configurações do Bot (Uma por empresa)
create table if not exists public.configuracoes_bot (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid references public.empresas(id) on delete cascade not null,
  nome_bot text default 'Assistente Virtual',
  system_prompt text default 'Você é um assistente virtual útil e educado.',
  whatsapp_instance_name text unique, -- Nome da instância na Evolution API
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(empresa_id)
);

-- Tabela de Conhecimento (RAG)
-- Gemini text-embedding-004 usa 768 dimensões.
create table if not exists public.conhecimento_ia (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid references public.empresas(id) on delete cascade not null,
  conteudo text not null,
  embedding vector(768), -- Gemini output dimension
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index para busca rápida (IVFFlat é bom, HNSW é melhor mas consome mais memória. Vamos de IVFFlat light ou apenas nada por enquanto se for pequeno)
-- Para produção, recomenda-se criar índice se a base for grande. Vamos criar um índice básico.
-- create index on public.conhecimento_ia using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RLS: Configuracoes Bot
alter table public.configuracoes_bot enable row level security;

create policy "Empresas podem ver suas proprias configuracoes"
  on public.configuracoes_bot for select
  using (auth.uid() in (select dono_id from public.empresas where id = empresa_id) OR empresa_id in (select empresa_id from public.usuarios where id = auth.uid()));

create policy "Empresas podem atualizar suas proprias configuracoes"
  on public.configuracoes_bot for update
  using (auth.uid() in (select dono_id from public.empresas where id = empresa_id) OR empresa_id in (select empresa_id from public.usuarios where id = auth.uid()));

create policy "Empresas podem inserir suas proprias configuracoes"
  on public.configuracoes_bot for insert
  with check (auth.uid() in (select dono_id from public.empresas where id = empresa_id) OR empresa_id in (select empresa_id from public.usuarios where id = auth.uid()));

-- RLS: Conhecimento IA
alter table public.conhecimento_ia enable row level security;

create policy "Empresas podem ver seu proprio conhecimento"
  on public.conhecimento_ia for select
  using (auth.uid() in (select dono_id from public.empresas where id = empresa_id) OR empresa_id in (select empresa_id from public.usuarios where id = auth.uid()));

create policy "Empresas podem inserir seu proprio conhecimento"
  on public.conhecimento_ia for insert
  with check (auth.uid() in (select dono_id from public.empresas where id = empresa_id) OR empresa_id in (select empresa_id from public.usuarios where id = auth.uid()));

create policy "Empresas podem deletar seu proprio conhecimento"
  on public.conhecimento_ia for delete
  using (auth.uid() in (select dono_id from public.empresas where id = empresa_id) OR empresa_id in (select empresa_id from public.usuarios where id = auth.uid()));


-- Função para Busca de Similaridade (RAG)
-- IMPORTANTE: Filtra por empresa_id para garantir isolamento
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_empresa_id uuid
)
returns table (
  id uuid,
  conteudo text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    conhecimento_ia.id,
    conhecimento_ia.conteudo,
    1 - (conhecimento_ia.embedding <=> query_embedding) as similarity
  from conhecimento_ia
  where 1 - (conhecimento_ia.embedding <=> query_embedding) > match_threshold
  and conhecimento_ia.empresa_id = filter_empresa_id
  order by conhecimento_ia.embedding <=> query_embedding
  limit match_count;
end;
$$;

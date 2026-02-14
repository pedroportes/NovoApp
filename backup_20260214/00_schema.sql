-- ============================================================
-- BACKUP COMPLETO DO BANCO: appmeu (dltqxfyrltgbudtzxzot)
-- Data: 2026-02-14 09:14 BRT
-- Região: sa-east-1 | Postgres: 17.6.1
-- ============================================================

-- EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE public.empresas (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "cnpj" text, "telefone" text, "logotipo_url" text,
  "dono_id" uuid, "logo_url" text, "razao_social" text,
  "email_contato" text, "site" text, "cep" text, "endereco" text,
  "numero" text, "complemento" text, "bairro" text, "cidade" text,
  "estado" text, "email" text, "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "subscription_status" text DEFAULT 'free'::text,
  "subscription_price_id" text,
  "current_period_end" timestamp with time zone,
  "configs" jsonb DEFAULT '{}'::jsonb,
  "assinatura_url" text, "focus_nfe_token" text,
  "focus_nfe_ambiente" text DEFAULT 'homologacao'::text,
  "inscricao_estadual" text, "inscricao_municipal" text,
  "regime_tributario" text,
  "focus_nfe_habilitado" boolean DEFAULT false,
  "codigo_municipio" text,
  "focus_nfe_is_nacional" boolean DEFAULT false,
  "usa_nfse_nacional" boolean DEFAULT false,
  "webmania_access_token" text,
  "webmania_ambiente" text DEFAULT 'homologacao'::text,
  "webmania_classe_imposto" text,
  "webmania_habilitado" boolean DEFAULT false,
  "afiliado_id" uuid, "codigo_afiliado_usado" text,
  "data_vinculo_afiliado" timestamp with time zone
);

CREATE TABLE public.usuarios (
  "id" uuid NOT NULL DEFAULT auth.uid(),
  "empresa_id" uuid, "nome_completo" text NOT NULL DEFAULT ''::text,
  "cargo" text NOT NULL DEFAULT 'admin'::text,
  "status" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "nome" text, "telefone" text, "online" boolean DEFAULT false,
  "pix_key" text, "signature_url" text, "email" text,
  "salario_base" numeric DEFAULT 0.00,
  "percentual_comissao" numeric DEFAULT 0.00,
  "avatar_url" text, "placa_carro" text, "avatar" text,
  "latitude" double precision, "longitude" double precision,
  "ultimo_update" timestamp with time zone,
  "placa" text, "assinatura_url" text, "auth_user_id" uuid,
  "tipo_usuario" text, "afiliado_id" uuid,
  "is_super_admin" boolean DEFAULT false
);

CREATE TABLE public.clientes (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid, "nome_razao" text NOT NULL,
  "cpf_cnpj" text, "whatsapp" text, "logradouro" text,
  "numero" text, "bairro" text, "cidade" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "email" text, "address" text, "reference" text,
  "is_recurring" boolean DEFAULT false,
  "rating" integer DEFAULT 5, "signature_url" text,
  "photo_url" text, "documento" text, "referencia" text,
  "avatar_url" text, "endereco" text, "telefone" text,
  "nome" text, "cep" text, "uf" text, "complemento" text,
  "ativo" boolean DEFAULT true, "criado_por" uuid,
  "codigo_municipio" text
);

CREATE TABLE public.ordens_servico (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid, "cliente_nome" text NOT NULL,
  "cliente_whatsapp" text, "descricao_servico" text,
  "valor_total" numeric DEFAULT 0,
  "status" text DEFAULT 'pendente'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "tipo" text DEFAULT 'ORCAMENTO'::text,
  "data_agendamento" timestamp with time zone,
  "validade" date, "itens" jsonb DEFAULT '[]'::jsonb,
  "fotos" jsonb DEFAULT '{"antes": [], "depois": []}'::jsonb,
  "assinatura_cliente_url" text, "observacoes" text,
  "cliente_id" uuid, "tecnico_id" uuid, "descricao" text,
  "desconto" numeric DEFAULT 0,
  "paga_ao_tecnico" boolean DEFAULT false,
  "data_pagamento" timestamp with time zone,
  "deslocamento_iniciado_em" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now(),
  "previsao_chegada" timestamp with time zone,
  "orcamento_gerado" boolean DEFAULT false,
  "recibo_gerado" boolean DEFAULT false,
  "contrato_gerado" boolean DEFAULT false,
  "nfe_chave" text, "nfe_numero" text, "nfe_serie" text,
  "nfe_status" text DEFAULT 'nao_emitida'::text,
  "nfe_ref" text, "nfe_xml_url" text, "nfe_pdf_url" text,
  "nfe_mensagem_erro" text, "nfe_tipo" text,
  "nfe_emitida_em" timestamp with time zone,
  "nfe_cancelada_em" timestamp with time zone,
  "nfe_justificativa_cancelamento" text, "nfe_id_focus" text,
  "nfe_url_pdf" text, "nf_uuid" text, "nf_codigo_verificacao" text
);

CREATE TABLE public.servicos (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid NOT NULL, "nome" text NOT NULL,
  "descricao" text, "valor_padrao" numeric DEFAULT 0,
  "ativo" boolean DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "codigo_tributacao_nacional" text
);

CREATE TABLE public.financeiro_fluxo (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid, "usuario_id" uuid, "tipo" text,
  "valor" numeric,
  "data_lancamento" timestamp with time zone DEFAULT now(),
  "status" text DEFAULT 'PENDENTE'::text,
  "pago_em" timestamp with time zone, "comprovante_url" text,
  "descricao" text, "categoria" character varying(50),
  "created_at" timestamp with time zone DEFAULT now(),
  "tecnico_id" uuid
);

CREATE TABLE public.despesas_tecnicos (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid, "tecnico_id" uuid,
  "tipo_despesa" text DEFAULT 'outros'::text,
  "valor" numeric NOT NULL, "comprovante_url" text,
  "status_aprovacao" text DEFAULT 'pendente'::text,
  "data_gasto" timestamp with time zone DEFAULT now(),
  "placa_carro" text, "descricao" text,
  "categoria" character varying(50) DEFAULT 'outros'::character varying,
  "status" character varying(20) DEFAULT 'pendente'::character varying,
  "aprovado_por" uuid, "observacao" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "origem_pagamento" text DEFAULT 'outros'::text
);

CREATE TABLE public.historico_comissoes (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid, "tecnico_id" uuid, "ordem_servico_id" uuid,
  "valor_comissao" numeric NOT NULL,
  "status_pagamento" text DEFAULT 'a_pagar'::text,
  "data_geracao" timestamp with time zone DEFAULT now(),
  "percentual_aplicado" numeric,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public.veiculos (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid NOT NULL,
  "placa" character varying(20) NOT NULL,
  "modelo" character varying(100) NOT NULL,
  "ano" integer, "cor" character varying(50),
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.configuracoes_bot (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid NOT NULL,
  "nome_bot" text DEFAULT 'Assistente Virtual'::text,
  "system_prompt" text DEFAULT 'Você é um assistente virtual útil e educado.'::text,
  "whatsapp_instance_name" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "z_api_instance_id" text, "z_api_token" text,
  "z_api_client_token" text,
  "provider" text DEFAULT 'zapi'::text,
  "api_url" text, "api_key" text, "instance_id" text
);

CREATE TABLE public.conhecimento_ia (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid NOT NULL, "conteudo" text NOT NULL,
  "embedding" vector, "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.chat_historico (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid NOT NULL, "contact_phone" text NOT NULL,
  "role" text NOT NULL, "content" text NOT NULL,
  "status" text DEFAULT 'processed'::text,
  "message_id_zapi" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.app_logs (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "level" text, "message" text, "meta" jsonb
);

CREATE TABLE public.contatos_bloqueados (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid NOT NULL, "telefone" text NOT NULL,
  "nome" text, "motivo" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "created_by" uuid
);

CREATE TABLE public.notas_fiscais_log (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" uuid, "ordem_servico_id" uuid,
  "tipo_nota" text, "acao" text, "payload" jsonb,
  "resposta" jsonb, "http_status" integer, "sucesso" boolean,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public.documentos_conhecimento (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "content" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "embedding" vector
);

CREATE TABLE public.afiliados (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" uuid, "nome" text NOT NULL,
  "email" text NOT NULL, "telefone" text,
  "codigo_afiliado" text NOT NULL, "link_afiliado" text NOT NULL,
  "tipo_comissao" text NOT NULL,
  "percentual_comissao" numeric NOT NULL DEFAULT 10.00,
  "total_cliques" integer DEFAULT 0,
  "total_vendas" integer DEFAULT 0,
  "total_comissoes_geradas" numeric DEFAULT 0.00,
  "total_comissoes_pagas" numeric DEFAULT 0.00,
  "total_comissoes_pendentes" numeric DEFAULT 0.00,
  "pix_tipo" text, "pix_chave" text, "banco" text,
  "agencia" text, "conta" text, "tipo_conta" text,
  "status" text NOT NULL DEFAULT 'ativo'::text,
  "observacoes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public.afiliados_vendas (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "afiliado_id" uuid NOT NULL, "empresa_id" uuid NOT NULL,
  "stripe_subscription_id" text NOT NULL,
  "stripe_customer_id" text NOT NULL,
  "stripe_price_id" text, "valor_assinatura" numeric NOT NULL,
  "valor_comissao" numeric NOT NULL, "tipo_comissao" text NOT NULL,
  "status" text NOT NULL DEFAULT 'ativa'::text,
  "data_venda" timestamp with time zone DEFAULT now(),
  "data_cancelamento" timestamp with time zone,
  "total_meses_ativos" integer DEFAULT 0,
  "total_comissao_gerada" numeric DEFAULT 0.00,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public.afiliados_pagamentos (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "afiliado_id" uuid NOT NULL, "referencia_mes" text NOT NULL,
  "data_inicio" timestamp with time zone NOT NULL,
  "data_fim" timestamp with time zone NOT NULL,
  "valor_total" numeric NOT NULL,
  "quantidade_vendas" integer DEFAULT 0,
  "status" text NOT NULL DEFAULT 'pendente'::text,
  "metodo_pagamento" text, "comprovante_url" text,
  "data_pagamento" timestamp with time zone, "observacoes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public.afiliados_cliques (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "afiliado_id" uuid NOT NULL, "ip_address" inet,
  "user_agent" text, "referrer" text, "utm_source" text,
  "utm_medium" text, "utm_campaign" text,
  "converteu" boolean DEFAULT false, "empresa_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);

-- ============================================================
-- PRIMARY KEYS
-- ============================================================
ALTER TABLE public.afiliados ADD CONSTRAINT afiliados_pkey PRIMARY KEY (id);
ALTER TABLE public.afiliados_cliques ADD CONSTRAINT afiliados_cliques_pkey PRIMARY KEY (id);
ALTER TABLE public.afiliados_pagamentos ADD CONSTRAINT afiliados_pagamentos_pkey PRIMARY KEY (id);
ALTER TABLE public.afiliados_vendas ADD CONSTRAINT afiliados_vendas_pkey PRIMARY KEY (id);
ALTER TABLE public.app_logs ADD CONSTRAINT app_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_historico ADD CONSTRAINT chat_historico_pkey PRIMARY KEY (id);
ALTER TABLE public.clientes ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);
ALTER TABLE public.configuracoes_bot ADD CONSTRAINT configuracoes_bot_pkey PRIMARY KEY (id);
ALTER TABLE public.conhecimento_ia ADD CONSTRAINT conhecimento_ia_pkey PRIMARY KEY (id);
ALTER TABLE public.contatos_bloqueados ADD CONSTRAINT contatos_bloqueados_pkey PRIMARY KEY (id);
ALTER TABLE public.despesas_tecnicos ADD CONSTRAINT despesas_tecnicos_pkey PRIMARY KEY (id);
ALTER TABLE public.documentos_conhecimento ADD CONSTRAINT documentos_conhecimento_pkey PRIMARY KEY (id);
ALTER TABLE public.empresas ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);
ALTER TABLE public.financeiro_fluxo ADD CONSTRAINT financeiro_fluxo_pkey PRIMARY KEY (id);
ALTER TABLE public.historico_comissoes ADD CONSTRAINT historico_comissoes_pkey PRIMARY KEY (id);
ALTER TABLE public.notas_fiscais_log ADD CONSTRAINT notas_fiscais_log_pkey PRIMARY KEY (id);
ALTER TABLE public.ordens_servico ADD CONSTRAINT ordens_servico_pkey PRIMARY KEY (id);
ALTER TABLE public.servicos ADD CONSTRAINT servicos_pkey PRIMARY KEY (id);
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);
ALTER TABLE public.veiculos ADD CONSTRAINT veiculos_pkey PRIMARY KEY (id);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================
ALTER TABLE public.empresas ADD CONSTRAINT empresas_dono_id_fkey FOREIGN KEY (dono_id) REFERENCES auth.users(id);
ALTER TABLE public.empresas ADD CONSTRAINT empresas_afiliado_id_fkey FOREIGN KEY (afiliado_id) REFERENCES public.afiliados(id);
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_afiliado_id_fkey FOREIGN KEY (afiliado_id) REFERENCES public.afiliados(id);
ALTER TABLE public.clientes ADD CONSTRAINT clientes_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id);
ALTER TABLE public.ordens_servico ADD CONSTRAINT ordens_servico_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.ordens_servico ADD CONSTRAINT fk_os_usuarios FOREIGN KEY (tecnico_id) REFERENCES public.usuarios(id);
ALTER TABLE public.ordens_servico ADD CONSTRAINT fk_os_clientes FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);
ALTER TABLE public.servicos ADD CONSTRAINT servicos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.financeiro_fluxo ADD CONSTRAINT financeiro_fluxo_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.financeiro_fluxo ADD CONSTRAINT financeiro_fluxo_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);
ALTER TABLE public.financeiro_fluxo ADD CONSTRAINT financeiro_fluxo_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.usuarios(id);
ALTER TABLE public.despesas_tecnicos ADD CONSTRAINT despesas_tecnicos_usuario_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.usuarios(id);
ALTER TABLE public.historico_comissoes ADD CONSTRAINT historico_comissoes_usuario_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.usuarios(id);
ALTER TABLE public.configuracoes_bot ADD CONSTRAINT configuracoes_bot_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.conhecimento_ia ADD CONSTRAINT conhecimento_ia_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.chat_historico ADD CONSTRAINT chat_historico_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.contatos_bloqueados ADD CONSTRAINT contatos_bloqueados_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.contatos_bloqueados ADD CONSTRAINT contatos_bloqueados_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.notas_fiscais_log ADD CONSTRAINT notas_fiscais_log_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.notas_fiscais_log ADD CONSTRAINT notas_fiscais_log_ordem_servico_id_fkey FOREIGN KEY (ordem_servico_id) REFERENCES public.ordens_servico(id);
ALTER TABLE public.veiculos ADD CONSTRAINT veiculos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.afiliados ADD CONSTRAINT afiliados_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.afiliados_vendas ADD CONSTRAINT afiliados_vendas_afiliado_id_fkey FOREIGN KEY (afiliado_id) REFERENCES public.afiliados(id);
ALTER TABLE public.afiliados_vendas ADD CONSTRAINT afiliados_vendas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.afiliados_pagamentos ADD CONSTRAINT afiliados_pagamentos_afiliado_id_fkey FOREIGN KEY (afiliado_id) REFERENCES public.afiliados(id);
ALTER TABLE public.afiliados_cliques ADD CONSTRAINT afiliados_cliques_afiliado_id_fkey FOREIGN KEY (afiliado_id) REFERENCES public.afiliados(id);
ALTER TABLE public.afiliados_cliques ADD CONSTRAINT afiliados_cliques_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_fluxo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_bot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conhecimento_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos_bloqueados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_conhecimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afiliados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afiliados_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afiliados_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afiliados_cliques ENABLE ROW LEVEL SECURITY;
-- chat_historico e app_logs: RLS DESABILITADO

-- ============================================================
-- FIM DO SCHEMA DDL
-- Os dados, funções, triggers e políticas RLS estão em 
-- arquivos separados nesta mesma pasta.
-- ============================================================

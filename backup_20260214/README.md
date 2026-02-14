# Backup Completo - appmeu (dltqxfyrltgbudtzxzot)
**Data:** 2026-02-14 09:14 BRT | **Postgres:** 17.6.1 | **Região:** sa-east-1

## Estrutura do Backup

| Arquivo | Conteúdo |
|---------|----------|
| `00_schema.sql` | DDL de todas as 21 tabelas, PKs, FKs, RLS |
| `01_functions.json` | 20 funções (handle_new_user, handle_os_completion, etc) |
| `02_rls_policies.json` | 53 políticas de segurança RLS |
| `03_foreign_keys.json` | Todas as foreign key constraints |
| `data/` | Dados JSON de cada tabela |

## Tabelas e Contagem de Registros

| Tabela | Registros | Tabela | Registros |
|--------|-----------|--------|-----------|
| empresas | 37 | afiliados | 2 |
| usuarios | 30 | afiliados_vendas | 7 |
| clientes | 65 | afiliados_cliques | 63 |
| ordens_servico | 39 | afiliados_pagamentos | 0 |
| servicos | 24 | veiculos | 1 |
| financeiro_fluxo | 40 | configuracoes_bot | 2 |
| despesas_tecnicos | 19 | conhecimento_ia | 35 |
| historico_comissoes | 18 | contatos_bloqueados | 5 |
| chat_historico | 1644 | notas_fiscais_log | 0 |
| app_logs | 6101 | documentos_conhecimento | 0 |
| empresas_backup_20260210 | 20 | | |

## Funções (20)
`create_technician_user`, `delete_technician`, `ensure_complete_signup`, `get_dashboard_stats` (2 overloads), `get_my_company_id`, `get_service_order_for_print`, `handle_new_user`, `handle_os_completion`, `handle_updated_at`, `incrementar_vendas_afiliado`, `is_admin`, `marcar_venda_cancelada`, `match_documents` (2 overloads), `reactivate_technician`, `registrar_clique_afiliado`, `registrar_comissao_recorrente`, `update_technician` (2 overloads), `update_updated_at_column`

## Triggers (6)
- `update_afiliados_modtime` → afiliados (BEFORE UPDATE)
- `update_pagamentos_modtime` → afiliados_pagamentos (BEFORE UPDATE)
- `trg_incrementar_venda` → afiliados_vendas (AFTER INSERT)
- `update_vendas_modtime` → afiliados_vendas (BEFORE UPDATE)
- `on_os_status_change` → ordens_servico (AFTER UPDATE)
- `set_updated_at` → ordens_servico (BEFORE UPDATE)

## Notas
- `chat_historico`: exportados últimos 500 registros (total: 1644)
- `app_logs`: exportados últimos 200 registros (total: 6101)
- `conhecimento_ia`: embeddings (vector) não exportados por tamanho
- `documentos_conhecimento`: tabela vazia (0 registros)

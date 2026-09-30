-- Sincronização da planilha AppSheet (aba "Novos") -> FlowDrain, chamada pelo n8n.
-- O n8n lê a planilha (sem alterar), organiza cada linha (telefone, endereço, serviços) e manda para
-- public.planilha_sync(empresa, linhas, simular). Regras = migração de 28/09 (scripts/migracao_planilha):
--   * OS já existe com o mesmo Id da planilha (origem_id): atualiza só se a linha mudou (Data_Atualizacao);
--     OS com NFS-e autorizada não tem valor/serviços alterados.
--   * OS criada à mão no app (sem origem_id) com a mesma data, valor e telefone/nome: só liga (não duplica).
--   * Senão cria a OS; o cliente é achado pelo telefone (8 últimos dígitos) ou criado.
--   * Comissão e receita saem sozinhas pelo gatilho handle_os_completion (OS CONCLUIDO).
-- p_simular = true: faz tudo e desfaz no fim (só devolve o relatório).
-- p_limite = N: grava no máximo N OS por chamada (as outras ficam "na fila" para a próxima). O n8n usa 1.
-- Só o service_role (n8n) pode chamar.

alter table public.ordens_servico add column if not exists origem_atualizado_em text;

drop function if exists public.planilha_sync(uuid, jsonb, boolean);

create or replace function public.planilha_sync(p_empresa_id uuid, p_linhas jsonb, p_simular boolean default true, p_limite integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    r jsonb;
    c jsonb;
    rel jsonb := '[]'::jsonb;
    v_origem text;
    v_upd text;
    v_data date;
    v_valor numeric;
    v_fone text;
    v_fone_fmt text;
    v_nome text;
    v_marca uuid;
    v_tec uuid;
    v_status text;
    v_os record;
    v_cli uuid;
    v_os_id uuid;
    v_itens jsonb;
    v_desc text;
    v_acao text;
    v_motivo text;
    v_feitas integer := 0;
    v_marcas constant jsonb := '{
        "86676733": "93bd1248-9bcd-4e69-9d13-5569ae63db03",
        "46a54a5d": "2c6b7aee-3453-49f6-88a5-f09879f8aafb",
        "1639370a": "1372b5a0-b28e-4d8c-a1d6-75d6a47b0553",
        "be8edc77": "fdf65712-50c5-4b71-a754-eac3a9eb4b5d",
        "Batel": "e0de0000-0000-0000-0000-000000000004",
        "Paulo": "e0de0000-0000-0000-0000-000000000003",
        "195ae451": "7fb4a63b-1dae-4f74-89bd-aa2e3bb917d4"
    }';
    c_pedro_e_graca constant uuid := 'a0da0000-0000-0000-0000-000000000001';
    c_fone_teste constant text := '41984501037';
begin
    begin  -- bloco da simulação: com p_simular tudo é desfeito no fim
        for r in select * from jsonb_array_elements(coalesce(p_linhas, '[]'::jsonb)) loop
            v_acao := null; v_motivo := null; v_os_id := null;
            v_origem := nullif(trim(r->>'origem_id'), '');
            begin  -- cada linha isolada: erro numa linha não derruba as outras
                c := coalesce(r->'cliente', '{}'::jsonb);
                v_upd := nullif(trim(r->>'atualizado_em'), '');
                v_data := nullif(r->>'data', '')::date;
                v_valor := round(coalesce(nullif(r->>'valor_total', '')::numeric, 0), 2);
                v_fone := regexp_replace(coalesce(c->>'fone', ''), '\D', '', 'g');
                v_fone_fmt := nullif(c->>'fone_fmt', '');
                v_nome := nullif(trim(c->>'nome'), '');
                v_marca := nullif(v_marcas->>trim(coalesce(r->>'marca_codigo', '')), '')::uuid;
                v_itens := coalesce(r->'itens', '[]'::jsonb);
                v_desc := (select string_agg(i->>'descricao', ' + ') from jsonb_array_elements(v_itens) i);
                v_status := case
                    when coalesce((r->>'ativo')::boolean, true) = false then 'nao_feito_cancelado'
                    when lower(coalesce(r->>'tipo_planilha', '')) like 'or%amento' then 'orcamento'
                    else 'CONCLUIDO' end;
                select u.id into v_tec from public.usuarios u
                 where u.empresa_id = p_empresa_id and u.nome = trim(coalesce(r->>'tecnico', ''))
                 order by (u.id::text like 'a0da0000%') desc limit 1;
                v_tec := coalesce(v_tec, c_pedro_e_graca);

                if v_origem is null then
                    v_acao := 'ignorada'; v_motivo := 'linha sem Id';
                elsif v_fone = c_fone_teste then
                    v_acao := 'ignorada'; v_motivo := 'telefone de teste do Pedro';
                elsif v_nome is null or v_valor <= 0 or v_data is null then
                    v_acao := 'ignorada'; v_motivo := 'sem nome, sem valor ou sem data';
                end if;

                if v_acao is null then
                    -- 1) OS que já veio da planilha (mesmo Id)
                    select o.id, o.nfe_status, o.origem_atualizado_em, o.status into v_os
                      from public.ordens_servico o
                     where o.empresa_id = p_empresa_id and o.origem_id = v_origem
                     limit 1;
                    if found then
                        v_os_id := v_os.id;
                        if v_upd is not null and v_os.origem_atualizado_em = v_upd then
                            v_acao := 'sem mudança';
                        elsif p_limite is not null and v_feitas >= p_limite then
                            v_acao := 'na fila'; v_motivo := 'vai na próxima rodada (uma por vez)';
                        else
                            v_feitas := v_feitas + 1;
                            update public.ordens_servico o set
                                marca_id = coalesce(v_marca, o.marca_id),
                                tecnico_id = v_tec,
                                status = v_status,
                                data_agendamento = v_data,
                                observacoes = coalesce(nullif(r->>'observacoes', ''), o.observacoes),
                                valor_total = case when o.nfe_status in ('autorizado', 'autorizada') then o.valor_total else v_valor end,
                                itens = case when o.nfe_status in ('autorizado', 'autorizada') then o.itens else v_itens end,
                                descricao_servico = case when o.nfe_status in ('autorizado', 'autorizada') then o.descricao_servico else v_desc end,
                                descricao = case when o.nfe_status in ('autorizado', 'autorizada') then o.descricao else v_desc end,
                                origem_atualizado_em = v_upd
                             where o.id = v_os.id;
                            v_acao := 'atualizada';
                            if v_os.nfe_status in ('autorizado', 'autorizada') then v_motivo := 'nota fiscal emitida: valor e serviços mantidos'; end if;
                        end if;
                    else
                        -- 2) OS criada à mão no app: mesma data + valor + (telefone ou primeiro nome)
                        select o.id into v_os_id
                          from public.ordens_servico o
                          left join public.clientes cl on cl.id = o.cliente_id
                         where o.empresa_id = p_empresa_id and o.origem_id is null
                           and ((o.data_agendamento at time zone 'America/Sao_Paulo')::date = v_data
                                or (o.data_agendamento at time zone 'UTC')::date = v_data)  -- data "sem hora" = meia-noite UTC
                           and round(o.valor_total, 2) = v_valor
                           and (
                                (length(v_fone) >= 10 and right(regexp_replace(coalesce(cl.whatsapp, cl.telefone, o.cliente_whatsapp, ''), '\D', '', 'g'), 8) = right(v_fone, 8))
                             or lower(split_part(trim(coalesce(o.cliente_nome, cl.nome_razao, '')), ' ', 1)) = lower(split_part(v_nome, ' ', 1))
                           )
                         order by o.created_at limit 1;
                        if p_limite is not null and v_feitas >= p_limite then
                            v_acao := 'na fila'; v_motivo := 'vai na próxima rodada (uma por vez)'; v_os_id := null;
                        elsif v_os_id is not null then
                            v_feitas := v_feitas + 1;
                            update public.ordens_servico set origem_id = v_origem, origem_atualizado_em = v_upd where id = v_os_id;
                            v_acao := 'ligada'; v_motivo := 'OS já criada no app (mesma data, valor e cliente)';
                        else
                            -- 3) Nova: acha o cliente pelo telefone ou cria
                            v_feitas := v_feitas + 1;
                            v_cli := null;
                            if length(v_fone) >= 10 then
                                select cl.id into v_cli from public.clientes cl
                                 where cl.empresa_id = p_empresa_id
                                   and right(regexp_replace(coalesce(cl.whatsapp, cl.telefone, ''), '\D', '', 'g'), 8) = right(v_fone, 8)
                                 order by cl.created_at limit 1;
                            end if;
                            if v_cli is null then
                                insert into public.clientes (empresa_id, marca_id, nome_razao, whatsapp, telefone, cpf_cnpj, endereco,
                                    logradouro, numero, complemento, bairro, cidade, uf, cep, empresa_condominio, ativo)
                                values (p_empresa_id, v_marca, v_nome, v_fone_fmt, v_fone_fmt, nullif(c->>'cpf_cnpj', ''), nullif(c->>'endereco', ''),
                                    nullif(c->>'logradouro', ''), nullif(c->>'numero', ''), nullif(c->>'complemento', ''), nullif(c->>'bairro', ''),
                                    nullif(c->>'cidade', ''), nullif(c->>'uf', ''), nullif(c->>'cep', ''), nullif(c->>'empresa_condominio', ''), true)
                                returning id into v_cli;
                                v_motivo := 'cliente novo';
                            else
                                -- cliente que já existe: só completa o que está vazio
                                update public.clientes cl set
                                    cpf_cnpj = coalesce(nullif(cl.cpf_cnpj, ''), nullif(c->>'cpf_cnpj', '')),
                                    empresa_condominio = coalesce(nullif(cl.empresa_condominio, ''), nullif(c->>'empresa_condominio', '')),
                                    cep = coalesce(nullif(cl.cep, ''), nullif(c->>'cep', '')),
                                    marca_id = coalesce(cl.marca_id, v_marca)
                                 where cl.id = v_cli;
                                v_motivo := 'cliente já cadastrado (mesmo telefone)';
                            end if;
                            v_os_id := uuid_generate_v5(uuid_ns_url(), 'flowdrain-planilha-' || v_origem);
                            insert into public.ordens_servico (id, empresa_id, marca_id, cliente_id, cliente_nome, cliente_whatsapp,
                                descricao_servico, descricao, valor_total, status, tipo, data_agendamento, created_at, tecnico_id,
                                origem_id, origem_atualizado_em, observacoes, nfe_status, desconto, itens, fotos)
                            values (v_os_id, p_empresa_id, v_marca, v_cli, v_nome, v_fone_fmt,
                                v_desc, v_desc, v_valor, v_status, 'SERVICO', v_data, v_data, v_tec,
                                v_origem, v_upd, nullif(r->>'observacoes', ''), 'nao_emitida', 0, v_itens, '{"antes": [], "depois": []}'::jsonb);
                            v_acao := 'criada';
                        end if;
                    end if;
                end if;
            exception when others then
                v_acao := 'erro'; v_motivo := sqlerrm;
            end;
            rel := rel || jsonb_build_object('origem_id', v_origem, 'cliente', r->'cliente'->>'nome', 'data', r->>'data',
                                             'valor', r->>'valor_total', 'acao', v_acao, 'motivo', v_motivo, 'os_id', v_os_id);
        end loop;
        if p_simular then
            raise exception using errcode = 'P0001', message = '__simulacao__';
        end if;
    exception when sqlstate 'P0001' then
        if sqlerrm <> '__simulacao__' then raise; end if;
    end;
    return jsonb_build_object('simulacao', p_simular, 'total', jsonb_array_length(rel), 'gravadas', v_feitas, 'linhas', rel);
end;
$$;

revoke all on function public.planilha_sync(uuid, jsonb, boolean, integer) from public, anon, authenticated;
grant execute on function public.planilha_sync(uuid, jsonb, boolean, integer) to service_role;

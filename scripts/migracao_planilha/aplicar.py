"""
Gera o SQL da migração a partir da simulação (simular.py) — UMA transação só.
Uso:  python aplicar.py   -> cria backup_migracao_20260928/aplicar.sql
Depois: npx supabase db query --linked --file backup_migracao_20260928/aplicar.sql
"""
import os, re, runpy, sys, uuid, json

sys.stdout.reconfigure(encoding='utf-8')
AQUI = os.path.dirname(os.path.abspath(__file__))
G = runpy.run_path(os.path.join(AQUI, 'simular.py'))
plano, clientes, os_db, novos = G['plano'], G['clientes'], G['os_db'], G['novos']
cli_by_id, merge_de, teste_ids = G['cli_by_id'], G['merge_de'], G['teste_ids']
destino, normaliza_fone, split_endereco, so_dig, money, data_iso = G['destino'], G['normaliza_fone'], G['split_endereco'], G['so_dig'], G['money'], G['data_iso']
EMP = G['EMPRESA']
MARCA = G['MARCA_DA_PLANILHA']
TEC_JP, TEC_PG = G['TEC_JORGE_E_PEDRO'], G['TEC_PEDRO_E_GRACA']
usuarios = G['usuarios']


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


sql = ['BEGIN;', "SET LOCAL statement_timeout = '15min';"]
A = sql.append

# ---------- 1. Estrutura ----------
A("ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS origem_id text;")
A("CREATE INDEX IF NOT EXISTS idx_os_origem_id ON public.ordens_servico(origem_id);")
A("""CREATE TABLE IF NOT EXISTS public.historico_servicos_antigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  origem_id text, cliente_nome text, telefone text, endereco text, cidade text,
  data date, servico text, valor numeric(12,2), pagamento text, quem_fez text, detalhes text,
  created_at timestamptz DEFAULT now()
);""")
A("CREATE INDEX IF NOT EXISTS idx_hist_antigos_cliente ON public.historico_servicos_antigos(cliente_id);")
A("ALTER TABLE public.historico_servicos_antigos ENABLE ROW LEVEL SECURITY;")
A("DROP POLICY IF EXISTS \"Histórico antigo visível por empresa\" ON public.historico_servicos_antigos;")
A("""CREATE POLICY "Histórico antigo visível por empresa" ON public.historico_servicos_antigos FOR SELECT
  USING (empresa_id IN (SELECT usuarios.empresa_id FROM public.usuarios WHERE usuarios.id = auth.uid()) OR public.is_super_admin());""")
A("DELETE FROM public.historico_servicos_antigos WHERE empresa_id = " + q(EMP) + ";")  # rodar de novo não duplica

# Técnico "Jorge e Pedro" (cadastro sem login, igual ao "Pedro e Graça")
A(f"""INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
  VALUES ({q(TEC_JP)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tecnico16@flowdrain.com.br', now(), now())
  ON CONFLICT (id) DO NOTHING;""")
A(f"""INSERT INTO public.usuarios (id, empresa_id, nome, nome_completo, cargo, percentual_comissao, salario_base, status, is_super_admin, must_change_password, online)
  VALUES ({q(TEC_JP)}, {q(EMP)}, 'Jorge e Pedro', 'Jorge e Pedro', 'tecnico', 50, 0, true, false, false, false)
  ON CONFLICT (id) DO NOTHING;""")

# ---------- 2. OS e clientes de teste ----------
apagar_os = [oid for oid, acao in plano['os_teste'].items() if acao == 'apagar']
if apagar_os:
    lista = ', '.join(q(i) for i in apagar_os)
    A(f"DELETE FROM public.notas_fiscais_log WHERE ordem_servico_id IN ({lista});")
    A(f"DELETE FROM public.historico_comissoes WHERE ordem_servico_id IN ({lista});")
    for oid in apagar_os:
        A(f"DELETE FROM public.financeiro_fluxo WHERE empresa_id = {q(EMP)} AND descricao LIKE {q('%(OS #' + oid[:6] + ')%')};")
    A(f"DELETE FROM public.ordens_servico WHERE id IN ({lista}) AND empresa_id = {q(EMP)};")

for oid, c in plano.get('clientes_criar', {}).items():
    novo_id = str(uuid.uuid5(uuid.NAMESPACE_URL, 'flowdrain-migracao-' + oid))
    cols = {'id': novo_id, 'empresa_id': EMP, 'ativo': True, **c}
    A(f"INSERT INTO public.clientes ({', '.join(cols)}) VALUES ({', '.join(q(v) for v in cols.values())}) ON CONFLICT (id) DO NOTHING;")
    A(f"UPDATE public.ordens_servico SET cliente_id = {q(novo_id)}, cliente_whatsapp = NULL WHERE id = {q(oid)};")
    plano['os_update'].pop(oid, None)

# ---------- 3. Clientes: telefone, endereço ----------
saem = {m['sai'] for m in plano['clientes_merge']} | teste_ids
for cid, upd in plano['clientes_update'].items():
    if cid in saem or not upd:
        continue
    sets = ', '.join(f"{k} = {q(v)}" for k, v in upd.items())
    A(f"UPDATE public.clientes SET {sets} WHERE id = {q(cid)} AND empresa_id = {q(EMP)};")

# ---------- 4. Junta duplicados (OS passam para o cadastro que fica) ----------
for m in plano['clientes_merge']:
    fica, sai = destino(m['fica']), m['sai']
    if fica == sai:
        continue
    comp = dict(m.get('completar') or {})
    nome = comp.pop('nome_razao', None)
    sets = [f"{k} = COALESCE(NULLIF({k}::text, '')::{'uuid' if k == 'marca_id' else 'text'}, {q(v)}{'::uuid' if k == 'marca_id' else ''})" for k, v in comp.items() if v not in (None, '')]
    if nome:
        sets.append(f"nome_razao = {q(nome)}")
    if sets:
        A(f"UPDATE public.clientes SET {', '.join(sets)} WHERE id = {q(fica)};")
    A(f"UPDATE public.ordens_servico SET cliente_id = {q(fica)} WHERE cliente_id = {q(sai)};")
    A(f"UPDATE public.historico_servicos_antigos SET cliente_id = {q(fica)} WHERE cliente_id = {q(sai)};")
    A(f"DELETE FROM public.clientes WHERE id = {q(sai)} AND empresa_id = {q(EMP)};")

if teste_ids:
    A(f"DELETE FROM public.clientes WHERE id IN ({', '.join(q(i) for i in teste_ids)}) AND empresa_id = {q(EMP)};")

# ---------- 5. OS: origem, técnico, empresa, telefone, cliente ----------
for oid, upd in plano['os_update'].items():
    if oid in apagar_os:
        continue
    campos = {k: v for k, v in upd.items() if not k.startswith('_')}
    if 'cliente_id' in campos:
        campos['cliente_id'] = destino(campos['cliente_id'])
    if not campos:
        continue
    sets = ', '.join(f"{k} = {q(v)}" for k, v in campos.items())
    A(f"UPDATE public.ordens_servico SET {sets} WHERE id = {q(oid)} AND empresa_id = {q(EMP)};")
for oid, tec in plano['comissoes_tecnico'].items():
    if oid not in apagar_os:
        A(f"UPDATE public.historico_comissoes SET tecnico_id = {q(tec)} WHERE ordem_servico_id = {q(oid)};")

# Telefone de todas as OS no mesmo formato
for o in os_db:
    if o['id'] in apagar_os or o['id'] in plano['os_update'] and 'cliente_whatsapp' in plano['os_update'][o['id']]:
        continue
    d, fmt = normaliza_fone(o.get('cliente_whatsapp'))
    if fmt and fmt != o.get('cliente_whatsapp'):
        A(f"UPDATE public.ordens_servico SET cliente_whatsapp = {q(fmt)} WHERE id = {q(o['id'])};")

# ---------- 6. OS novas da planilha ----------
idx_fone = {}
for c in clientes:
    if c['id'] not in saem and c['_fone']:
        idx_fone.setdefault(c['_fone'], c['id'])
TEC_POR_NOME = {v['nome']: k for k, v in usuarios.items() if v.get('nome')}
TEC_POR_NOME['Jorge e Pedro'] = TEC_JP
for r in plano['os_novas']:
    oid = str(uuid.uuid5(uuid.NAMESPACE_URL, 'flowdrain-planilha-' + r['Id']))
    d, fmt = normaliza_fone(r['Telefone'])
    marca = MARCA.get(r['Empresa Prestadora'].strip())
    nome = r['Nome Cliente'].strip() + (f" ({r['Emp.Cond'].strip()})" if r['Emp.Cond'].strip() else '')
    cid = idx_fone.get(d) if fmt else None
    if not cid:
        cid = str(uuid.uuid5(uuid.NAMESPACE_URL, 'flowdrain-cliente-planilha-' + r['Id']))
        end = split_endereco(r['Endereco'])
        doc = so_dig(r['CNPJ_CPF']) or so_dig(r['CPF/CNPJ'])
        cols = {'id': cid, 'empresa_id': EMP, 'marca_id': marca, 'nome_razao': nome, 'whatsapp': fmt, 'telefone': fmt,
                'cpf_cnpj': doc or None, 'endereco': r['Endereco'].strip(), 'complemento': r['Complemento'].strip() or end.get('complemento'), 'ativo': True,
                **{k: v for k, v in end.items() if k in ('logradouro', 'numero', 'bairro', 'cidade', 'uf', 'cep')}}
        A(f"INSERT INTO public.clientes ({', '.join(cols)}) VALUES ({', '.join(q(v) for v in cols.values())}) ON CONFLICT (id) DO NOTHING;")
        idx_fone[d] = cid
    itens, partes = [], []
    for sfx in ('', '2', '3', '4'):
        serv = r['Serviço Feito' if not sfx else 'Serviço' + sfx].strip()
        tot = money(r['Valor Serviço' + (' ' + sfx if sfx else '')])
        if serv and tot:
            desc = f"{serv} | {r['Metros' + sfx] or '1,00'}m | a R$ {r['Valor Metro' + sfx]}/m"
            itens.append({'descricao': desc, 'qtd': 1, 'total': tot, 'valor_unitario': tot})
            partes.append(desc)
    data = data_iso(r['Data'])
    cols = {'id': oid, 'empresa_id': EMP, 'marca_id': marca, 'cliente_id': cid, 'cliente_nome': nome, 'cliente_whatsapp': fmt,
            'descricao_servico': ' + '.join(partes), 'descricao': ' + '.join(partes), 'valor_total': money(r['Valor Total']),
            'status': 'CONCLUIDO', 'tipo': 'SERVICO', 'data_agendamento': data, 'created_at': data,
            'tecnico_id': TEC_POR_NOME.get(r['Tecnicofez'].strip()) or TEC_PG, 'origem_id': r['Id'],
            'observacoes': r['Descrição '].strip() or None, 'nfe_status': 'nao_emitida', 'desconto': 0}
    vals = ', '.join(q(v) for v in cols.values())
    A(f"INSERT INTO public.ordens_servico ({', '.join(cols)}, itens, fotos) VALUES ({vals}, {q(json.dumps(itens, ensure_ascii=False))}::jsonb, '{{\"antes\": [], \"depois\": []}}'::jsonb) ON CONFLICT (id) DO NOTHING;")

# ---------- 7. CNPJs ----------
A("UPDATE public.empresas_marcas SET cnpj = '57.717.453/0001-50' WHERE id = '93bd1248-9bcd-4e69-9d13-5569ae63db03';")
A("UPDATE public.empresas_marcas SET cnpj = '38.057.542/0001-73' WHERE id = '1372b5a0-b28e-4d8c-a1d6-75d6a47b0553';")

# ---------- 8. Histórico antigo (2015–2021) ----------
campos = ['empresa_id', 'cliente_id', 'origem_id', 'cliente_nome', 'telefone', 'endereco', 'cidade', 'data', 'servico', 'valor', 'pagamento', 'quem_fez', 'detalhes']
lote = []
for h in plano['antigos']:
    cid = destino(h['cliente_id']) if h['cliente_id'] else None
    if cid in saem:
        cid = None
    lote.append('(' + ', '.join(q(v) for v in [EMP, cid] + [h[k] for k in campos[2:]]) + ')')
for i in range(0, len(lote), 300):
    A(f"INSERT INTO public.historico_servicos_antigos ({', '.join(campos)}) VALUES\n" + ',\n'.join(lote[i:i + 300]) + ';')

A('COMMIT;')

out = os.path.join(G['BASE'], 'aplicar.sql')
open(out, 'w', encoding='utf-8').write('\n'.join(sql))
print(f'\nSQL gerado: {out} ({len(sql)} comandos)')
print('OS apagadas (teste):', len(apagar_os), '| clientes que saem:', len(saem), '| OS novas:', len(plano['os_novas']), '| antigos:', len(lote))

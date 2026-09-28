"""Gera o SQL que liga assinaturas/fotos (já no Storage avatars/os-planilha/) às OS. Não sobrescreve o que o app já tem."""
import csv, json, os, sys
from urllib.parse import quote
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\pedro\NovoApp\backup_migracao_20260928'
URL = 'https://dltqxfyrltgbudtzxzot.supabase.co/storage/v1/object/public/avatars/os-planilha/'
enviados = {n for p in ('Novos_Images', 'Novos_Images2', 'Novos_Images3') if os.path.isdir(os.path.join(BASE, 'midias', p)) for n in os.listdir(os.path.join(BASE, 'midias', p))}
os_por_origem = json.load(open(os.path.join(BASE, 'os_por_origem.json'), encoding='utf-8'))


def q(v):
    return "'" + str(v).replace("'", "''") + "'"


por_os = {}
for r in csv.DictReader(open(os.path.join(BASE, 'planilha_original', 'Novos.csv'), encoding='utf-8-sig')):
    for os_id in os_por_origem.get(r['Id'].strip(), []):
        d = por_os.setdefault(os_id, {'assinatura': None, 'antes': [], 'depois': []})
        for col, alvo in (('Assinatura', 'assinatura'), ('Imagem', 'antes'), ('Imagem 2', 'depois')):
            nome = r[col].strip().split('/', 1)[-1]
            if nome and nome in enviados:
                url = URL + quote(nome)
                if alvo == 'assinatura':
                    d['assinatura'] = d['assinatura'] or url
                elif url not in d[alvo]:
                    d[alvo].append(url)

sql = ['BEGIN;']
n_ass = n_fot = 0
for os_id, d in por_os.items():
    if d['assinatura']:
        sql.append(f"UPDATE ordens_servico SET assinatura_cliente_url = {q(d['assinatura'])} WHERE id = {q(os_id)} AND coalesce(assinatura_cliente_url,'') = '';")
        n_ass += 1
    if d['antes'] or d['depois']:
        fotos = json.dumps({'antes': d['antes'], 'depois': d['depois']})
        sql.append(f"UPDATE ordens_servico SET fotos = {q(fotos)}::jsonb WHERE id = {q(os_id)} AND (fotos IS NULL OR (coalesce(jsonb_array_length(fotos->'antes'),0) = 0 AND coalesce(jsonb_array_length(fotos->'depois'),0) = 0));")
        n_fot += 1
sql.append('COMMIT;')
sql.append("SELECT count(*) FILTER (WHERE assinatura_cliente_url LIKE '%os-planilha%') assinaturas, count(*) FILTER (WHERE fotos::text LIKE '%os-planilha%') com_fotos FROM ordens_servico WHERE empresa_id='58f0512e-8a00-4c31-ba32-f67f9b9ddcbe';")
open(os.path.join(BASE, 'midias.sql'), 'w', encoding='utf-8').write('\n'.join(sql))
print('OS com assinatura:', n_ass, '| OS com fotos:', n_fot)

"""Confere o banco contra a planilha (só lê). Uso: python conferir.py <os_atual.json>"""
import csv, json, os, sys
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\pedro\NovoApp\backup_migracao_20260928'
MARCA = {'86676733': '93bd1248-9bcd-4e69-9d13-5569ae63db03', '46a54a5d': '2c6b7aee-3453-49f6-88a5-f09879f8aafb',
         '1639370a': '1372b5a0-b28e-4d8c-a1d6-75d6a47b0553', 'be8edc77': 'fdf65712-50c5-4b71-a754-eac3a9eb4b5d',
         'Batel': 'e0de0000-0000-0000-0000-000000000004', 'Paulo': 'e0de0000-0000-0000-0000-000000000003',
         '195ae451': '7fb4a63b-1dae-4f74-89bd-aa2e3bb917d4'}
TEC = {'Jorge e Pedro': 'Jorge e Pedro', 'Pedro e Graça': 'Pedro e Graça'}
j = json.load(open(sys.argv[1], encoding='utf-8-sig'))
rows = list(j['rows'][0].values())[0] if isinstance(j['rows'][0], dict) and len(j['rows'][0]) == 1 else j['rows']
por_origem = {}
for o in rows:
    if o.get('origem_id'):
        por_origem.setdefault(o['origem_id'], []).append(o)
prob = Counter()
linhas_por_id = {}
for r in csv.DictReader(open(os.path.join(BASE, 'planilha_original', 'Novos.csv'), encoding='utf-8-sig')):
    linhas_por_id.setdefault(r['Id'].strip(), []).append(r)
repetidos = {k for k, v in linhas_por_id.items() if len(v) > 1}
exemplos = {}
for r in csv.DictReader(open(os.path.join(BASE, 'planilha_original', 'Novos.csv'), encoding='utf-8-sig')):
    if r['Id'].strip() in repetidos:
        continue  # código repetido na planilha: conferido à parte
    for o in por_origem.get(r['Id'].strip(), []):
        esperado = MARCA.get(r['Empresa Prestadora'].strip())
        tec_pl = r['Tecnicofez'].strip()
        if esperado == MARCA['Paulo'] and (o['tec'] != 'Paulo'):
            esperado = None  # regra: O Desentupidor só se o técnico foi o Paulo
        if esperado and o['marca_id'] != esperado:
            prob['empresa diferente da planilha'] += 1; exemplos.setdefault('empresa', (r['Id'], r['Nome Cliente'], o['marca'], tec_pl))
        if tec_pl in TEC and o['tec'] != TEC[tec_pl]:
            prob['técnico diferente'] += 1; exemplos.setdefault('tec', (r['Id'], tec_pl, o['tec']))
        if o['ass_planilha'] and r['Assinatura'].strip() and r['Assinatura'].split('/')[-1] not in (o['ass'] or '') and 'os-planilha' in (o['ass'] or ''):
            prob['assinatura de outra OS'] += 1; exemplos.setdefault('ass', (r['Id'], o['ass']))
print('OS conferidas:', sum(len(v) for v in por_origem.values()))
print('problemas:', dict(prob) or 'nenhum')
print('exemplos:', exemplos)
print('códigos repetidos na planilha (duas linhas com o mesmo Id):', len(repetidos))

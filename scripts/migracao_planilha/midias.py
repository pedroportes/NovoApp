"""Cruza as imagens do zip Novos_Images com a planilha e as OS do banco (só lê). Gera midias_plano.json."""
import csv, json, os, sys, zipfile
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\pedro\NovoApp\backup_migracao_20260928'
ZIP = sys.argv[1]
z = zipfile.ZipFile(ZIP)
no_zip = {n.split('/', 1)[-1]: n for n in z.namelist()}
os_por_origem = json.load(open(os.path.join(BASE, 'os_por_origem.json'), encoding='utf-8'))

plano, faltam, sem_os = [], [], 0
for r in csv.DictReader(open(os.path.join(BASE, 'planilha_original', 'Novos.csv'), encoding='utf-8-sig')):
    oid = r['Id'].strip()
    for col, tipo in (('Assinatura', 'assinatura'), ('Imagem', 'foto'), ('Imagem 2', 'foto'), ('Video', 'video')):
        ref = r[col].strip()
        if not ref:
            continue
        nome = ref.split('/', 1)[-1]
        if nome not in no_zip:
            faltam.append({'Id': oid, 'coluna': col, 'arquivo': ref})
            continue
        destinos = os_por_origem.get(oid, [])
        if not destinos:
            sem_os += 1
            continue
        for os_id in destinos:
            plano.append({'os_id': os_id, 'tipo': tipo, 'zip': no_zip[nome], 'destino': f'os-planilha/{nome}'})

print('referências achadas no zip:', len(plano), '| não estão no zip:', len(faltam), '| linhas sem OS no app:', sem_os)
print('OS com assinatura:', len({p['os_id'] for p in plano if p['tipo'] == 'assinatura'}), '| OS com foto:', len({p['os_id'] for p in plano if p['tipo'] == 'foto'}))
print('exemplos que faltam:', faltam[:5])
json.dump({'plano': plano, 'faltam': faltam}, open(os.path.join(BASE, 'midias_plano.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

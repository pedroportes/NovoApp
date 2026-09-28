"""Preenche clientes.empresa_condominio com a coluna "Emp.Cond" da planilha (só lê; gera SQL + relatório).
Uso: python empresa_condominio.py <os_cli.json>   (JSON: origem_id, cliente_id, nome_razao, empresa_id, data_agendamento)

Regras:
- cada cliente fica com o Emp.Cond da OS mais recente dele que tenha esse campo;
- ignora quando o Emp.Cond é só o nome da própria pessoa (ex.: "Juliana" no cliente Juliana);
- se o nome termina com "(Emp.Cond)", tira o parêntese do nome ("Gerson (Condomínio Maurer)" -> "Gerson");
- só mexe em clientes da empresa do Pedro e só em quem ainda não tem empresa/condomínio.
"""
import csv, json, os, re, sys, unicodedata
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\pedro\NovoApp\backup_migracao_20260928'
EMPRESA = '58f0512e-8a00-4c31-ba32-f67f9b9ddcbe'


def norm(s):
    s = unicodedata.normalize('NFKD', (s or '').lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return ' '.join(re.sub(r'[^a-z0-9]+', ' ', s).split())


ORG = re.compile(r'\b(condominio|cond|edificio|ed|residencial|resid|ltda|me|sa|eireli|hospital|clinica|clin|escola|colegio|cmei|creche|'
                 r'igreja|atacad\w*|supermercado|mercado|farmacia|restaurante|pizzaria|bar|lanchonete|padaria|construtora|transport\w*|'
                 r'industria|comercio|loja|shopping|hotel|ibis|imobiliaria|imoveis|centro|associacao|prefeitura|copel|sanepar|unimed|'
                 r'posto|academia|distribuidora|oficina|mecanica|auto|laboratorio|empresa|grupo|instituto|fundacao|universidade|faculdade|'
                 r'doctor|studio|salao|pet|vet|dermavet|metal\w*|vidros|glass|couros|alimentos|engenharia|servicos|locacoes|maxxi|tlog|localiza|'
                 r'panificadora|conjunto|moradias|cartorio|motos|grill|clube|motel|confeitaria|odontologia|acougue|cervejaria|'
                 r'contabilidade|informatica|house|unibrasil|policlinica|village|parque|residence)\b')


def eh_org(s):
    return bool(ORG.search(norm(s)))


def q(v):
    return 'NULL' if v is None else "'" + str(v).replace("'", "''") + "'"


def data_iso(s):
    m = re.match(r'(\d{2})/(\d{2})/(\d{4})', s or '')
    return f'{m[3]}-{m[2]}-{m[1]}' if m else ''


rows = json.load(open(sys.argv[1], encoding='utf-8-sig'))['rows']
cli_por_origem = defaultdict(set)
nome_cli = {}
for o in rows:
    if o['empresa_id'] != EMPRESA:
        continue
    cli_por_origem[o['origem_id']].add(o['cliente_id'])
    nome_cli[o['cliente_id']] = o['nome_razao'] or ''

candidatos = defaultdict(list)  # cliente_id -> [(data, emp)]
for r in csv.DictReader(open(os.path.join(BASE, 'planilha_original', 'Novos.csv'), encoding='utf-8-sig')):
    emp = ' '.join(r['Emp.Cond'].split())
    if not emp:
        continue
    for cid in cli_por_origem.get(r['Id'].strip(), ()):
        candidatos[cid].append((data_iso(r['Data']), emp))

# Nomes de empresa que parecem nome de gente (aparecem sozinhos como "nome" de cliente)
MARCAS_CONHECIDAS = {'translovato', 'tlog', 'cristal', 'blue', 'letskuk', 'lets', 'sugisawa', 'protege', 'proforte', 'profort',
                     'atacadao', 'cedip', 'karson', 'dugale', 'maxxi', 'unimed', 'ibis', 'econet', 'vhsys', 'servopa', 'fesmepar',
                     'localiza', 'dacar', 'vidofer', 'durlicouros', 'forten', 'vollmer', 'radiadores', 'inovtec', 'decor8'}
LIXO = {'orcamento', 'residencia', 'residencial', 'lojas', 'novo', 'g', 'servico do paulo', 'imobiliaria'}
# primeiros nomes de gente: 1ª palavra que aparece em 2+ nomes de cliente que não são empresa (tirando o parêntese)
from collections import Counter
_cont = Counter()
for n in nome_cli.values():
    b = re.sub(r'\([^()]*\)', ' ', n)
    if norm(b) and not eh_org(b):
        _cont[norm(b).split()[0]] += 1
PRIMEIROS = {w for w, c in _cont.items() if c >= 2 and len(w) >= 3} - MARCAS_CONHECIDAS
# nomes raros vistos na conferência manual (28/09)
PRIMEIROS |= {'karin', 'sidnei', 'ladenir', 'rosieli', 'silvana', 'emily', 'izabel', 'sidiclei', 'marcio', 'luisi'}
TRATAMENTO = {'sr', 'sra', 'dona', 'seu', 'dr', 'dra'}


def eh_pessoa(s, nome_base=''):
    p = norm(s).split()
    if not p or eh_org(s) or (set(p) & MARCAS_CONHECIDAS):
        return False
    if p[0] in TRATAMENTO or p[0] in PRIMEIROS:
        return True
    # apelido/pedaço do próprio nome ("Karin" no cliente Karina, "Joel" na Joelma)
    b = norm(nome_base).split()
    return len(p) == 1 and bool(b) and (b[0].startswith(p[0]) or p[0].startswith(b[0]))


def eh_recado(s):
    n = norm(s)
    return n.startswith('nao ') or 'orcamento' in n or 'teste' in n or 'paulo fez' in n or 'procurar' in n


# casos que a regra não resolve sozinha (conferidos à mão em 28/09)
AJUSTE_MANUAL = {
    'Translovato Márcio (Marcio Translovato)': ('Márcio', 'Translovato'),
    'Translovato (Marcio/Ana Paula)': ('Marcio/Ana Paula', 'Translovato'),
    'linck máquinas Rosi (rosiéli)': ('Rosiéli', 'Linck máquinas'),
}

sql = ['BEGIN;']
rel = []
ignorados = []
for cid, lst in candidatos.items():
    nome = nome_cli[cid]
    m = re.match(r'^(.*?)\s*\(([^()]*)\)\s*$', nome)
    base, par = (m[1].strip(), m[2].strip()) if m else (nome.strip(), '')
    nb = norm(base)
    escolhido, motivo = None, 'era o nome da pessoa'
    # o que já aparece entre parênteses no nome tem preferência (é o que o Pedro já vê hoje)
    ordem = sorted(lst, key=lambda de: (norm(de[1]) == norm(par) and bool(par), de[0]), reverse=True)
    for _, emp in ordem:
        ne = norm(emp)
        if not ne or ne in LIXO or len(ne) < 3 or ne == nb or ne == norm(nome) or (len(ne.split()) == 1 and nb.split()[:1] == [ne]):
            continue
        escolhido = emp
        break
    novo_nome = nome
    if escolhido and (eh_recado(nome) or eh_recado(escolhido)):
        escolhido, motivo = None, 'nome tem recado/teste: não mexe'
    elif escolhido and eh_pessoa(escolhido, base):
        if m and norm(par) == norm(escolhido) and eh_org(base):
            # invertido na planilha: empresa no nome e pessoa no parêntese ("Atacadao pinhais (Gustavo)")
            novo_nome, escolhido = par, base
        else:
            escolhido, motivo = None, 'o campo tinha nome de pessoa'
    elif escolhido and eh_org(base) and norm(par) != norm(escolhido):
        escolhido, motivo = None, 'o nome já é a empresa'
    elif escolhido and m and norm(par) == norm(escolhido) and base:
        novo_nome = base  # "Gerson (Condomínio Maurer)" -> "Gerson"
    if nome in AJUSTE_MANUAL:
        novo_nome, escolhido = AJUSTE_MANUAL[nome]
    if not escolhido:
        ignorados.append((nome, sorted({e for _, e in lst}), motivo))
        continue
    sql.append(f"UPDATE clientes SET empresa_condominio = {q(escolhido)}"
               + (f", nome_razao = {q(novo_nome)}" if novo_nome != nome else '')
               + f" WHERE id = {q(cid)} AND empresa_id = {q(EMPRESA)} AND empresa_condominio_id IS NULL;")
    rel.append((nome, novo_nome, escolhido, sorted({e for _, e in lst})))
sql.append('COMMIT;')

open(os.path.join(BASE, 'empresa_condominio.sql'), 'w', encoding='utf-8').write('\n'.join(sql) + '\n')
with open(os.path.join(BASE, 'empresa_condominio.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['nome antes', 'nome depois', 'empresa/condomínio', 'o que tinha na planilha'])
    for a, b, c, d in sorted(rel, key=lambda x: x[0].lower()):
        w.writerow([a, b, c, ' | '.join(d)])
    for a, d, mot in ignorados:
        w.writerow([a, a, f'(não preenchido: {mot})', ' | '.join(d)])
print('clientes preenchidos:', len(rel), '| nome limpo:', sum(1 for a, b, *_ in rel if a != b), '| ignorados:', len(ignorados))
print('empresas/condomínios diferentes:', len({norm(c) for _, _, c, _ in rel}))

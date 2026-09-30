// Organiza as linhas da aba "Novos" (AppSheet) para a função planilha_sync do FlowDrain.
// Mesmas regras da migração de 28/09 (scripts/migracao_planilha/simular.py).
// Só manda as linhas alteradas nos últimos DIAS dias (coluna Data_Atualizacao); a função ignora o que não mudou.
const DIAS = 3;

const soDig = (v) => String(v ?? '').replace(/\D/g, '');
const txt = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

// Telefone: sempre (41) 99999-9999 / (41) 3333-4444
function fone(v) {
  let d = soDig(v);
  if (!d) return { d: '', fmt: '' };
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if ((d.length === 11 || d.length === 12) && d.startsWith('0')) d = d.slice(1);
  if (d.length === 8 || d.length === 9) d = '41' + d;
  if (d.length === 10 && '6789'.includes(d[2])) d = d.slice(0, 2) + '9' + d.slice(2);
  if (d.length === 11) return { d, fmt: `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` };
  if (d.length === 10) return { d, fmt: `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` };
  return { d: '', fmt: '' }; // inválido: não usa
}

// "R$ 1.480,00" -> 1480
function dinheiro(v) {
  let s = String(v ?? '').replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

// "28/09/2026" -> "2026-09-28"
const dataIso = (v) => { const m = String(v ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
// "28/09/2026 18:52:26" (Brasília) -> Date
const dataHora = (v) => { const m = String(v ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/); return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T${(m[4] || '0').padStart(2, '0')}:${m[5] || '00'}:${m[6] || '00'}-03:00`) : null; };

// Endereço do AppSheet: "R. Cap. Tomás ..., 638 - Cidade Jardim, São José dos Pinhais - PR, 83035-440, Brasil"
const COMPLEMENTO = /^(casa|ap|apto|apartamento|bloco|bl|sala|sl|fundos|sobrado|lote|lt|loja|lj|andar|conj|cj|galp[aã]o)\b/i;
function endereco(full) {
  let s = txt(full).replace(/,?\s*Brasil$/i, '');
  const out = {};
  let m = s.match(/\b(\d{2}\.?\d{3})-?(\d{3})\b/);
  if (m) { out.cep = soDig(m[0]).replace(/(\d{5})(\d{3})/, '$1-$2'); s = s.replace(m[0], '').replace(/\bCEP\b:?/i, ''); }
  m = s.match(/(?:\s-\s|,\s*|\/)([A-Z]{2})\s*,?\s*$/);
  if (m) { out.uf = m[1]; s = s.slice(0, m.index); }
  const partes = s.split(/\s*,\s*|\s+-\s+/).map(p => p.trim()).filter(Boolean);
  if (!partes.length) return out;
  let rua = partes.shift();
  m = rua.match(/^(.*\D)\s+(\d{1,6}[A-Za-z]?)$/);
  if (m && !/^(br|pr|rod|km)$/i.test(m[1].trim().split(' ').pop())) { rua = m[1].trim(); out.numero = m[2]; }
  out.logradouro = rua;
  if (!out.numero && partes.length && /^(\d{1,6}[A-Za-z]?|s\/?n)$/i.test(partes[0])) out.numero = partes.shift();
  else if (!out.numero && partes.length) {
    const n = partes[0].match(/^(\d{1,6})\s+(.+)$/);
    if (n) { partes.shift(); out.numero = n[1]; if (COMPLEMENTO.test(n[2])) out.complemento = n[2]; else partes.unshift(n[2]); }
  }
  if (partes.length && COMPLEMENTO.test(partes[0]) && !out.complemento) out.complemento = partes.shift();
  if (partes.length >= 3) out.complemento = partes.shift();
  if (partes.length >= 2) { out.bairro = partes[0]; out.cidade = partes[1]; }
  else if (partes.length === 1) out.bairro = partes[0];
  return out;
}

// Até 4 serviços por linha. Metros diferente de 1 = cobrado por metro.
function itens(r) {
  const lista = [];
  for (const sfx of ['', '2', '3', '4']) {
    const nome = txt(sfx ? r['Serviço' + sfx] : r['Serviço Feito']);
    const total = dinheiro(r['Valor Serviço' + (sfx ? ' ' + sfx : '')]);
    if (!nome || !total) continue;
    const metros = dinheiro(r['Metros' + sfx]) || 1;
    const porMetro = dinheiro(r['Valor Metro' + sfx]);
    if (metros !== 1 && porMetro > 0) lista.push({ descricao: nome, qtd: metros, valor_unitario: porMetro, total, unidade: 'metro' });
    else lista.push({ descricao: nome, qtd: 1, valor_unitario: total, total, unidade: 'servico' });
  }
  return lista;
}

function organizar(linhas, agora = new Date()) {
  const desde = new Date(agora.getTime() - DIAS * 24 * 3600 * 1000);
  const saida = [];
  for (const r of linhas) {
    const id = txt(r['Id']);
    const alterada = dataHora(r['Data_Atualizacao']);
    if (!id || !alterada || alterada < desde) continue;
    const f = fone(r['Telefone']);
    const end = endereco(r['Endereco']);
    saida.push({
      origem_id: id,
      atualizado_em: txt(r['Data_Atualizacao']),
      data: dataIso(r['Data']),
      marca_codigo: txt(r['Empresa Prestadora']),
      ativo: String(r['Ativo'] ?? '').trim().toUpperCase() !== 'FALSE',
      tipo_planilha: txt(r['Tipo']),
      tecnico: txt(r['Tecnicofez']),
      valor_total: dinheiro(r['Valor Total']),
      observacoes: txt(r['Descrição '] ?? r['Descrição']),
      itens: itens(r),
      cliente: {
        nome: txt(r['Nome Cliente']),
        empresa_condominio: txt(r['Emp.Cond']),
        fone: f.d, fone_fmt: f.fmt,
        cpf_cnpj: txt(r['CNPJ_CPF'] || r['CPF/CNPJ'] || r['CNPJ']),
        endereco: txt(r['Endereco']),
        logradouro: end.logradouro || '', numero: end.numero || '',
        complemento: txt(r['Complemento']) || end.complemento || '',
        bairro: end.bairro || '', cidade: end.cidade || '', uf: end.uf || '', cep: end.cep || '',
      },
    });
  }
  return saida;
}

// ---- n8n (Code node, "Run Once for All Items") ----
if (typeof $input !== 'undefined') {
  const linhas = organizar($input.all().map(i => i.json));
  return linhas.length ? [{ json: { linhas } }] : [];
}
if (typeof module !== 'undefined') module.exports = { organizar, fone, endereco, itens, dinheiro };

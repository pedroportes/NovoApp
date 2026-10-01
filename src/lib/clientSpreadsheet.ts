// A biblioteca de Excel (xlsx-js-style, ~1 MB) só é carregada na hora de baixar o modelo.
// Este arquivo também é importado na abertura do app (formatPhoneBR no syncService),
// então NUNCA importar o XLSX de forma estática aqui.
type XLSXLib = typeof import('xlsx-js-style')

// Planilha modelo de clientes + regras de leitura/normalização usadas na importação.
// A mesma lista de colunas gera o modelo e reconhece a planilha na volta.

export type ClientField =
    | 'nome_razao' | 'whatsapp' | 'cpf_cnpj' | 'email' | 'cep' | 'logradouro' | 'numero'
    | 'complemento' | 'bairro' | 'cidade' | 'uf' | 'referencia' | 'endereco_completo' | 'empresa_condominio'

export interface ClientRow {
    nome_razao: string
    whatsapp: string
    cpf_cnpj: string
    email: string
    cep: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    uf: string
    referencia: string
    empresa_condominio: string
}

export const TEMPLATE_COLUMNS: { field: ClientField; header: string; width: number; ajuda: string; exemplo: string }[] = [
    { field: 'nome_razao', header: 'Nome do cliente ou quem atendeu *', width: 32, ajuda: 'Obrigatório. Nome da pessoa. A empresa/condomínio vai na coluna ao lado.', exemplo: 'Maria Silva' },
    { field: 'empresa_condominio', header: 'Empresa / Comércio / Condomínio', width: 28, ajuda: 'Opcional. Onde a pessoa trabalha ou mora. Ex.: síndica Joana -> Condomínio Sol e Mar.', exemplo: 'Condomínio Sol e Mar' },
    { field: 'whatsapp', header: 'Telefone / WhatsApp', width: 18, ajuda: 'Com DDD. Pode ter parênteses, espaço ou traço. Um número por cliente.', exemplo: '(41) 99999-1234' },
    { field: 'cpf_cnpj', header: 'CPF / CNPJ', width: 20, ajuda: 'Opcional. Necessário para emitir nota fiscal no nome do cliente.', exemplo: '123.456.789-09' },
    { field: 'email', header: 'E-mail', width: 26, ajuda: 'Opcional.', exemplo: 'maria@email.com' },
    { field: 'cep', header: 'CEP', width: 12, ajuda: 'Opcional, mas ajuda muito. 8 números.', exemplo: '81820-340' },
    { field: 'logradouro', header: 'Rua', width: 32, ajuda: 'Só o nome da rua/avenida, SEM o número.', exemplo: 'Rua Primeiro de Maio' },
    { field: 'numero', header: 'Número', width: 9, ajuda: 'Só o número da casa. Sem número: escreva S/N.', exemplo: '1515' },
    { field: 'complemento', header: 'Complemento', width: 18, ajuda: 'Apto, bloco, sala, casa dos fundos...', exemplo: 'Apto 12 Bloco B' },
    { field: 'bairro', header: 'Bairro', width: 20, ajuda: 'Bairro.', exemplo: 'Xaxim' },
    { field: 'cidade', header: 'Cidade', width: 20, ajuda: 'Cidade. Se ficar vazio, fica em branco (não é preenchido sozinho).', exemplo: 'Curitiba' },
    { field: 'uf', header: 'UF', width: 5, ajuda: 'Sigla do estado com 2 letras.', exemplo: 'PR' },
    { field: 'referencia', header: 'Referência / Observação', width: 30, ajuda: 'Ponto de referência ou observação sobre o cliente.', exemplo: 'Portão verde, perto do mercado' },
]

// Nomes de coluna aceitos (sem acento, minúsculo). Serve para planilhas que não usam o modelo.
const HEADER_ALIASES: Record<ClientField, string[]> = {
    nome_razao: ['nome', 'nome *', 'nome do cliente ou quem atendeu *', 'nome do cliente ou quem atendeu', 'nome/razao social', 'nome / razao social', 'razao social', 'cliente', 'nome do cliente', 'nome_razao'],
    whatsapp: ['telefone / whatsapp', 'telefone', 'whatsapp', 'whats', 'celular', 'fone', 'contato', 'tel'],
    cpf_cnpj: ['cpf / cnpj', 'cpf/cnpj', 'cpf', 'cnpj', 'documento', 'cpf_cnpj'],
    email: ['e-mail', 'email'],
    cep: ['cep'],
    logradouro: ['rua', 'logradouro', 'avenida', 'rua / avenida'],
    numero: ['numero', 'n', 'no', 'nº', 'n°', 'num'],
    complemento: ['complemento', 'compl', 'apto'],
    bairro: ['bairro'],
    cidade: ['cidade', 'municipio'],
    uf: ['uf', 'estado'],
    referencia: ['referencia / observacao', 'referencia', 'observacao', 'observacoes', 'obs', 'ponto de referencia'],
    endereco_completo: ['endereco', 'endereco completo', 'endereço completo'],
    empresa_condominio: ['empresa / comercio / condominio', 'empresa / condominio', 'empresa/condominio', 'empresa condominio', 'condominio', 'empresa', 'emp.cond', 'emp cond', 'empresa comercio condominio', 'local de trabalho'],
}

export const FIELD_LABELS: Record<ClientField, string> = {
    nome_razao: 'Nome',
    whatsapp: 'Telefone / WhatsApp',
    cpf_cnpj: 'CPF / CNPJ',
    email: 'E-mail',
    cep: 'CEP',
    logradouro: 'Rua',
    numero: 'Número',
    complemento: 'Complemento',
    bairro: 'Bairro',
    cidade: 'Cidade',
    uf: 'UF',
    referencia: 'Referência / Observação',
    endereco_completo: 'Endereço completo (tudo numa coluna)',
    empresa_condominio: 'Empresa / Comércio / Condomínio',
}

export const semAcento = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '')

export function detectField(header: unknown): ClientField | '' {
    const h = semAcento(String(header ?? '')).replace(/\s+/g, ' ')
    if (!h) return ''
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [ClientField, string[]][]) {
        if (aliases.some(a => semAcento(a) === h)) return field
    }
    // Aproximações (só se não bateu exato)
    if (h.includes('whats') || h.includes('celular') || h.includes('telefone')) return 'whatsapp'
    if (h.includes('cpf') || h.includes('cnpj')) return 'cpf_cnpj'
    if (h.includes('mail')) return 'email'
    if (h.includes('bairro')) return 'bairro'
    if (h.includes('cidade')) return 'cidade'
    if (h.includes('complemento')) return 'complemento'
    if (h.includes('referencia') || h.startsWith('obs')) return 'referencia'
    if (h.includes('condominio') || h.startsWith('empresa') || h.startsWith('emp.')) return 'empresa_condominio'
    if (h.includes('endereco')) return 'endereco_completo'
    if (h.startsWith('nome') || h.includes('razao')) return 'nome_razao'
    return ''
}

/** Linha parece cabeçalho se 2+ células forem nomes de coluna conhecidos. */
export function looksLikeHeader(row: unknown[]): boolean {
    return row.filter(c => detectField(c) !== '').length >= 2
}

export function normalizePhone(v: unknown): string {
    let d = soDigitos(v)
    if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
    if ((d.length === 11 || d.length === 12) && d.startsWith('0')) d = d.slice(1) // 041...
    return d
}

/**
 * Padrão único de telefone do FlowDrain (mesma regra da migração da planilha):
 * sem DDD -> 41; celular antigo sem o 9 -> ganha o 9; resultado (41) 99999-9999 ou (41) 3333-4444.
 * Se não der para entender o número, devolve o que foi digitado.
 */
export function formatPhoneBR(v: unknown): string {
    let d = normalizePhone(v)
    if (!d) return ''
    if (d.length === 8 || d.length === 9) d = '41' + d
    if (d.length === 10 && '6789'.includes(d[2])) d = d.slice(0, 2) + '9' + d.slice(2)
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return String(v ?? '').trim()
}

/** Chave para achar o mesmo telefone com ou sem DDD/9: últimos 8 dígitos. */
export const phoneKey = (v: unknown) => {
    const d = normalizePhone(v)
    return d.length >= 8 ? d.slice(-8) : ''
}

export function normalizeCep(v: unknown): string {
    const d = soDigitos(v)
    if (d.length === 7) return '0' + d // Excel come o zero da frente
    return d
}

export function normalizeUf(v: unknown): string {
    return String(v ?? '').trim().toUpperCase().slice(0, 2)
}

export const limpa = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

const COMPLEMENTO_RE = /^(casa|ap|apto|apartamento|bloco|bl|sala|sl|fundos|sobrado|lote|lt|loja|lj|andar|conj|cj|galp[aã]o)\b/i

/**
 * Quebra "Rua X, 123 - Bairro, Cidade - PR, 81820-340" em partes.
 * Só separa por vírgula e por " - " (com espaços), para não quebrar "BR-116" nem CEP.
 */
export function splitAddress(full: string): Partial<ClientRow> {
    let s = limpa(full).replace(/,?\s*Brasil$/i, '')
    const out: Partial<ClientRow> = {}

    const cep = s.match(/\b(\d{2}\.?\d{3})-?(\d{3})\b/)
    if (cep) {
        out.cep = normalizeCep(cep[0])
        s = s.replace(cep[0], '').replace(/\bCEP\b:?/i, '')
    }
    const uf = s.match(/(?:\s-\s|,\s*|\/)([A-Z]{2})\s*[,]?\s*$/)
    if (uf) {
        out.uf = uf[1]
        s = s.slice(0, uf.index)
    }

    const parts = s.split(/\s*,\s*|\s+-\s+/).map(p => p.trim()).filter(Boolean)
    if (parts.length === 0) return out

    let rua = parts.shift()!
    // "Rua X 123" (número colado na rua)
    const numNaRua = rua.match(/^(.*\D)\s+(\d{1,6}[A-Za-z]?)$/)
    if (numNaRua && !/^(br|pr|rod|km)\b/i.test(numNaRua[1].trim().split(' ').pop() || '')) {
        rua = numNaRua[1].trim()
        out.numero = numNaRua[2]
    }
    out.logradouro = rua

    if (!out.numero && parts[0] && /^(\d{1,6}[A-Za-z]?|s\/?n)$/i.test(parts[0])) {
        out.numero = parts.shift()!
    } else if (!out.numero && parts[0]) {
        // "194 Rio Pequeno" -> nº 194 + bairro | "341 casa 3" -> nº 341 + complemento
        const m = parts[0].match(/^(\d{1,6})\s+(.+)$/)
        if (m) {
            parts.shift()
            out.numero = m[1]
            if (COMPLEMENTO_RE.test(m[2])) out.complemento = m[2].trim()
            else parts.unshift(m[2].trim())
        }
    }
    if (parts[0] && !out.complemento && COMPLEMENTO_RE.test(parts[0])) out.complemento = parts.shift()
    // O que sobrar: [complemento?] bairro, cidade
    if (parts.length >= 3) out.complemento = parts.shift()
    if (parts.length >= 2) { out.bairro = parts[0]; out.cidade = parts[1] }
    else if (parts.length === 1) out.bairro = parts[0]
    return out
}

/** Chaves para achar o mesmo cliente: telefone (8 últimos dígitos), documento, nome+rua+número. */
export function duplicateKeys(c: Partial<ClientRow> & { nome?: string }): string[] {
    const keys: string[] = []
    const fone = normalizePhone(c.whatsapp)
    if (fone.length >= 8) keys.push('f:' + fone.slice(-8)) // com ou sem DDD
    const doc = soDigitos(c.cpf_cnpj)
    if (doc.length === 11 || doc.length === 14) keys.push('d:' + doc)
    const nome = semAcento(c.nome_razao || '').replace(/[^a-z0-9]/g, '')
    const rua = semAcento(c.logradouro || '').replace(/^(rua|r|avenida|av|travessa|tv|alameda|al)\.?\s+/, '').replace(/[^a-z0-9]/g, '')
    const num = soDigitos(c.numero)
    if (nome && rua && num) keys.push(`e:${nome}|${rua}|${num}`)
    return keys
}

function styleHeader(XLSX: XLSXLib, ws: Record<string, any>, ncols: number, cor = '0F766E') {
    for (let i = 0; i < ncols; i++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })]
        if (cell) cell.s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: cor } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        }
    }
}

/** Gera e baixa o arquivo modelo_clientes_flowdrain.xlsx */
export async function downloadClientTemplate() {
    const XLSX = (await import('xlsx-js-style')).default
    const headers = TEMPLATE_COLUMNS.map(c => c.header)

    // Aba 1: Clientes (vazia, com 500 linhas já formatadas como TEXTO para não perder zeros)
    const ws = XLSX.utils.aoa_to_sheet([headers])
    for (let r = 1; r <= 500; r++) {
        for (let c = 0; c < headers.length; c++) {
            ws[XLSX.utils.encode_cell({ r, c })] = { t: 's', v: '', z: '@' }
        }
    }
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 500, c: headers.length - 1 } })
    ws['!cols'] = TEMPLATE_COLUMNS.map(c => ({ wch: c.width }))
    ws['!rows'] = [{ hpt: 30 }]
    styleHeader(XLSX, ws, headers.length)

    // Aba 2: Como preencher
    const instr: (string)[][] = [
        ['COMO PREENCHER A PLANILHA DE CLIENTES DO FLOWDRAIN', ''],
        ['', ''],
        ['Regras de ouro', ''],
        ['1', 'Um cliente por linha. Não junte dois clientes na mesma linha.'],
        ['2', 'Não mude, não apague e não troque a ordem da primeira linha (os títulos das colunas).'],
        ['3', 'Só o Nome é obrigatório. O resto pode ficar vazio.'],
        ['4', 'Rua e Número em colunas separadas: "Rua Primeiro de Maio" na Rua e "1515" no Número.'],
        ['5', 'Telefone com DDD. Um número só por cliente.'],
        ['6', 'Não deixe linhas de título, total ou observação no meio dos clientes.'],
        ['7', 'Pode subir a mesma planilha de novo: quem já está no FlowDrain NÃO é duplicado.'],
        ['8', 'Salve como Excel (.xlsx). Se for pelo Google Planilhas: Arquivo > Fazer download > Microsoft Excel.'],
        ['', ''],
        ['Colunas', 'O que colocar'],
        ...TEMPLATE_COLUMNS.map(c => [c.header, c.ajuda]),
        ['', ''],
        ['Como o FlowDrain reconhece cliente repetido', ''],
        ['•', 'Mesmo telefone (compara os 8 últimos números), OU'],
        ['•', 'Mesmo CPF/CNPJ, OU'],
        ['•', 'Mesmo nome + mesma rua + mesmo número.'],
        ['', 'Quando o cliente já existe, o FlowDrain só completa os campos que estão vazios no cadastro dele. Nada que já está preenchido é apagado.'],
    ]
    const wsI = XLSX.utils.aoa_to_sheet(instr)
    wsI['!cols'] = [{ wch: 28 }, { wch: 95 }]
    const titulo = wsI['A1']; if (titulo) titulo.s = { font: { bold: true, sz: 14, color: { rgb: '0F766E' } } }
    for (const addr of ['A3', 'A13', 'B13', `A${14 + TEMPLATE_COLUMNS.length + 1}`]) {
        const cell = wsI[addr]; if (cell) cell.s = { font: { bold: true } }
    }

    // Aba 3: Exemplo (só para olhar; o FlowDrain lê apenas a aba Clientes)
    const exemplos = [
        headers,
        TEMPLATE_COLUMNS.map(c => c.exemplo),
        ['Condomínio Solar', '(41) 3333-4444', '12.345.678/0001-90', '', '80420-090', 'Avenida do Batel', '1230', '', 'Batel', 'Curitiba', 'PR', 'Falar com o síndico'],
        ['João', '41988887777', '', '', '', 'Rua das Flores', 'S/N', 'Casa 2', 'Centro', 'São José dos Pinhais', 'PR', ''],
    ]
    const wsE = XLSX.utils.aoa_to_sheet(exemplos)
    wsE['!cols'] = TEMPLATE_COLUMNS.map(c => ({ wch: c.width }))
    styleHeader(XLSX, wsE, headers.length, '64748B')

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.utils.book_append_sheet(wb, wsI, 'Como preencher')
    XLSX.utils.book_append_sheet(wb, wsE, 'Exemplo')
    XLSX.writeFile(wb, 'modelo_clientes_flowdrain.xlsx')
}

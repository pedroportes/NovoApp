import { useState, useRef, useMemo } from 'react'
import XLSX from 'xlsx-js-style'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, AlertCircle, Upload, FileSpreadsheet, Download, Loader2, Copy, UserPlus, UserCheck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useBrand } from '@/contexts/BrandContext'
import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import {
    ClientField, ClientRow, FIELD_LABELS, detectField, looksLikeHeader, downloadClientTemplate,
    normalizePhone, formatPhoneBR, normalizeCep, normalizeUf, limpa, soDigitos, splitAddress, duplicateKeys, semAcento,
} from '@/lib/clientSpreadsheet'

type Situacao = 'novo' | 'completar' | 'igual' | 'repetido' | 'erro'

interface Existente extends Partial<ClientRow> { id: string }

interface LinhaAnalisada {
    linha: number            // número da linha na planilha (para o usuário achar)
    dados: ClientRow
    situacao: Situacao
    avisos: string[]
    existente?: Existente
    completar?: Partial<ClientRow>
    repeteLinha?: number
}

const CAMPOS: (keyof ClientRow)[] = ['nome_razao', 'whatsapp', 'cpf_cnpj', 'email', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'referencia']
const OPCOES_COLUNA: ClientField[] = ['nome_razao', 'whatsapp', 'cpf_cnpj', 'email', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'referencia', 'endereco_completo']

const vazio = (v: unknown) => v === null || v === undefined || String(v).trim() === ''

export function ClientImport() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const { brands, selectedBrandId } = useBrand()
    const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload')
    const [rawText, setRawText] = useState('')
    const [nomeArquivo, setNomeArquivo] = useState('')
    const [header, setHeader] = useState<string[]>([])
    const [rows, setRows] = useState<string[][]>([])
    const [firstDataLine, setFirstDataLine] = useState(2)
    const [columnMapping, setColumnMapping] = useState<Record<number, ClientField | ''>>({})
    const [marcaId, setMarcaId] = useState<string>(selectedBrandId && selectedBrandId !== 'all' ? selectedBrandId : '')
    const [analisando, setAnalisando] = useState(false)
    const [analise, setAnalise] = useState<LinhaAnalisada[]>([])
    const [completarExistentes, setCompletarExistentes] = useState(true)
    const [filtro, setFiltro] = useState<Situacao | 'todos'>('todos')
    const [importing, setImporting] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [resultado, setResultado] = useState({ criados: 0, completados: 0, pulados: 0, erros: 0 })
    const fileInputRef = useRef<HTMLInputElement>(null)

    const empresaId = userData?.empresa_id

    // ---------- 1. Ler arquivo ou texto ----------
    const carregarTabela = (tabela: unknown[][]) => {
        const linhas = tabela
            .map(r => (r || []).map(c => (c === null || c === undefined ? '' : String(c).trim())))
        // acha a linha de títulos nas 10 primeiras
        let hIdx = linhas.slice(0, 10).findIndex(r => looksLikeHeader(r))
        let cab: string[]
        let dados: string[][]
        if (hIdx >= 0) {
            cab = linhas[hIdx]
            dados = linhas.slice(hIdx + 1)
        } else {
            hIdx = -1
            const n = Math.max(...linhas.map(r => r.length))
            cab = Array.from({ length: n }, (_, i) => `Coluna ${i + 1}`)
            dados = linhas
        }
        dados = dados.filter(r => r.some(c => c !== ''))
        if (dados.length === 0) {
            toast.error('Não encontrei nenhum cliente na planilha.')
            return
        }
        const mapa: Record<number, ClientField | ''> = {}
        const usados = new Set<string>()
        cab.forEach((h, i) => {
            const f = hIdx >= 0 ? detectField(h) : ''
            if (f && !usados.has(f)) { mapa[i] = f; usados.add(f) } else mapa[i] = ''
        })
        setHeader(cab)
        setRows(dados)
        setFirstDataLine(hIdx + 2)
        setColumnMapping(mapa)
        setStep('map')
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const data = await file.arrayBuffer()
            const wb = XLSX.read(data, { type: 'array', raw: false })
            // Usa a aba "Clientes" do modelo; se não tiver, a primeira
            const nomeAba = wb.SheetNames.find(n => semAcento(n) === 'clientes') || wb.SheetNames[0]
            const tabela = XLSX.utils.sheet_to_json(wb.Sheets[nomeAba], { header: 1, raw: false, defval: '' }) as unknown[][]
            setNomeArquivo(file.name)
            carregarTabela(tabela)
        } catch (error) {
            console.error('Erro ao ler arquivo:', error)
            toast.error('Não consegui abrir esse arquivo. Salve como Excel (.xlsx) e tente de novo.')
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleParseText = () => {
        const linhas = rawText.trim().split(/\r?\n/).filter(l => l.trim())
        if (linhas.length === 0) return
        const sep = linhas[0].includes('\t') ? '\t' : linhas[0].includes(';') ? ';' : ','
        setNomeArquivo('texto colado')
        carregarTabela(linhas.map(l => l.split(sep)))
    }

    const nomeMapeado = Object.values(columnMapping).includes('nome_razao')

    // ---------- 2. Montar os dados e comparar com o que já existe ----------
    const montarLinha = (r: string[]): ClientRow => {
        const d: ClientRow = { nome_razao: '', whatsapp: '', cpf_cnpj: '', email: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', referencia: '' }
        let enderecoCompleto = ''
        Object.entries(columnMapping).forEach(([idx, field]) => {
            if (!field) return
            const v = limpa(r[Number(idx)])
            if (!v) return
            if (field === 'endereco_completo') enderecoCompleto = v
            else d[field] = v
        })
        if (enderecoCompleto) {
            const partes = splitAddress(enderecoCompleto)
            for (const k of Object.keys(partes) as (keyof ClientRow)[]) {
                if (vazio(d[k]) && partes[k]) d[k] = partes[k]!
            }
        }
        const fone = normalizePhone(d.whatsapp)
        d.whatsapp = fone ? formatPhoneBR(fone) : ''
        const doc = soDigitos(d.cpf_cnpj)
        d.cpf_cnpj = doc
        d.cep = normalizeCep(d.cep)
        d.uf = normalizeUf(d.uf)
        d.email = d.email.toLowerCase()
        if (/^s\.?\/?n\.?$/i.test(d.numero)) d.numero = 'S/N'
        return d
    }

    const buscarExistentes = async (): Promise<Existente[]> => {
        const todos: Existente[] = []
        const pageSize = 1000
        for (let page = 0; ; page++) {
            const { data, error } = await supabase
                .from('clientes')
                .select('id, nome_razao, whatsapp, telefone, cpf_cnpj, email, cep, logradouro, numero, complemento, bairro, cidade, uf, referencia')
                .eq('empresa_id', empresaId!)
                .range(page * pageSize, (page + 1) * pageSize - 1)
            if (error) throw error
            if (!data || data.length === 0) break
            todos.push(...data.map((c: any) => ({ ...c, whatsapp: c.whatsapp || c.telefone || '' })))
            if (data.length < pageSize) break
        }
        return todos
    }

    const analisar = async () => {
        if (!empresaId) return
        setAnalisando(true)
        try {
            let existentes: Existente[]
            try {
                existentes = await buscarExistentes()
            } catch {
                // sem internet: compara com os clientes guardados no aparelho
                existentes = (await db.clientes.where('empresa_id').equals(empresaId).toArray()) as any
                toast.warning('Sem conexão: comparei com os clientes guardados neste aparelho.')
            }
            const indice = new Map<string, Existente>()
            for (const c of existentes) for (const k of duplicateKeys(c)) if (!indice.has(k)) indice.set(k, c)

            const vistos = new Map<string, number>()
            const res: LinhaAnalisada[] = rows.map((r, i) => {
                const linha = firstDataLine + i
                const dados = montarLinha(r)
                const avisos: string[] = []
                if (!dados.nome_razao) return { linha, dados, situacao: 'erro', avisos: ['Sem nome'] }
                if (looksLikeHeader(r)) return { linha, dados, situacao: 'erro', avisos: ['Parece uma linha de títulos'] }

                const fone = soDigitos(dados.whatsapp)
                if (fone && fone.length < 10) avisos.push('Telefone sem DDD ou incompleto')
                if (dados.cpf_cnpj && dados.cpf_cnpj.length !== 11 && dados.cpf_cnpj.length !== 14) avisos.push('CPF/CNPJ com tamanho errado')
                if (dados.cep && dados.cep.length !== 8) avisos.push('CEP inválido')
                if (/\d{2,}\s*$/.test(dados.logradouro) && !dados.numero) avisos.push('O número parece estar junto da rua')

                const chaves = duplicateKeys(dados)
                const repetida = chaves.map(k => vistos.get(k)).find(v => v !== undefined)
                if (repetida !== undefined) return { linha, dados, situacao: 'repetido', avisos, repeteLinha: repetida }
                chaves.forEach(k => vistos.set(k, linha))

                const existente = chaves.map(k => indice.get(k)).find(Boolean)
                if (existente) {
                    const completar: Partial<ClientRow> = {}
                    for (const campo of CAMPOS) {
                        if (campo === 'nome_razao') continue
                        if (vazio(existente[campo]) && !vazio(dados[campo])) completar[campo] = dados[campo]
                    }
                    return { linha, dados, avisos, existente, completar, situacao: Object.keys(completar).length ? 'completar' : 'igual' }
                }
                return { linha, dados, situacao: 'novo', avisos }
            })
            setAnalise(res)
            setFiltro('todos')
            setStep('preview')
        } catch (e: any) {
            console.error(e)
            toast.error('Erro ao comparar com os clientes cadastrados: ' + (e?.message || e))
        } finally {
            setAnalisando(false)
        }
    }

    const contagem = useMemo(() => {
        const c: Record<Situacao, number> = { novo: 0, completar: 0, igual: 0, repetido: 0, erro: 0 }
        analise.forEach(a => c[a.situacao]++)
        return c
    }, [analise])

    // ---------- 3. Gravar ----------
    const handleImport = async () => {
        if (!empresaId) return
        const novos = analise.filter(a => a.situacao === 'novo')
        const completar = completarExistentes ? analise.filter(a => a.situacao === 'completar') : []
        const total = novos.length + completar.length
        if (total === 0) { toast.info('Nada para importar: todos os clientes já estão cadastrados.'); return }

        setImporting(true)
        setProgress({ current: 0, total })
        let criados = 0, completados = 0, erros = 0
        const agora = new Date().toISOString()
        try {
            // Novos: em lotes de 200
            for (let i = 0; i < novos.length; i += 200) {
                const lote = novos.slice(i, i + 200).map(a => {
                    const registro: any = {
                        id: crypto.randomUUID(),
                        empresa_id: empresaId,
                        marca_id: marcaId || null,
                        ativo: true,
                        criado_por: (userData as any)?.id ?? null,
                    }
                    for (const campo of CAMPOS) registro[campo] = a.dados[campo] || null
                    return registro
                })
                const { error } = await supabase.from('clientes').insert(lote)
                if (error) {
                    console.error('[Importação] erro no lote', error)
                    erros += lote.length
                } else {
                    criados += lote.length
                    await db.clientes.bulkPut(lote.map(c => ({ ...c, synced: 1, created_at: agora, updated_at: agora })))
                }
                setProgress(p => ({ ...p, current: Math.min(p.total, p.current + lote.length) }))
            }

            // Existentes: só preenche o que está vazio no cadastro
            for (let i = 0; i < completar.length; i += 10) {
                const grupo = completar.slice(i, i + 10)
                await Promise.all(grupo.map(async a => {
                    const { error } = await supabase.from('clientes')
                        .update(a.completar!)
                        .eq('id', a.existente!.id)
                        .eq('empresa_id', empresaId)
                    if (error) { erros++; console.error('[Importação] erro ao completar', error); return }
                    completados++
                    await db.clientes.update(a.existente!.id, { ...a.completar, updated_at: agora } as any).catch(() => { })
                }))
                setProgress(p => ({ ...p, current: Math.min(p.total, p.current + grupo.length) }))
            }

            const pulados = analise.length - novos.length - completar.length
            setResultado({ criados, completados, pulados, erros })
            setStep('done')
            if (erros) toast.error(`${erros} clientes não foram gravados. Veja o resumo.`)
            else toast.success('Importação concluída!')
        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao importar: ' + (error?.message || error))
        } finally {
            setImporting(false)
        }
    }

    const listaFiltrada = filtro === 'todos' ? analise : analise.filter(a => a.situacao === filtro)

    const SITUACAO_INFO: Record<Situacao, { label: string; cor: string; icone: any }> = {
        novo: { label: 'Novo', cor: 'bg-emerald-50 text-emerald-700 border-emerald-200', icone: UserPlus },
        completar: { label: 'Já existe: vai completar', cor: 'bg-blue-50 text-blue-700 border-blue-200', icone: UserCheck },
        igual: { label: 'Já existe: nada muda', cor: 'bg-slate-50 text-slate-600 border-slate-200', icone: Check },
        repetido: { label: 'Repetido na planilha', cor: 'bg-amber-50 text-amber-700 border-amber-200', icone: Copy },
        erro: { label: 'Não entra', cor: 'bg-red-50 text-red-700 border-red-200', icone: XCircle },
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate('/clients')}>
                        <ArrowLeft className="h-3 w-3 mr-1" /> Voltar
                    </Button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Importar clientes</h1>
                        <p className="text-slate-500 text-sm">Quem já está cadastrado não é duplicado.</p>
                    </div>
                </div>

                {/* Passo 1 */}
                {step === 'upload' && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-5">
                        <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <FileSpreadsheet className="h-6 w-6 text-teal-700 shrink-0" />
                                <div className="text-sm text-teal-900">
                                    <p className="font-bold">1. Baixe a planilha modelo</p>
                                    <p>Preencha um cliente por linha, com a rua e o número em colunas separadas. A aba "Como preencher" explica tudo.</p>
                                </div>
                            </div>
                            <Button className="w-full h-10 bg-teal-700 hover:bg-teal-800 text-white" onClick={downloadClientTemplate}>
                                <Download className="h-4 w-4 mr-2" /> Baixar planilha modelo
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <p className="font-bold text-sm text-slate-700">2. Envie a planilha preenchida</p>
                            <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv,.ods" className="hidden" onChange={handleFileUpload} />
                            <Button className="w-full h-12 border border-dashed border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-4 w-4 mr-2" /> Escolher arquivo (.xlsx ou .csv)
                            </Button>
                        </div>

                        <details className="text-sm">
                            <summary className="cursor-pointer text-slate-500">Ou colar direto da planilha</summary>
                            <textarea
                                className="w-full h-40 mt-2 p-3 border rounded-lg font-mono text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Copie as linhas da planilha (com os títulos) e cole aqui"
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                            />
                            <Button className="w-full h-9 mt-2" onClick={handleParseText} disabled={!rawText.trim()}>Continuar</Button>
                        </details>
                    </div>
                )}

                {/* Passo 2: colunas */}
                {step === 'map' && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-5">
                        <div className="flex justify-between items-center gap-2">
                            <div>
                                <h2 className="font-bold text-lg">Confira as colunas</h2>
                                <p className="text-xs text-slate-500">{nomeArquivo} · {rows.length} linhas</p>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setStep('upload')}>Trocar arquivo</Button>
                        </div>

                        <div className="space-y-2">
                            {header.map((h, i) => (
                                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.4fr] gap-2 items-center p-2 rounded-lg border border-slate-100">
                                    <div className="text-sm font-medium text-slate-700 truncate">{h || `Coluna ${i + 1}`}</div>
                                    <select
                                        className={`w-full p-2 rounded border text-sm ${columnMapping[i] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300'}`}
                                        value={columnMapping[i] || ''}
                                        onChange={e => setColumnMapping(prev => ({ ...prev, [i]: e.target.value as ClientField | '' }))}
                                    >
                                        <option value="">Não importar</option>
                                        {OPCOES_COLUNA.map(f => (
                                            <option key={f} value={f} disabled={Object.entries(columnMapping).some(([k, v]) => v === f && Number(k) !== i)}>
                                                {FIELD_LABELS[f]}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="text-xs text-slate-400 truncate">
                                        ex.: {rows.slice(0, 2).map(r => r[i]).filter(Boolean).join(' · ') || '(vazio)'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700">Estes clientes são de qual empresa?</label>
                            <select className="w-full p-2 rounded border border-slate-300 text-sm" value={marcaId} onChange={e => setMarcaId(e.target.value)}>
                                <option value="">Nenhuma em especial (aparece em todas)</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                            </select>
                        </div>

                        {!nomeMapeado && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
                                <AlertCircle className="h-4 w-4" /> Escolha qual coluna é o <strong>Nome</strong>.
                            </div>
                        )}

                        <Button className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!nomeMapeado || analisando} onClick={analisar}>
                            {analisando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Comparando com seus clientes...</> : 'Conferir antes de importar'}
                        </Button>
                    </div>
                )}

                {/* Passo 3: conferência */}
                {step === 'preview' && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-5">
                        <div className="flex justify-between items-center gap-2">
                            <h2 className="font-bold text-lg">Conferência</h2>
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setStep('map')}>Voltar</Button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {(Object.keys(SITUACAO_INFO) as Situacao[]).map(s => {
                                const Info = SITUACAO_INFO[s]
                                return (
                                    <button key={s} onClick={() => setFiltro(filtro === s ? 'todos' : s)}
                                        className={`p-3 rounded-xl border text-left ${Info.cor} ${filtro === s ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}>
                                        <div className="text-2xl font-bold">{contagem[s]}</div>
                                        <div className="text-[11px] leading-tight">{Info.label}</div>
                                    </button>
                                )
                            })}
                        </div>

                        {contagem.completar > 0 && (
                            <label className="flex items-start gap-2 text-sm p-3 rounded-lg bg-blue-50 text-blue-900">
                                <input type="checkbox" className="mt-1" checked={completarExistentes} onChange={e => setCompletarExistentes(e.target.checked)} />
                                <span>Completar os clientes que já existem com os dados que estão faltando no cadastro (nada que já está preenchido é trocado).</span>
                            </label>
                        )}

                        <div className="max-h-[50vh] overflow-y-auto divide-y border rounded-xl">
                            {listaFiltrada.slice(0, 500).map(a => {
                                const Info = SITUACAO_INFO[a.situacao]
                                const Icone = Info.icone
                                const end = [a.dados.logradouro, a.dados.numero, a.dados.bairro, a.dados.cidade].filter(Boolean).join(', ')
                                return (
                                    <div key={a.linha} className="p-3 text-sm flex gap-3">
                                        <span className="text-[10px] text-slate-400 w-10 shrink-0 pt-0.5">linha {a.linha}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-medium text-slate-800">{a.dados.nome_razao || '(sem nome)'}</span>
                                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${Info.cor}`}>
                                                    <Icone className="h-3 w-3" /> {Info.label}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 truncate">{[a.dados.whatsapp, end].filter(Boolean).join(' · ')}</div>
                                            {a.existente && (
                                                <div className="text-xs text-blue-700">
                                                    Cadastrado como: {a.existente.nome_razao}
                                                    {a.completar && Object.keys(a.completar).length > 0 && <> · vai preencher: {Object.keys(a.completar).map(k => FIELD_LABELS[k as ClientField]).join(', ')}</>}
                                                </div>
                                            )}
                                            {a.repeteLinha && <div className="text-xs text-amber-700">Mesmo cliente da linha {a.repeteLinha}</div>}
                                            {a.avisos.length > 0 && <div className="text-xs text-orange-600">⚠ {a.avisos.join(' · ')}</div>}
                                        </div>
                                    </div>
                                )
                            })}
                            {listaFiltrada.length > 500 && <div className="p-3 text-xs text-slate-400">Mostrando 500 de {listaFiltrada.length}.</div>}
                            {listaFiltrada.length === 0 && <div className="p-3 text-xs text-slate-400">Nada aqui.</div>}
                        </div>

                        <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={importing} onClick={handleImport}>
                            {importing
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gravando {progress.current}/{progress.total}...</>
                                : `Importar ${contagem.novo} ${contagem.novo === 1 ? 'novo' : 'novos'}${completarExistentes && contagem.completar ? ` e completar ${contagem.completar}` : ''}`}
                        </Button>
                    </div>
                )}

                {/* Passo 4: resultado */}
                {step === 'done' && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4 text-center">
                        <Check className="h-12 w-12 mx-auto text-emerald-600" />
                        <h2 className="font-bold text-xl">Importação concluída</h2>
                        <div className="text-sm text-slate-600 space-y-1">
                            <p><strong>{resultado.criados}</strong> clientes novos cadastrados</p>
                            <p><strong>{resultado.completados}</strong> clientes existentes completados</p>
                            <p><strong>{resultado.pulados}</strong> linhas puladas (já existiam, repetidas ou sem nome)</p>
                            {resultado.erros > 0 && <p className="text-red-600"><strong>{resultado.erros}</strong> não foram gravados (tente de novo; os que entraram não duplicam)</p>}
                        </div>
                        <Button className="w-full h-10" onClick={() => navigate('/clients')}>Ver clientes</Button>
                    </div>
                )}
            </div>
        </div>
    )
}

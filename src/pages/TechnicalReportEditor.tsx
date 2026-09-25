import { useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
    ArrowLeft, Save, Sparkles, Eye, Pencil, FileCheck2, Mic, MicOff, ImagePlus, Trash2, Loader2, Printer, Unlock, AlertTriangle, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useBrand } from '@/contexts/BrandContext'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { technicalReportService } from '@/services/technicalReportService'
import { TechnicalReportDocument } from '@/components/technical-report/TechnicalReportDocument'
import {
    DadosRelatorio, EmpresaSnapshot, OPCOES, RelatorioTecnico, relatorioVazio, numeroFormatado, MomentoFoto
} from '@/types/technicalReport'

type CampoIA = 'relato_cliente' | 'constatacoes' | 'verificacao' | 'recomendacoes_outras' | 'limitacoes' | 'legendas'
const NOMES_CAMPOS_IA: Record<CampoIA, string> = {
    relato_cliente: 'Motivo do chamado',
    constatacoes: 'Constatações técnicas',
    verificacao: 'Verificação realizada',
    recomendacoes_outras: 'Outras recomendações',
    limitacoes: 'Limitações e observações',
    legendas: 'Legendas das fotos'
}

// ---------- componentes de formulário ----------

function Secao({ numero, titulo, children, dica }: { numero: number, titulo: string, children: ReactNode, dica?: string }) {
    return (
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div>
                <h2 className="flex items-center gap-2.5 font-extrabold text-slate-800 text-sm uppercase tracking-wide">
                    <span className="w-6 h-6 rounded-md bg-[#0f2a47] text-white text-xs flex items-center justify-center">{numero}</span>
                    {titulo}
                </h2>
                {dica ? <p className="text-xs text-slate-400 mt-1 ml-8.5">{dica}</p> : null}
            </div>
            {children}
        </section>
    )
}

function Rotulo({ children, ia }: { children: ReactNode, ia?: boolean }) {
    return (
        <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{children}</span>
            {ia ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    <Sparkles className="h-3 w-3" /> Sugerido pela IA · revise
                </span>
            ) : null}
        </div>
    )
}

function Entrada({ rotulo, valor, onChange, tipo = 'text', placeholder, desabilitado, className }: {
    rotulo: string, valor: string, onChange: (v: string) => void, tipo?: string, placeholder?: string, desabilitado?: boolean, className?: string
}) {
    return (
        <label className={cn('block', className)}>
            <Rotulo>{rotulo}</Rotulo>
            <input
                type={tipo}
                value={valor}
                placeholder={placeholder}
                disabled={desabilitado}
                onChange={e => onChange(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:bg-white disabled:opacity-70"
            />
        </label>
    )
}

function AreaTexto({ rotulo, valor, onChange, placeholder, ia, desabilitado, linhas = 4, ditado }: {
    rotulo: string, valor: string, onChange: (v: string) => void, placeholder?: string, ia?: boolean, desabilitado?: boolean, linhas?: number, ditado?: boolean
}) {
    const valorRef = useRef(valor)
    valorRef.current = valor
    const { isListening, startListening, stopListening } = useVoiceRecognition({
        onResult: (t: string) => onChange(valorRef.current ? `${valorRef.current.trimEnd()} ${t}` : t)
    })
    return (
        <div>
            <Rotulo ia={ia}>{rotulo}</Rotulo>
            <div className="relative">
                <textarea
                    value={valor}
                    rows={linhas}
                    placeholder={placeholder}
                    disabled={desabilitado}
                    onChange={e => onChange(e.target.value)}
                    className={cn(
                        'w-full px-3 py-2.5 rounded-xl border bg-slate-50 text-sm text-slate-800 outline-none focus:bg-white resize-y disabled:opacity-70',
                        ia ? 'border-amber-300 focus:border-amber-400' : 'border-slate-200 focus:border-emerald-400',
                        ditado ? 'pr-12' : ''
                    )}
                />
                {ditado && !desabilitado ? (
                    <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        title={isListening ? 'Parar ditado' : 'Ditar por voz'}
                        className={cn('absolute right-2 top-2 w-8 h-8 rounded-lg flex items-center justify-center',
                            isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white border border-slate-200 text-slate-500 hover:text-emerald-600')}
                    >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                ) : null}
            </div>
        </div>
    )
}

function Opcoes({ rotulo, opcoes, marcados, onChange, unica, desabilitado }: {
    rotulo: string, opcoes: string[], marcados: string[], onChange: (v: string[]) => void, unica?: boolean, desabilitado?: boolean
}) {
    const alternar = (o: string) => {
        if (desabilitado) return
        if (unica) onChange(marcados[0] === o ? [] : [o])
        else onChange(marcados.includes(o) ? marcados.filter(m => m !== o) : [...marcados, o])
    }
    return (
        <div>
            <Rotulo>{rotulo}</Rotulo>
            <div className="flex flex-wrap gap-2">
                {opcoes.map(o => {
                    const ativo = marcados.includes(o)
                    return (
                        <button
                            key={o}
                            type="button"
                            onClick={() => alternar(o)}
                            className={cn('inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors',
                                ativo ? 'bg-[#0f2a47] border-[#0f2a47] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400',
                                desabilitado && 'cursor-default')}
                        >
                            {ativo ? <Check className="h-3.5 w-3.5" /> : null}{o}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ---------- página ----------

export function TechnicalReportEditor() {
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { userData } = useAuth()
    const { brands } = useBrand()

    const osId = searchParams.get('os')
    const [relatorio, setRelatorio] = useState<RelatorioTecnico | null>(null)
    const [dados, setDados] = useState<DadosRelatorio>(relatorioVazio())
    const [marcaId, setMarcaId] = useState<string | null>(null)
    const [ordemId, setOrdemId] = useState<string | null>(osId)
    const [empresa, setEmpresa] = useState<EmpresaSnapshot | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [salvando, setSalvando] = useState(false)
    const [gerandoIA, setGerandoIA] = useState(false)
    const [enviandoFoto, setEnviandoFoto] = useState(false)
    const [alterado, setAlterado] = useState(false)
    const [aba, setAba] = useState<'preencher' | 'visualizar'>('preencher')
    const [tabelaFaltando, setTabelaFaltando] = useState(false)

    const emitido = relatorio?.status === 'emitido'
    const isAdmin = (userData?.cargo || '').toLowerCase() !== 'tecnico'
    const camposIA = new Set(dados.ia?.campos || [])

    // Carrega relatório existente, ou monta rascunho a partir da OS
    useEffect(() => {
        if (!userData?.empresa_id) return
        let ativo = true
        const carregar = async () => {
            setCarregando(true)
            try {
                if (id && id !== 'novo') {
                    const r = await technicalReportService.buscar(id)
                    if (!r) { toast.error('Relatório não encontrado.'); navigate('/service-orders'); return }
                    if (!ativo) return
                    setRelatorio(r); setDados({ ...relatorioVazio(), ...r.dados }); setMarcaId(r.marca_id); setOrdemId(r.ordem_servico_id)
                } else if (osId) {
                    // Já existe relatório desta OS? Abre ele em vez de criar outro
                    try {
                        const existente = await technicalReportService.buscarPorOS(osId)
                        if (existente) { navigate(`/relatorio-tecnico/${existente.id}`, { replace: true }); return }
                    } catch (err: any) {
                        if (String(err?.message || err?.code).match(/relatorios_tecnicos|42P01|PGRST205/)) setTabelaFaltando(true)
                        else throw err
                    }
                    const { dados: rascunho, marcaId: m } = await technicalReportService.montarRascunhoDaOS(osId)
                    if (!ativo) return
                    setDados(rascunho); setMarcaId(m); setAlterado(true)
                }
            } catch (err: any) {
                console.error(err)
                toast.error('Erro ao carregar o relatório: ' + (err?.message || ''))
            } finally {
                if (ativo) setCarregando(false)
            }
        }
        carregar()
        return () => { ativo = false }
    }, [id, osId, userData?.empresa_id])

    // Dados da empresa/marca para o cabeçalho (o emitido usa o que foi congelado)
    useEffect(() => {
        if (!userData?.empresa_id || dados.empresa) return
        technicalReportService.buscarEmpresa(marcaId, userData.empresa_id).then(setEmpresa).catch(() => setEmpresa(null))
    }, [marcaId, userData?.empresa_id, dados.empresa])

    // Aviso ao sair com alterações não salvas
    useEffect(() => {
        const aviso = (e: BeforeUnloadEvent) => { if (alterado) { e.preventDefault(); e.returnValue = '' } }
        window.addEventListener('beforeunload', aviso)
        return () => window.removeEventListener('beforeunload', aviso)
    }, [alterado])

    // Atualiza um trecho dos dados; se o usuário mexe num texto da IA, ele passa a contar como revisado
    const atualizar = <K extends keyof DadosRelatorio>(chave: K, valor: Partial<DadosRelatorio[K]>, revisou?: CampoIA) => {
        if (emitido) return
        setDados(prev => {
            const atual = prev[chave]
            const novo = (typeof atual === 'object' && atual !== null && !Array.isArray(atual)) ? { ...atual, ...valor } : valor
            let ia = prev.ia
            if (revisou && ia?.campos.includes(revisou)) ia = { ...ia, campos: ia.campos.filter(c => c !== revisou) }
            return { ...prev, [chave]: novo, ia }
        })
        setAlterado(true)
    }
    const atualizarTexto = (chave: 'limitacoes' | 'garantia', valor: string, revisou?: CampoIA) => {
        if (emitido) return
        setDados(prev => {
            let ia = prev.ia
            if (revisou && ia?.campos.includes(revisou)) ia = { ...ia, campos: ia.campos.filter(c => c !== revisou) }
            return { ...prev, [chave]: valor, ia }
        })
        setAlterado(true)
    }

    const salvar = async (silencioso = false): Promise<RelatorioTecnico | null> => {
        if (!userData?.empresa_id) return null
        setSalvando(true)
        try {
            let r: RelatorioTecnico
            if (relatorio) r = await technicalReportService.salvar(relatorio.id, dados, marcaId)
            else {
                r = await technicalReportService.criar({ empresaId: userData.empresa_id, marcaId, osId: ordemId, dados })
                navigate(`/relatorio-tecnico/${r.id}`, { replace: true })
            }
            setRelatorio(r); setAlterado(false)
            if (!silencioso) toast.success(`Relatório ${numeroFormatado(r.numero, r.created_at)} salvo.`)
            return r
        } catch (err: any) {
            console.error(err)
            if (String(err?.message || err?.code).match(/relatorios_tecnicos|42P01|PGRST205/)) {
                setTabelaFaltando(true)
                toast.error('A tabela de relatórios ainda não foi criada no banco. Rode o SQL de instalação.')
            } else toast.error('Erro ao salvar: ' + (err?.message || ''))
            return null
        } finally {
            setSalvando(false)
        }
    }

    const redigirComIA = async () => {
        const temBase = dados.diagnostico.anotacoes_tecnico.trim() || dados.diagnostico.pontos.length || dados.diagnostico.causas.length ||
            dados.servico.metodos.length || dados.resultado.situacao || dados.atendimento.relato_cliente.trim()
        if (!temBase) {
            toast.error('Marque pelo menos o diagnóstico, o serviço ou escreva as anotações antes de pedir à IA.')
            return
        }
        const preenchidos = [
            dados.atendimento.relato_cliente, dados.diagnostico.constatacoes, dados.resultado.verificacao,
            dados.recomendacoes.outras, dados.limitacoes
        ].filter(t => t.trim()).length
        const sobrescrever = preenchidos > 0 && confirm(
            'Alguns textos já estão preenchidos.\n\nOK = a IA reescreve todos os textos\nCancelar = a IA preenche só os que estão vazios'
        )

        setGerandoIA(true)
        try {
            const r = await technicalReportService.gerarTextosIA(dados)
            const usados: CampoIA[] = []
            setDados(prev => {
                const pode = (atual: string) => sobrescrever || !atual.trim()
                const novo = { ...prev }
                if (r.relato_cliente && pode(prev.atendimento.relato_cliente)) { novo.atendimento = { ...prev.atendimento, relato_cliente: r.relato_cliente }; usados.push('relato_cliente') }
                if (r.constatacoes && pode(prev.diagnostico.constatacoes)) { novo.diagnostico = { ...prev.diagnostico, constatacoes: r.constatacoes }; usados.push('constatacoes') }
                if (r.verificacao && pode(prev.resultado.verificacao)) { novo.resultado = { ...prev.resultado, verificacao: r.verificacao }; usados.push('verificacao') }
                if (r.recomendacoes_outras && pode(prev.recomendacoes.outras)) { novo.recomendacoes = { ...prev.recomendacoes, outras: r.recomendacoes_outras }; usados.push('recomendacoes_outras') }
                if (r.limitacoes && pode(prev.limitacoes)) { novo.limitacoes = r.limitacoes; usados.push('limitacoes') }
                if (r.legendas?.length) {
                    let mudou = false
                    novo.fotos = prev.fotos.map((f, i) => {
                        if (r.legendas[i] && pode(f.legenda)) { mudou = true; return { ...f, legenda: r.legendas[i] } }
                        return f
                    })
                    if (mudou) usados.push('legendas')
                }
                const anteriores = (prev.ia?.campos || []).filter(c => !usados.includes(c as CampoIA))
                novo.ia = { gerado_em: new Date().toISOString(), campos: [...anteriores, ...usados] }
                return novo
            })
            setAlterado(true)
            toast.success('Textos redigidos pela IA. Revise cada um antes de emitir.')
        } catch (err: any) {
            console.error(err)
            const msg = String(err?.message || '')
            if (/Failed to send|not found|404|FunctionsFetchError|FunctionsHttpError/i.test(msg) || err?.name?.startsWith('Functions'))
                toast.error('A função de IA ainda não foi publicada no Supabase (gerar-relatorio-tecnico).')
            else toast.error('Erro ao gerar textos: ' + msg)
        } finally {
            setGerandoIA(false)
        }
    }

    const enviarFotos = async (arquivos: FileList | null) => {
        if (!arquivos?.length || !userData?.empresa_id) return
        setEnviandoFoto(true)
        try {
            const novas = []
            for (const arq of Array.from(arquivos)) {
                if (!arq.type.startsWith('image/')) continue
                const url = await technicalReportService.enviarFoto(arq, userData.empresa_id)
                const momento: MomentoFoto = dados.fotos.length + novas.length === 0 ? 'antes' : 'depois'
                novas.push({ url, legenda: '', momento, data_hora: new Date(arq.lastModified || Date.now()).toISOString() })
            }
            if (novas.length) { atualizarFotos([...dados.fotos, ...novas]); toast.success(`${novas.length} foto(s) adicionada(s).`) }
        } catch (err: any) {
            toast.error('Erro ao enviar foto: ' + (err?.message || ''))
        } finally {
            setEnviandoFoto(false)
        }
    }
    const atualizarFotos = (fotos: DadosRelatorio['fotos'], revisou?: boolean) => {
        if (emitido) return
        setDados(prev => ({
            ...prev, fotos,
            ia: revisou && prev.ia ? { ...prev.ia, campos: prev.ia.campos.filter(c => c !== 'legendas') } : prev.ia
        }))
        setAlterado(true)
    }

    const pendencias = useMemo(() => {
        const p: string[] = []
        if (!dados.cliente.nome.trim()) p.push('Nome do cliente')
        if (!dados.cliente.endereco.trim()) p.push('Endereço do atendimento')
        if (!dados.atendimento.data) p.push('Data do atendimento')
        if (!dados.atendimento.tecnico_nome.trim()) p.push('Técnico responsável')
        if (!dados.diagnostico.pontos.length) p.push('Ponto(s) afetado(s)')
        if (!dados.servico.metodos.length) p.push('Método(s) empregado(s)')
        if (!dados.resultado.situacao) p.push('Situação ao término')
        return p
    }, [dados])

    const emitir = async () => {
        if (!userData?.empresa_id) return
        if (pendencias.length) {
            toast.error('Preencha antes de emitir: ' + pendencias.join(', '))
            return
        }
        const naoRevisados = (dados.ia?.campos || []).map(c => NOMES_CAMPOS_IA[c as CampoIA]).filter(Boolean)
        if (naoRevisados.length && !confirm(
            `Estes textos foram escritos pela IA e ainda não foram editados:\n\n• ${naoRevisados.join('\n• ')}\n\nVocê leu e confirma que estão corretos?`
        )) return
        if (!confirm('Emitir o relatório? Depois de emitido ele fica travado para edição e pode ser enviado ao cliente.')) return

        const base = relatorio && !alterado ? relatorio : await salvar(true)
        if (!base) return
        try {
            const final = { ...dados, ia: dados.ia ? { ...dados.ia, campos: [] } : undefined }
            const r = await technicalReportService.emitir(base.id, final, marcaId, userData.empresa_id)
            setRelatorio(r); setDados({ ...relatorioVazio(), ...r.dados }); setAlterado(false)
            toast.success(`Relatório ${numeroFormatado(r.numero, r.created_at)} emitido.`)
            window.open(`/print/relatorio-tecnico/${r.id}`, '_blank')
        } catch (err: any) {
            toast.error('Erro ao emitir: ' + (err?.message || ''))
        }
    }

    const reabrir = async () => {
        if (!relatorio || !confirm('Reabrir o relatório para edição? Ele volta a ser rascunho e precisará ser emitido de novo.')) return
        try {
            const r = await technicalReportService.reabrir(relatorio.id)
            setRelatorio(r)
            toast.success('Relatório reaberto para edição.')
        } catch (err: any) {
            toast.error('Erro ao reabrir: ' + (err?.message || ''))
        }
    }

    if (carregando) {
        return (
            <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Carregando relatório...
            </div>
        )
    }

    const d = dados
    const bloqueado = emitido

    return (
        <div className="max-w-5xl mx-auto space-y-5 pb-28">
            {/* Cabeçalho */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800">Relatório Técnico de Serviço</h1>
                        <p className="text-xs text-slate-400 font-semibold">
                            {numeroFormatado(relatorio?.numero, relatorio?.created_at)}
                            {emitido ? ' · Emitido' : ' · Rascunho'}
                            {alterado ? ' · alterações não salvas' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex bg-slate-100 rounded-xl p-1">
                    <button onClick={() => setAba('preencher')} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5', aba === 'preencher' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500')}>
                        <Pencil className="h-3.5 w-3.5" /> Preencher
                    </button>
                    <button onClick={() => setAba('visualizar')} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5', aba === 'visualizar' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500')}>
                        <Eye className="h-3.5 w-3.5" /> Pré-visualizar
                    </button>
                </div>
            </div>

            {tabelaFaltando ? (
                <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                        <b>Falta instalar a tabela de relatórios no banco.</b> Rode o arquivo
                        <code className="mx-1 px-1 bg-amber-100 rounded">supabase/migrations/20260924_relatorios_tecnicos.sql</code>
                        no SQL Editor do Supabase. Enquanto isso você pode preencher e pré-visualizar, mas não salvar.
                    </div>
                </div>
            ) : null}

            {emitido ? (
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
                    <span className="flex items-center gap-2 font-semibold"><FileCheck2 className="h-5 w-5" /> Relatório emitido em {relatorio?.emitido_em ? new Date(relatorio.emitido_em).toLocaleString('pt-BR') : ''}. Edição travada.</span>
                    <div className="flex gap-2">
                        <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => window.open(`/print/relatorio-tecnico/${relatorio!.id}`, '_blank')}>
                            <Printer className="h-4 w-4 mr-1.5" /> Abrir PDF
                        </Button>
                        {isAdmin ? (
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={reabrir}>
                                <Unlock className="h-4 w-4 mr-1.5" /> Reabrir
                            </Button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {aba === 'visualizar' ? (
                <div className="overflow-x-auto rounded-3xl bg-slate-200/70 p-4 md:p-8">
                    <div className="min-w-[210mm]">
                        <TechnicalReportDocument
                            dados={d} empresa={empresa} numero={relatorio?.numero ?? null}
                            status={relatorio?.status || 'rascunho'} criadoEm={relatorio?.created_at} emitidoEm={relatorio?.emitido_em}
                        />
                    </div>
                </div>
            ) : (
                <fieldset disabled={bloqueado} className="space-y-5 min-w-0">
                    <Secao numero={1} titulo="Empresa que atendeu" dica="Logo, CNPJ e endereço saem da marca selecionada.">
                        <div className="flex flex-wrap gap-2">
                            {brands.map(b => (
                                <button key={b.id} type="button" onClick={() => { if (!bloqueado) { setMarcaId(b.id); setAlterado(true) } }}
                                    className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold',
                                        marcaId === b.id ? 'border-[#0f2a47] bg-[#0f2a47] text-white' : 'border-slate-200 bg-white text-slate-600')}>
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.cor_tema || '#10b981' }} />
                                    {b.nome}
                                </button>
                            ))}
                        </div>
                    </Secao>

                    <Secao numero={2} titulo="Cliente e local do atendimento">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Entrada rotulo="Cliente / razão social" valor={d.cliente.nome} onChange={v => atualizar('cliente', { nome: v })} className="md:col-span-2" />
                            <Entrada rotulo="CPF / CNPJ" valor={d.cliente.documento} onChange={v => atualizar('cliente', { documento: v })} />
                            <Entrada rotulo="Endereço do atendimento" valor={d.cliente.endereco} onChange={v => atualizar('cliente', { endereco: v })} />
                            <Entrada rotulo="Bairro" valor={d.cliente.bairro} onChange={v => atualizar('cliente', { bairro: v })} />
                            <Entrada rotulo="Cidade / UF" valor={d.cliente.cidade_uf} onChange={v => atualizar('cliente', { cidade_uf: v })} />
                            <Entrada rotulo="Contato no local" valor={d.cliente.contato_nome} onChange={v => atualizar('cliente', { contato_nome: v })} />
                            <Entrada rotulo="Telefone do contato" valor={d.cliente.contato_telefone} onChange={v => atualizar('cliente', { contato_telefone: v })} />
                        </div>
                        <Opcoes rotulo="Tipo de imóvel" opcoes={OPCOES.tipoImovel} unica marcados={d.cliente.tipo_imovel ? [d.cliente.tipo_imovel] : []}
                            onChange={v => atualizar('cliente', { tipo_imovel: v[0] || '' })} desabilitado={bloqueado} />
                        {d.cliente.tipo_imovel === 'Outro' ? <Entrada rotulo="Qual tipo de imóvel?" valor={d.cliente.tipo_imovel_outro} onChange={v => atualizar('cliente', { tipo_imovel_outro: v })} /> : null}
                    </Secao>

                    <Secao numero={3} titulo="Dados do atendimento">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Entrada rotulo="Data" tipo="date" valor={d.atendimento.data} onChange={v => atualizar('atendimento', { data: v })} />
                            <Entrada rotulo="Chegada" tipo="time" valor={d.atendimento.chegada} onChange={v => atualizar('atendimento', { chegada: v })} />
                            <Entrada rotulo="Saída" tipo="time" valor={d.atendimento.saida} onChange={v => atualizar('atendimento', { saida: v })} />
                            <Entrada rotulo="Técnico responsável" valor={d.atendimento.tecnico_nome} onChange={v => atualizar('atendimento', { tecnico_nome: v })} />
                        </div>
                        <Opcoes rotulo="Tipo de atendimento" opcoes={OPCOES.tipoAtendimento} unica marcados={d.atendimento.tipo ? [d.atendimento.tipo] : []}
                            onChange={v => atualizar('atendimento', { tipo: v[0] || '' })} desabilitado={bloqueado} />
                        <AreaTexto rotulo="Motivo do chamado · relato do cliente" valor={d.atendimento.relato_cliente} linhas={3} ditado
                            placeholder="Ex.: cliente relatou retorno de água no ralo da área de serviço há dois dias."
                            ia={camposIA.has('relato_cliente')} desabilitado={bloqueado}
                            onChange={v => atualizar('atendimento', { relato_cliente: v }, 'relato_cliente')} />
                    </Secao>

                    <Secao numero={4} titulo="Diagnóstico técnico">
                        <Opcoes rotulo="Ponto(s) afetado(s)" opcoes={OPCOES.pontos} marcados={d.diagnostico.pontos} onChange={v => atualizar('diagnostico', { pontos: v })} desabilitado={bloqueado} />
                        {d.diagnostico.pontos.includes('Outro') ? <Entrada rotulo="Outro ponto afetado" valor={d.diagnostico.ponto_outro} onChange={v => atualizar('diagnostico', { ponto_outro: v })} /> : null}
                        <Opcoes rotulo="Causa provável" opcoes={OPCOES.causas} marcados={d.diagnostico.causas} onChange={v => atualizar('diagnostico', { causas: v })} desabilitado={bloqueado} />
                        {d.diagnostico.causas.includes('Outra') ? <Entrada rotulo="Outra causa" valor={d.diagnostico.causa_outra} onChange={v => atualizar('diagnostico', { causa_outra: v })} /> : null}
                        <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-300 p-4 space-y-3">
                            <AreaTexto rotulo="Anotações do técnico (rascunho — não sai no documento)" valor={d.diagnostico.anotacoes_tecnico} ditado linhas={4}
                                placeholder="Escreva ou dite do seu jeito o que viu e fez. Ex.: ramal da cozinha entupido com gordura, caixa de gordura cheia, hidrojato 22 m, testei escoamento ok, orientei limpar a caixa a cada 6 meses."
                                desabilitado={bloqueado} onChange={v => atualizar('diagnostico', { anotacoes_tecnico: v })} />
                            <div className="flex flex-wrap items-center gap-3">
                                <Button type="button" onClick={redigirComIA} disabled={gerandoIA || bloqueado}
                                    className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold">
                                    {gerandoIA ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                                    Redigir textos com IA
                                </Button>
                                <span className="text-xs text-slate-500">A IA só reescreve o que foi marcado e anotado. Ela não inventa medidas, causas nem garantia.</span>
                            </div>
                        </div>
                        <AreaTexto rotulo="Constatações técnicas · descrição do que foi observado" valor={d.diagnostico.constatacoes} linhas={5}
                            ia={camposIA.has('constatacoes')} desabilitado={bloqueado}
                            onChange={v => atualizar('diagnostico', { constatacoes: v }, 'constatacoes')} />
                    </Secao>

                    <Secao numero={5} titulo="Serviço executado">
                        <Opcoes rotulo="Método(s) empregado(s)" opcoes={OPCOES.metodos} marcados={d.servico.metodos} onChange={v => atualizar('servico', { metodos: v })} desabilitado={bloqueado} />
                        {d.servico.metodos.includes('Outro método') ? <Entrada rotulo="Outro método" valor={d.servico.metodo_outro} onChange={v => atualizar('servico', { metodo_outro: v })} /> : null}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Entrada rotulo="Equipamentos utilizados" valor={d.servico.equipamentos} placeholder="Ex.: máquina rotativa, hidrojato" onChange={v => atualizar('servico', { equipamentos: v })} />
                            <Entrada rotulo="Extensão alcançada (m)" valor={d.servico.extensao_m} placeholder="Ex.: 22" onChange={v => atualizar('servico', { extensao_m: v })} />
                            <Entrada rotulo="Duração" valor={d.servico.duracao} placeholder="Ex.: 2 h 30 min" onChange={v => atualizar('servico', { duracao: v })} />
                        </div>
                    </Secao>

                    <Secao numero={6} titulo="Videoinspeção" dica="Só aparece no documento se for marcada como realizada.">
                        <Opcoes rotulo="Situação" opcoes={['Realizada', 'Não realizada']} unica
                            marcados={d.videoinspecao.realizada === null ? [] : [d.videoinspecao.realizada ? 'Realizada' : 'Não realizada']}
                            onChange={v => atualizar('videoinspecao', { realizada: v[0] ? v[0] === 'Realizada' : null })} desabilitado={bloqueado} />
                        {d.videoinspecao.realizada ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <Entrada rotulo="Trecho inspecionado" valor={d.videoinspecao.trecho} onChange={v => atualizar('videoinspecao', { trecho: v })} />
                                    <Entrada rotulo="Extensão inspecionada (m)" valor={d.videoinspecao.extensao_m} onChange={v => atualizar('videoinspecao', { extensao_m: v })} />
                                    <Entrada rotulo="Registro / nº do arquivo" valor={d.videoinspecao.registro} onChange={v => atualizar('videoinspecao', { registro: v })} />
                                </div>
                                <Opcoes rotulo="Condição observada" opcoes={OPCOES.condicoesVideo} marcados={d.videoinspecao.condicoes} onChange={v => atualizar('videoinspecao', { condicoes: v })} desabilitado={bloqueado} />
                                {d.videoinspecao.condicoes.includes('Outra') ? <Entrada rotulo="Outra condição" valor={d.videoinspecao.condicao_outra} onChange={v => atualizar('videoinspecao', { condicao_outra: v })} /> : null}
                            </>
                        ) : null}
                    </Secao>

                    <Secao numero={7} titulo="Resultado do serviço">
                        <Opcoes rotulo="Situação ao término" opcoes={OPCOES.situacaoFinal} unica marcados={d.resultado.situacao ? [d.resultado.situacao] : []}
                            onChange={v => atualizar('resultado', { situacao: v[0] || '' })} desabilitado={bloqueado} />
                        <AreaTexto rotulo="Verificação realizada (ex.: teste de escoamento)" valor={d.resultado.verificacao} linhas={3}
                            ia={camposIA.has('verificacao')} desabilitado={bloqueado}
                            onChange={v => atualizar('resultado', { verificacao: v }, 'verificacao')} />
                    </Secao>

                    <Secao numero={8} titulo="Recomendações ao cliente">
                        <Opcoes rotulo="Orientações" opcoes={OPCOES.recomendacoes} marcados={d.recomendacoes.marcadas} onChange={v => atualizar('recomendacoes', { marcadas: v })} desabilitado={bloqueado} />
                        <AreaTexto rotulo="Outras recomendações" valor={d.recomendacoes.outras} linhas={3}
                            ia={camposIA.has('recomendacoes_outras')} desabilitado={bloqueado}
                            onChange={v => atualizar('recomendacoes', { outras: v }, 'recomendacoes_outras')} />
                    </Secao>

                    <Secao numero={9} titulo="Limitações e garantia">
                        <AreaTexto rotulo="Limitações e observações (trechos não acessados, restrições, fora do escopo)" valor={d.limitacoes} linhas={3}
                            ia={camposIA.has('limitacoes')} desabilitado={bloqueado}
                            onChange={v => atualizarTexto('limitacoes', v, 'limitacoes')} />
                        <AreaTexto rotulo="Garantia · prazo e condições" valor={d.garantia} linhas={2} desabilitado={bloqueado}
                            placeholder="Preencha SOMENTE com os termos efetivamente contratados. Se ficar em branco, a seção não aparece."
                            onChange={v => atualizarTexto('garantia', v)} />
                    </Secao>

                    <Secao numero={10} titulo="Assinaturas">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Entrada rotulo="Técnico · nome completo" valor={d.assinaturas.tecnico_nome} onChange={v => atualizar('assinaturas', { tecnico_nome: v })} />
                            <Entrada rotulo="Técnico · matrícula / documento interno" valor={d.assinaturas.tecnico_documento} onChange={v => atualizar('assinaturas', { tecnico_documento: v })} />
                            <Entrada rotulo="Cliente / responsável no local" valor={d.assinaturas.cliente_nome} onChange={v => atualizar('assinaturas', { cliente_nome: v })} />
                            <Entrada rotulo="CPF / CNPJ do responsável" valor={d.assinaturas.cliente_cpf} onChange={v => atualizar('assinaturas', { cliente_cpf: v })} />
                            <Entrada rotulo="Local e data" valor={d.assinaturas.local_data} placeholder="Ex.: Curitiba, 24/09/2026" onChange={v => atualizar('assinaturas', { local_data: v })} className="md:col-span-2" />
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">{d.assinaturas.tecnico_assinatura_url ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />} Assinatura do técnico {d.assinaturas.tecnico_assinatura_url ? 'cadastrada' : 'não cadastrada (sai só a linha)'}</span>
                            <span className="flex items-center gap-1.5">{d.assinaturas.cliente_assinatura_url ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />} Assinatura do cliente {d.assinaturas.cliente_assinatura_url ? 'coletada na OS' : 'não coletada na OS (sai só a linha)'}</span>
                        </div>
                    </Secao>

                    <Secao numero={11} titulo="Registro fotográfico" dica="Registre o estado inicial, a execução e o resultado final. As fotos são reduzidas automaticamente.">
                        {camposIA.has('legendas') ? <Rotulo ia>Legendas</Rotulo> : null}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {d.fotos.map((f, i) => (
                                <div key={f.url + i} className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                                    <div className="relative aspect-[4/3] bg-slate-100">
                                        <img src={f.url} alt="" className="w-full h-full object-cover" />
                                        {!bloqueado ? (
                                            <button type="button" onClick={() => atualizarFotos(d.fotos.filter((_, j) => j !== i))}
                                                className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-white/90 text-rose-600 flex items-center justify-center shadow" title="Remover foto">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        ) : null}
                                        <span className="absolute left-2 top-2 text-[10px] font-bold bg-[#0f2a47] text-white px-2 py-0.5 rounded-md">Imagem {i + 1}</span>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        <div className="flex flex-wrap gap-1">
                                            {OPCOES.momentosFoto.map(m => (
                                                <button key={m.valor} type="button"
                                                    onClick={() => atualizarFotos(d.fotos.map((x, j) => j === i ? { ...x, momento: m.valor } : x))}
                                                    className={cn('px-2 py-1 rounded-lg text-[11px] font-bold border',
                                                        f.momento === m.valor ? 'bg-[#0f2a47] border-[#0f2a47] text-white' : 'bg-white border-slate-200 text-slate-500')}>
                                                    {m.rotulo}
                                                </button>
                                            ))}
                                        </div>
                                        <input value={f.legenda} placeholder="Legenda (ex.: caixa de gordura antes da limpeza)"
                                            onChange={e => atualizarFotos(d.fotos.map((x, j) => j === i ? { ...x, legenda: e.target.value } : x), true)}
                                            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs outline-none focus:border-emerald-400" />
                                    </div>
                                </div>
                            ))}
                            {!bloqueado ? (
                                <label className={cn('aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-500 cursor-pointer hover:border-emerald-400 hover:text-emerald-600',
                                    enviandoFoto && 'pointer-events-none opacity-60')}>
                                    {enviandoFoto ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
                                    <span className="text-xs font-bold">{enviandoFoto ? 'Enviando...' : 'Adicionar fotos'}</span>
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => { enviarFotos(e.target.files); e.target.value = '' }} />
                                </label>
                            ) : null}
                        </div>
                    </Secao>
                </fieldset>
            )}

            {/* Barra de ações fixa */}
            {!emitido ? (
                <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 print:hidden md:pl-72">
                    <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">
                            {pendencias.length ? <>Falta para emitir: <b className="text-slate-700">{pendencias.join(', ')}</b></> : <span className="text-emerald-700 font-semibold">Pronto para emitir</span>}
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" className="rounded-xl font-bold" onClick={() => salvar()} disabled={salvando || tabelaFaltando}>
                                {salvando ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />} Salvar rascunho
                            </Button>
                            <Button className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700" onClick={emitir} disabled={salvando || tabelaFaltando}>
                                <FileCheck2 className="h-4 w-4 mr-1.5" /> Emitir relatório
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

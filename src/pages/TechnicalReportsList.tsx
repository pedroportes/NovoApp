import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Search, Loader2, FileCheck2, Pencil, Printer, AlertTriangle, X, FilePlus2, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useBrand } from '@/contexts/BrandContext'
import { RelatorioTecnico, numeroFormatado } from '@/types/technicalReport'

const dataBR = (iso?: string | null) => {
    if (!iso) return '—'
    const d = /T00:00:00/.test(iso) || iso.length === 10 ? new Date(iso.slice(0, 10) + 'T12:00:00') : new Date(iso)
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}
const moeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export function TechnicalReportsList() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const { brands, selectedBrandId } = useBrand()
    const [relatorios, setRelatorios] = useState<RelatorioTecnico[]>([])
    const [carregando, setCarregando] = useState(true)
    const [tabelaFaltando, setTabelaFaltando] = useState(false)
    const [escolhendoOS, setEscolhendoOS] = useState(false)

    useEffect(() => {
        if (!userData?.empresa_id) return
        setCarregando(true)
        ;(supabase as any).from('relatorios_tecnicos')
            .select('id, empresa_id, marca_id, ordem_servico_id, numero, status, dados, created_at, updated_at, emitido_em')
            .eq('empresa_id', userData.empresa_id)
            .order('created_at', { ascending: false })
            .limit(300)
            .then(({ data, error }: any) => {
                if (error) {
                    if (/relatorios_tecnicos|42P01|PGRST205/.test(String(error.message || error.code))) setTabelaFaltando(true)
                    else console.error(error)
                    setRelatorios([])
                } else setRelatorios(data || [])
                setCarregando(false)
            })
    }, [userData?.empresa_id])

    const filtrados = useMemo(() =>
        selectedBrandId && selectedBrandId !== 'all' ? relatorios.filter(r => r.marca_id === selectedBrandId) : relatorios,
    [relatorios, selectedBrandId])

    const marca = (id: string | null) => brands.find(b => b.id === id)

    return (
        <div className="max-w-6xl mx-auto space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate('/reports')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="w-10 h-10 rounded-2xl bg-[#0f2a47] text-white flex items-center justify-center">
                        <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800">Relatórios Técnicos</h1>
                        <p className="text-xs text-slate-400 font-semibold">Documento formal entregue ao cliente após o serviço</p>
                    </div>
                </div>
                <Button className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700" onClick={() => setEscolhendoOS(true)}>
                    <Plus className="h-4 w-4 mr-1.5" /> Novo relatório
                </Button>
            </div>

            {tabelaFaltando ? (
                <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                        <b>Falta instalar a tabela de relatórios no banco.</b> Rode o arquivo
                        <code className="mx-1 px-1 bg-amber-100 rounded">supabase/migrations/20260924_relatorios_tecnicos.sql</code>
                        no SQL Editor do Supabase. Até lá dá para preencher e pré-visualizar, mas não salvar.
                    </div>
                </div>
            ) : null}

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                {carregando ? (
                    <div className="p-10 flex justify-center text-slate-400 gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Carregando...</div>
                ) : filtrados.length === 0 ? (
                    <div className="p-12 text-center">
                        <ClipboardCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="font-bold text-slate-700">Nenhum relatório técnico ainda</p>
                        <p className="text-sm text-slate-400 mt-1">Clique em <b>Novo relatório</b> e escolha a OS do atendimento.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                                <tr>
                                    <th className="p-4">Nº</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Atendimento</th>
                                    <th className="p-4">Técnico</th>
                                    <th className="p-4">Empresa</th>
                                    <th className="p-4 text-center">Situação</th>
                                    <th className="p-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {filtrados.map(r => {
                                    const m = marca(r.marca_id)
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => navigate(`/relatorio-tecnico/${r.id}`)}>
                                            <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{numeroFormatado(r.numero, r.created_at)}</td>
                                            <td className="p-4 text-slate-800 font-bold">{r.dados?.cliente?.nome || '—'}</td>
                                            <td className="p-4 text-slate-600 whitespace-nowrap">{dataBR(r.dados?.atendimento?.data)}</td>
                                            <td className="p-4 text-slate-600">{r.dados?.atendimento?.tecnico_nome || '—'}</td>
                                            <td className="p-4">
                                                {m ? (
                                                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.cor_tema || '#10b981' }} />{m.nome}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="p-4 text-center">
                                                {r.status === 'emitido'
                                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]"><FileCheck2 className="h-3 w-3" /> Emitido {dataBR(r.emitido_em)}</span>
                                                    : <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">Rascunho</span>}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                    <Button variant="outline" size="sm" className="h-7 px-2.5 rounded-lg text-[11px] font-bold" onClick={() => navigate(`/relatorio-tecnico/${r.id}`)}>
                                                        <Pencil className="h-3 w-3 mr-1" /> Abrir
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-7 px-2.5 rounded-lg text-[11px] font-bold border-emerald-300 text-emerald-800" onClick={() => window.open(`/print/relatorio-tecnico/${r.id}`, '_blank')}>
                                                        <Printer className="h-3 w-3 mr-1" /> PDF
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {escolhendoOS ? (
                <EscolherOS
                    empresaId={userData?.empresa_id || ''}
                    marcaId={selectedBrandId && selectedBrandId !== 'all' ? selectedBrandId : null}
                    osComRelatorio={new Set(relatorios.map(r => r.ordem_servico_id).filter(Boolean) as string[])}
                    onFechar={() => setEscolhendoOS(false)}
                    onEscolher={osId => navigate(osId ? `/relatorio-tecnico/novo?os=${osId}` : '/relatorio-tecnico/novo')}
                />
            ) : null}
        </div>
    )
}

function EscolherOS({ empresaId, marcaId, osComRelatorio, onFechar, onEscolher }: {
    empresaId: string, marcaId: string | null, osComRelatorio: Set<string>,
    onFechar: () => void, onEscolher: (osId: string | null) => void
}) {
    const [busca, setBusca] = useState('')
    const [lista, setLista] = useState<any[]>([])
    const [carregando, setCarregando] = useState(true)

    useEffect(() => {
        if (!empresaId) return
        const t = setTimeout(async () => {
            setCarregando(true)
            let q = (supabase as any).from('ordens_servico')
                .select('id, cliente_nome, data_agendamento, created_at, valor_total, status, marca_id, tecnico:tecnico_id (nome_completo), clientes:cliente_id (nome_razao, bairro)')
                .eq('empresa_id', empresaId)
                .order('created_at', { ascending: false })
                .limit(30)
            if (marcaId) q = q.eq('marca_id', marcaId)
            const termo = busca.trim()
            if (termo) q = q.ilike('cliente_nome', `%${termo.replace(/[%_,()]/g, ' ')}%`)
            else q = q.in('status', ['CONCLUIDO', 'concluido', 'EM_ANDAMENTO'])
            const { data } = await q
            setLista(data || [])
            setCarregando(false)
        }, 300)
        return () => clearTimeout(t)
    }, [busca, empresaId, marcaId])

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start md:items-center justify-center p-4" onClick={onFechar}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-extrabold text-slate-800">Novo relatório técnico</h2>
                        <p className="text-xs text-slate-400">Escolha a OS do atendimento. Os dados do cliente, técnico e empresa já vêm preenchidos.</p>
                    </div>
                    <button onClick={onFechar} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar pelo nome do cliente..."
                            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-emerald-400 focus:bg-white" />
                    </div>
                    {!busca.trim() ? <p className="text-[11px] text-slate-400 mt-2">Mostrando as OS concluídas mais recentes.</p> : null}
                </div>
                <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                    {carregando ? (
                        <div className="p-8 flex justify-center text-slate-400 gap-2"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : lista.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-400">Nenhuma OS encontrada.</div>
                    ) : lista.map(os => (
                        <button key={os.id} onClick={() => onEscolher(os.id)} className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-bold text-slate-800 truncate">{os.clientes?.nome_razao || os.cliente_nome || 'Sem nome'}</div>
                                <div className="text-xs text-slate-500">
                                    {dataBR(os.data_agendamento || os.created_at)} · {os.tecnico?.nome_completo || 'sem técnico'}
                                    {os.clientes?.bairro ? ` · ${os.clientes.bairro}` : ''}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {osComRelatorio.has(os.id) ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">já tem relatório</span> : null}
                                <span className="text-sm font-bold text-slate-700">{moeda(Number(os.valor_total))}</span>
                            </div>
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-between items-center gap-2">
                    <span className="text-[11px] text-slate-400">Serviço sem OS cadastrada?</span>
                    <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => onEscolher(null)}>
                        <FilePlus2 className="h-4 w-4 mr-1.5" /> Relatório em branco
                    </Button>
                </div>
            </div>
        </div>
    )
}

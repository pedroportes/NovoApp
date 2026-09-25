import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { financialService, TechnicianBalance } from '@/services/financialService'
import { useAuth } from '@/contexts/AuthContext'
import { useBrand } from '@/contexts/BrandContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { 
    ArrowLeft, 
    Printer, 
    Download, 
    FileText, 
    Loader2, 
    CheckCircle2, 
    Calendar, 
    User, 
    Building2, 
    DollarSign, 
    Receipt, 
    Clock, 
    Filter,
    HardDriveDownload
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

type PeriodPreset = 'tudo' | '15d_1' | '15d_2' | 'mes_atual' | 'mes_anterior' | 'custom'

// Helper para calcular datas de um preset
export const getDatesForPreset = (preset: PeriodPreset) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed
    const pad = (n: number) => String(n).padStart(2, '0')

    if (preset === '15d_1') {
        return {
            start: `${year}-${pad(month + 1)}-01`,
            end: `${year}-${pad(month + 1)}-15`
        }
    } else if (preset === '15d_2') {
        const lastDay = new Date(year, month + 1, 0).getDate()
        return {
            start: `${year}-${pad(month + 1)}-16`,
            end: `${year}-${pad(month + 1)}-${pad(lastDay)}`
        }
    } else if (preset === 'mes_atual') {
        const lastDay = new Date(year, month + 1, 0).getDate()
        return {
            start: `${year}-${pad(month + 1)}-01`,
            end: `${year}-${pad(month + 1)}-${pad(lastDay)}`
        }
    } else if (preset === 'mes_anterior') {
        const prevMonthDate = new Date(year, month, 0)
        const prevYear = prevMonthDate.getFullYear()
        const prevMonth = prevMonthDate.getMonth()
        const lastDay = prevMonthDate.getDate()
        return {
            start: `${prevYear}-${pad(prevMonth + 1)}-01`,
            end: `${prevYear}-${pad(prevMonth + 1)}-${pad(lastDay)}`
        }
    }
    return { start: '', end: '' }
}

export function TechnicianFinancialPrint() {
    const { userData } = useAuth()
    const { selectedBrand, brands } = useBrand()
    const navigate = useNavigate()
    const params = useParams()
    const [searchParams, setSearchParams] = useSearchParams()

    // Determine target technician ID
    const targetTechId = params.techId || searchParams.get('techId') || (userData?.cargo?.toLowerCase() === 'tecnico' ? userData?.id : null)

    // Period filter state - initial calculation
    const urlPreset = (searchParams.get('period') as PeriodPreset) || 'tudo'
    const presetDates = getDatesForPreset(urlPreset)

    const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(urlPreset)
    const [startDate, setStartDate] = useState<string>(searchParams.get('startDate') || presetDates.start)
    const [endDate, setEndDate] = useState<string>(searchParams.get('endDate') || presetDates.end)

    const [loading, setLoading] = useState(true)
    const [downloadingPdf, setDownloadingPdf] = useState(false)
    const [balance, setBalance] = useState<TechnicianBalance | null>(null)
    const [techInfo, setTechInfo] = useState<any>(null)
    const [brandInfo, setBrandInfo] = useState<any>(selectedBrand || (brands.length > 0 ? brands[0] : null))

    // Handle preset changes
    const applyPreset = (preset: PeriodPreset) => {
        setPeriodPreset(preset)
        const dates = getDatesForPreset(preset)
        setStartDate(dates.start)
        setEndDate(dates.end)

        const newParams = new URLSearchParams(searchParams)
        newParams.set('period', preset)
        if (dates.start) newParams.set('startDate', dates.start)
        else newParams.delete('startDate')
        if (dates.end) newParams.set('endDate', dates.end)
        else newParams.delete('endDate')
        setSearchParams(newParams, { replace: true })
    }

    // Sincronizar se vier alteração na URL
    useEffect(() => {
        const p = searchParams.get('period') as PeriodPreset | null
        const s = searchParams.get('startDate')
        const e = searchParams.get('endDate')

        if (s && e) {
            setStartDate(s)
            setEndDate(e)
            if (p) setPeriodPreset(p)
        } else if (p && p !== 'tudo') {
            const d = getDatesForPreset(p)
            setPeriodPreset(p)
            setStartDate(d.start)
            setEndDate(d.end)
        }
    }, [searchParams])

    useEffect(() => {
        const brandIdParam = searchParams.get('brandId') || searchParams.get('marca_id') || undefined
        if (targetTechId) {
            loadReportData(targetTechId, startDate, endDate, brandIdParam)
        } else if (userData?.id) {
            loadReportData(userData.id, startDate, endDate, brandIdParam)
        }
    }, [targetTechId, userData?.id, startDate, endDate, searchParams])

    const loadReportData = async (techId: string, start?: string, end?: string, brandId?: string) => {
        setLoading(true)
        try {
            // 1. Fetch technician profile
            const { data: techData, error: techError } = await (supabase
                .from('usuarios') as any)
                .select('*')
                .eq('id', techId)
                .single()

            if (!techError && techData) {
                setTechInfo(techData)
            }

            // 2. Fetch financial balance with date filter and brand filter
            const balanceData = await financialService.getTechnicianBalance(techId, start || undefined, end || undefined, brandId)
            setBalance(balanceData)

            // 3. Brand selection
            if (brandId && brandId !== 'all') {
                const found = brands.find(b => b.id === brandId)
                if (found) setBrandInfo(found)
            } else if (!brandInfo) {
                const { data: brandDb } = await supabase
                    .from('empresas_marcas')
                    .select('*')
                    .eq('ordem', 1)
                    .single()
                if (brandDb) setBrandInfo(brandDb)
            }

        } catch (error) {
            console.error('Erro ao carregar dados do relatório:', error)
            toast.error('Erro ao carregar dados de fechamento do técnico.')
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const formatDisplayPeriod = () => {
        if (!startDate && !endDate) return 'Todo o Período Pendente'
        if (startDate && endDate) {
            const d1 = new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')
            const d2 = new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')
            let label = `${d1} até ${d2}`
            if (periodPreset === '15d_1') label += ' (1ª Quinzena)'
            else if (periodPreset === '15d_2') label += ' (2ª Quinzena)'
            else if (periodPreset === 'mes_atual') label += ' (Mês Atual)'
            else if (periodPreset === 'mes_anterior') label += ' (Mês Anterior)'
            return label
        }
        if (startDate) return `A partir de ${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
        return `Até ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
    }

    const handlePrint = () => {
        window.print()
    }

    // Salvar o arquivo PDF diretamente no computador
    const handleDownloadPdf = async () => {
        const reportElement = document.getElementById('report-printable-content')
        if (!reportElement) {
            window.print()
            return
        }

        setDownloadingPdf(true)
        const toastId = toast.loading('Gerando arquivo PDF para download no seu computador...')

        try {
            // Renderizar elemento da folha em alta resolução
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })

            const imgData = canvas.toDataURL('image/png')
            
            // Criação do PDF A4
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = pdf.internal.pageSize.getHeight()
            
            const imgWidth = pdfWidth
            const imgHeight = (canvas.height * pdfWidth) / canvas.width
            
            let heightLeft = imgHeight
            let position = 0

            // Primeira página
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
            heightLeft -= pdfHeight

            // Páginas adicionais se o relatório for longo
            while (heightLeft > 0) {
                position = heightLeft - imgHeight
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
                heightLeft -= pdfHeight
            }

            // Nome do arquivo
            const techNameClean = (techInfo?.nome_completo || 'Tecnico').replace(/\s+/g, '_')
            let periodClean = 'Geral'
            if (periodPreset === '15d_1') periodClean = '1Quinzena'
            else if (periodPreset === '15d_2') periodClean = '2Quinzena'
            else if (periodPreset === 'mes_atual') periodClean = 'MesAtual'
            else if (periodPreset === 'mes_anterior') periodClean = 'MesAnterior'
            else if (startDate && endDate) periodClean = `${startDate}_a_${endDate}`

            const filename = `Extrato_Comissoes_${techNameClean}_${periodClean}.pdf`

            pdf.save(filename)
            toast.success(`PDF salvo com sucesso na sua pasta de Downloads: ${filename}`, { id: toastId })
        } catch (err) {
            console.error('Erro ao gerar PDF:', err)
            toast.error('Erro na exportação automática. Abrindo diálogo de impressão...', { id: toastId })
            window.print()
        } finally {
            setDownloadingPdf(false)
        }
    }

    const handleExportCSV = () => {
        if (!balance) return

        const headers = ['ID OS', 'Data', 'Cliente', 'Serviço', 'Valor Total (R$)', 'Comissão Técnico (R$)', 'Status']
        const rows = (balance.osDetails || []).map(os => [
            `#${os.id.slice(0, 8)}`,
            formatDate(os.created_at),
            os.cliente_nome || 'Cliente',
            os.descricao_servico || 'Desentupimento / Limpeza',
            (Number(os.valor_total) || 0).toFixed(2),
            ((Number(os.valor_total) || 0) * 0.5).toFixed(2),
            os.status || 'CONCLUIDO'
        ])

        const csvContent = "data:text/csv;charset=utf-8," + 
            [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
        
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        const techNameClean = (techInfo?.nome_completo || 'Tecnico').replace(/\s+/g, '_')
        link.setAttribute("download", `Extrato_Comissoes_${techNameClean}_${periodPreset}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Extrato baixado em CSV!')
    }

    const techName = balance?.technicianName || techInfo?.nome_completo || techInfo?.nome || 'Técnico'
    const totalOs = balance?.osCount || balance?.osDetails?.length || 0
    const faturamentoBruto = (balance?.osDetails || []).reduce((acc, os) => acc + (Number(os.valor_total) || 0), 0)
    const comissaoTotal = balance?.totalCommission || (faturamentoBruto * 0.5)
    const reembolsos = balance?.totalReimbursements || 0
    const adiantamentos = balance?.totalAdvances || 0
    const liquidoPagar = balance?.finalBalance || (comissaoTotal + reembolsos - adiantamentos)

    return (
        <div className="min-h-screen bg-slate-100/70 text-slate-800 print:bg-white print:text-black">
            {/* Top Toolbar (Oculta na Impressão) */}
            <header className="print:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-xs">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(-1)}
                            className="text-slate-600 font-bold hover:bg-slate-100 rounded-xl shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>

                        <div>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Relatório Oficial</span>
                            <span className="text-sm font-extrabold text-slate-800">Fechamento de Comissões • {techName}</span>
                        </div>
                    </div>

                    {/* Filtro de Período Integrado */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                            <Calendar className="h-4 w-4 text-slate-500 ml-2 shrink-0" />
                            <select
                                value={periodPreset}
                                onChange={(e) => applyPreset(e.target.value as PeriodPreset)}
                                className="text-xs font-bold text-slate-700 bg-transparent py-1.5 pr-2 outline-none cursor-pointer"
                            >
                                <option value="tudo">Todo o Histórico / Pendente</option>
                                <option value="15d_1">1ª Quinzena (01 a 15)</option>
                                <option value="15d_2">2ª Quinzena (16 ao Fim)</option>
                                <option value="mes_atual">Este Mês</option>
                                <option value="mes_anterior">Mês Anterior</option>
                                <option value="custom">Personalizado por Data</option>
                            </select>
                        </div>

                        {/* Campos de Data se personalizado */}
                        {periodPreset === 'custom' && (
                            <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="text-xs font-bold text-slate-700 px-2 py-1 outline-none rounded-lg bg-slate-50"
                                    title="Data Inicial"
                                />
                                <span className="text-xs text-slate-400 font-bold">até</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="text-xs font-bold text-slate-700 px-2 py-1 outline-none rounded-lg bg-slate-50"
                                    title="Data Final"
                                />
                            </div>
                        )}

                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleExportCSV}
                            className="rounded-xl border-slate-200 font-bold text-xs"
                            title="Exportar dados para Excel (.CSV)"
                        >
                            <Download className="h-4 w-4 mr-1.5 text-slate-500" />
                            CSV
                        </Button>

                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handlePrint}
                            className="rounded-xl border-slate-300 font-bold text-xs hover:bg-slate-50"
                            title="Abrir diálogo de impressão do navegador"
                        >
                            <Printer className="h-4 w-4 mr-1.5 text-slate-600" />
                            Imprimir
                        </Button>

                        <Button 
                            size="sm"
                            onClick={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
                            title="Baixar o arquivo PDF diretamente no computador"
                        >
                            {downloadingPdf ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                    Gerando PDF...
                                </>
                            ) : (
                                <>
                                    <HardDriveDownload className="h-4 w-4 mr-1.5" />
                                    Baixar PDF no PC
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Dica amigável */}
            <div className="print:hidden max-w-5xl mx-auto mt-4 px-4">
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Filtrando por: <strong>{formatDisplayPeriod()}</strong>. Para salvar o documento no seu computador, clique em <strong>Baixar PDF no PC</strong>.</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="min-h-[500px] flex flex-col items-center justify-center p-8">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-3" />
                    <p className="text-slate-600 font-semibold text-sm">Filtrando atendimentos e comissões do período...</p>
                </div>
            ) : (
                /* Documento Estilo Folha A4 / Extrato Executivo */
                <main id="report-printable-content" className="max-w-5xl mx-auto my-6 p-6 sm:p-10 bg-white rounded-3xl shadow-xl border border-slate-200/80 print:my-0 print:p-0 print:border-none print:shadow-none print:rounded-none">
                    
                    {/* 1. CABEÇALHO DA EMPRESA */}
                    <div className="border-b-2 border-slate-800/10 pb-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 text-center sm:text-left">
                            {brandInfo?.logo_url ? (
                                <img 
                                    src={brandInfo.logo_url} 
                                    alt={brandInfo.nome} 
                                    className="h-16 w-auto max-w-[160px] object-contain rounded-xl"
                                />
                            ) : (
                                <div className="h-16 w-16 bg-emerald-600 text-white font-black text-2xl flex items-center justify-center rounded-2xl shadow-md">
                                    FD
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl font-black text-slate-900 leading-tight">
                                    {brandInfo?.nome || 'Desentupidora Hidro Curitiba'}
                                </h1>
                                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                    CNPJ: {brandInfo?.cnpj || '38.057.542/0002-54'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {brandInfo?.endereco || 'R. Primeiro de Maio, 1515 - Sala 2, Xaxim'} • Curitiba - PR
                                </p>
                                <p className="text-xs text-slate-500 font-medium">
                                    Tel/WhatsApp: {brandInfo?.telefone || '(41) 3540-0220'}
                                </p>
                            </div>
                        </div>

                        <div className="text-center sm:text-right bg-slate-50 p-4 rounded-2xl border border-slate-200/60 print:bg-white print:border print:border-slate-300">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Documento Contábil</span>
                            <span className="text-lg font-black text-slate-800 block">EXTRATO DE COMISSÕES</span>
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100/60 px-2.5 py-0.5 rounded-full inline-block mt-1">
                                Período: {formatDisplayPeriod()}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-1.5">
                                Emissão: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    {/* 2. DADOS DO TÉCNICO */}
                    <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg border border-emerald-200">
                                {(techName).charAt(0)}
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Técnico Responsável</span>
                                <span className="text-lg font-black text-slate-800">{techName}</span>
                                <span className="text-xs text-slate-500 font-medium block">
                                    Modelo de Parceria: <strong>50% de Comissão</strong>
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-center bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ordens no Período</span>
                                <span className="text-lg font-black text-slate-800">{totalOs} OSs</span>
                            </div>
                            <div className="text-center bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200/80 shadow-2xs">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Comissão Padrão</span>
                                <span className="text-lg font-black text-emerald-800">50%</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. RESUMO CONSOLIDADO (CARDS) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Faturamento Bruto</span>
                            <span className="text-xl font-black text-slate-800 block mt-1">{formatCurrency(faturamentoBruto)}</span>
                            <span className="text-[10px] text-slate-500 mt-1 block">{totalOs} serviços no período</span>
                        </div>

                        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/60">
                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">(+) Comissões (50%)</span>
                            <span className="text-xl font-black text-emerald-800 block mt-1">+ {formatCurrency(comissaoTotal)}</span>
                            <span className="text-[10px] text-emerald-600 mt-1 block">50% da receita líquida</span>
                        </div>

                        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/60">
                            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">(+) Reembolsos</span>
                            <span className="text-xl font-black text-blue-800 block mt-1">+ {formatCurrency(reembolsos)}</span>
                            <span className="text-[10px] text-blue-600 mt-1 block">Despesas aprovadas</span>
                        </div>

                        <div className="bg-red-50/70 p-4 rounded-2xl border border-red-200/60">
                            <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block">(-) Adiantamentos</span>
                            <span className="text-xl font-black text-red-800 block mt-1">- {formatCurrency(adiantamentos)}</span>
                            <span className="text-[10px] text-red-600 mt-1 block">Vales descontados</span>
                        </div>
                    </div>

                    {/* 4. DESTAQUE DO VALOR LÍQUIDO A PAGAR */}
                    <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden print:bg-none print:text-black print:border-2 print:border-black print:p-6">
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-emerald-300 block mb-1 print:text-slate-600">
                                    Valor Líquido Total a Pagar ao Técnico
                                </span>
                                <span className="text-3xl sm:text-4xl font-black tracking-tight">
                                    {formatCurrency(liquidoPagar)}
                                </span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 print:border print:border-slate-400 print:text-black">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block print:text-slate-600">Chave PIX da Empresa</span>
                                <span className="text-sm font-black font-mono">{brandInfo?.chave_pix || brandInfo?.cnpj || '38.057.542/0002-54'}</span>
                            </div>
                        </div>
                    </div>

                    {/* 5. TABELA DETALHADA DE ORDENS DE SERVIÇO */}
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                                Detalhamento dos Serviços Prestados no Período ({totalOs} Atendimentos)
                            </h3>
                            <span className="text-xs text-slate-500 font-semibold">Base de Cálculo: 50%</span>
                        </div>

                        {(!balance?.osDetails || balance.osDetails.length === 0) ? (
                            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <p className="text-slate-500 text-sm font-medium">Nenhuma ordem de serviço pendente ou concluída encontrada para este período selecionado.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                        <tr>
                                            <th className="p-3">OS</th>
                                            <th className="p-3">Data</th>
                                            <th className="p-3">Cliente</th>
                                            <th className="p-3">Serviço / Descrição</th>
                                            <th className="p-3 text-right">Faturamento</th>
                                            <th className="p-3 text-right">Comissão (50%)</th>
                                            <th className="p-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                        {balance.osDetails.map((os, idx) => {
                                            const val = Number(os.valor_total) || 0
                                            const com = val * 0.5
                                            return (
                                                <tr key={os.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-3 font-mono font-bold text-slate-900">
                                                        #{os.id.slice(0, 8)}
                                                    </td>
                                                    <td className="p-3 text-slate-500 whitespace-nowrap">
                                                        {formatDate(os.created_at)}
                                                    </td>
                                                    <td className="p-3 font-semibold text-slate-800">
                                                        {os.cliente_nome || 'Cliente Particular'}
                                                    </td>
                                                    <td className="p-3 max-w-[220px] truncate text-slate-600" title={os.descricao_servico}>
                                                        {os.descricao_servico || 'Desentupimento / Limpeza de Tubulação'}
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-slate-900">
                                                        {formatCurrency(val)}
                                                    </td>
                                                    <td className="p-3 text-right font-extrabold text-emerald-700 bg-emerald-50/40">
                                                        {formatCurrency(com)}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                                            Concluído
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                        <tr>
                                            <td colSpan={4} className="p-3 text-right text-slate-800 uppercase text-xs">
                                                Total Geral do Período:
                                            </td>
                                            <td className="p-3 text-right text-sm font-black text-slate-900">
                                                {formatCurrency(faturamentoBruto)}
                                            </td>
                                            <td className="p-3 text-right text-sm font-black text-emerald-700 bg-emerald-100/50">
                                                {formatCurrency(comissaoTotal)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* 6. BLOCO DE ASSINATURAS E QUITAÇÃO */}
                    <div className="mt-12 pt-8 border-t-2 border-slate-200/80">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
                            <div className="flex flex-col items-center">
                                <div className="w-64 border-b-2 border-slate-400 mb-2"></div>
                                <span className="font-bold text-xs text-slate-800">{techName}</span>
                                <span className="text-[10px] text-slate-500">Técnico Operacional / Parceiro</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="w-64 border-b-2 border-slate-400 mb-2"></div>
                                <span className="font-bold text-xs text-slate-800">
                                    {brandInfo?.razao_social || brandInfo?.nome || 'Direção Financeira'}
                                </span>
                                <span className="text-[10px] text-slate-500">Administração & Controle Financeiro</span>
                            </div>
                        </div>

                        <div className="text-center mt-8 text-[10px] text-slate-400">
                            Documento gerado automaticamente pelo FlowDrain • Gestão Inteligente para Desentupidoras.
                        </div>
                    </div>
                </main>
            )}
        </div>
    )
}

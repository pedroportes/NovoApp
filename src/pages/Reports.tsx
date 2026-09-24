import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useBrand } from '@/contexts/BrandContext'
import { 
    TrendingUp, 
    Receipt, 
    Users, 
    AlertTriangle, 
    MapPin, 
    Printer, 
    Download, 
    Calendar, 
    DollarSign, 
    Building2, 
    CheckCircle2, 
    FileText, 
    ExternalLink,
    Search, 
    Filter, 
    Percent, 
    ArrowUpRight, 
    ArrowDownRight, 
    Wallet,
    Wrench,
    Clock,
    ClipboardCheck,
    ChevronDown,
    Phone,
    MessageSquare,
    Sparkles,
    Send,
    RefreshCw,
    HelpCircle,
    Truck,
    Droplets,
    Droplet,
    Layers,
    ShieldAlert,
    CloudRain,
    Check,
    PhoneCall,
    Award
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ReportTab = 'dre' | 'fiscal' | 'comissoes' | 'nao_feitos' | 'servicos' | 'geografico' | 'reativacao'
type PeriodFilter = '15d_1' | '15d_2' | '30d' | 'mes_atual' | 'mes_anterior' | '90d' | 'ano' | 'tudo' | 'custom'

// =========================================================================
// CLASSIFICADOR INTELIGENTE DE SERVIÇOS DE DESENTUPIDORA
// =========================================================================
export interface ServiceCategoryMeta {
    id: string
    nome: string
    icone: any
    cor: string
    bgLight: string
    border: string
    googleAds: 'ALTA_PRIORIDADE' | 'MODERADA' | 'ORGANICO'
    badgeAds: string
    dicaAds: string
}

export function categorizarServico(descricao?: string, itens?: any[]): ServiceCategoryMeta {
    let text = (descricao || '').toLowerCase()
    if (Array.isArray(itens) && itens.length > 0) {
        text += ' ' + itens.map(i => `${i.descricao || ''} ${i.nome || ''} ${i.item || ''}`).join(' ').toLowerCase()
    }

    if (text.includes('fossa') || text.includes('esgotamento') || text.includes('sumidouro') || text.includes('auto-vácuo') || text.includes('auto vacuo') || text.includes('limpa fossa')) {
        return {
            id: 'limpa_fossa',
            nome: 'Limpa Fossa / Esgotamento',
            icone: Truck,
            cor: '#f59e0b',
            bgLight: 'bg-amber-50 text-amber-700',
            border: 'border-amber-200',
            googleAds: 'ALTA_PRIORIDADE',
            badgeAds: '🔥 Maior Ticket Médio',
            dicaAds: 'Altíssimo ticket (R$ 800 - R$ 2.500+). Vale cada centavo anunciar no Google Ads com termos como "limpa fossa curitiba 24h" e "esgotamento de fossa".'
        }
    }
    if (text.includes('caixa de gordura') || text.includes('gordura')) {
        return {
            id: 'caixa_gordura',
            nome: 'Caixa de Gordura',
            icone: Layers,
            cor: '#10b981',
            bgLight: 'bg-emerald-50 text-emerald-700',
            border: 'border-emerald-200',
            googleAds: 'ALTA_PRIORIDADE',
            badgeAds: '⭐ Campeão de Recorrência',
            dicaAds: 'O serviço mais lucrativo em fidelização. Restaurantes, condomínios e casas precisam limpar a cada 6 meses (CAC zero no recall).'
        }
    }
    if (text.includes('esgoto') || text.includes('rede de esgoto') || text.includes('rede principal') || text.includes('manilha')) {
        return {
            id: 'esgoto',
            nome: 'Rede Geral de Esgoto',
            icone: ShieldAlert,
            cor: '#ef4444',
            bgLight: 'bg-rose-50 text-rose-700',
            border: 'border-rose-200',
            googleAds: 'ALTA_PRIORIDADE',
            badgeAds: '🚨 Urgência Máxima',
            dicaAds: 'Cliente com retorno de esgoto não pesquisa muito: fecha na hora. Mantenha lance forte na 1ª posição do Google Ads.'
        }
    }
    if (text.includes('pia') || text.includes('cozinha') || text.includes('ralo') || text.includes('tanque')) {
        return {
            id: 'pia_ralo',
            nome: 'Pia, Cozinha & Ralos',
            icone: Droplet,
            cor: '#3b82f6',
            bgLight: 'bg-blue-50 text-blue-700',
            border: 'border-blue-200',
            googleAds: 'MODERADA',
            badgeAds: '💧 Maior Volume',
            dicaAds: 'Serviço mais frequente do dia a dia. Garante a produtividade dos técnicos em campo, mas monitore o CPC no Ads para manter boa margem.'
        }
    }
    if (text.includes('vaso') || text.includes('sanitario') || text.includes('sanitário') || text.includes('privada') || text.includes('banheiro')) {
        return {
            id: 'vaso',
            nome: 'Vaso Sanitário',
            icone: CheckCircle2,
            cor: '#8b5cf6',
            bgLight: 'bg-purple-50 text-purple-700',
            border: 'border-purple-200',
            googleAds: 'ALTA_PRIORIDADE',
            badgeAds: '⚡ Alta Conversão',
            dicaAds: 'Desentupimento rápido de executar com excelente margem líquida. Muito comum em residências e empresas.'
        }
    }
    if (text.includes('pluvial') || text.includes('chuva') || text.includes('calha') || text.includes('água de chuva') || text.includes('aguas pluviais')) {
        return {
            id: 'pluvial',
            nome: 'Águas Pluviais / Calha',
            icone: CloudRain,
            cor: '#06b6d4',
            bgLight: 'bg-cyan-50 text-cyan-700',
            border: 'border-cyan-200',
            googleAds: 'ALTA_PRIORIDADE',
            badgeAds: '🌧️ Oportunidade em Chuva',
            dicaAds: 'Em dias de chuva em Curitiba e RMC, aumente o orçamento diário das campanhas de calha e galeria pluvial para captar picos de demanda.'
        }
    }
    if (text.includes('hidro') || text.includes('hidrojateamento') || text.includes('alta pressao') || text.includes('alta pressão')) {
        return {
            id: 'hidrojato',
            nome: 'Hidrojateamento',
            icone: Sparkles,
            cor: '#6366f1',
            bgLight: 'bg-indigo-50 text-indigo-700',
            border: 'border-indigo-200',
            googleAds: 'ALTA_PRIORIDADE',
            badgeAds: '🏢 Condomínios & Indústria',
            dicaAds: 'Serviço técnico de alto valor para empresas e condomínios. Excelente para prospecção direta B2B e contratos anuais.'
        }
    }
    if (text.includes('coluna') || text.includes('predial') || text.includes('barrilete')) {
        return {
            id: 'colunas',
            nome: 'Colunas Prediais',
            icone: Building2,
            cor: '#ea580c',
            bgLight: 'bg-orange-50 text-orange-700',
            border: 'border-orange-200',
            googleAds: 'MODERADA',
            badgeAds: '🏬 Prédios & Síndicos',
            dicaAds: 'Desentupimento vertical em edifícios. Ofereça contrato semestral preventivo para o síndico ou administradora.'
        }
    }

    return {
        id: 'geral',
        nome: 'Desentupimento Geral / Outros',
        icone: Wrench,
        cor: '#64748b',
        bgLight: 'bg-slate-50 text-slate-700',
        border: 'border-slate-200',
        googleAds: 'ORGANICO',
        badgeAds: '📋 Demais Serviços',
        dicaAds: 'Serviços diversos ou sem discriminação detalhada do ponto de entupimento na OS.'
    }
}

export function Reports() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const { brands, selectedBrandId, selectedBrand } = useBrand()

    const [searchParams, setSearchParams] = useSearchParams()
    const tabFromUrl = searchParams.get('tab') as ReportTab | null
    const validTabs: ReportTab[] = ['dre', 'fiscal', 'comissoes', 'nao_feitos', 'servicos', 'geografico', 'reativacao']
    const [activeTab, setActiveTab] = useState<ReportTab>(
        (tabFromUrl && validTabs.includes(tabFromUrl)) ? tabFromUrl : 'dre'
    )

    useEffect(() => {
        const t = searchParams.get('tab') as ReportTab | null
        if (t && validTabs.includes(t)) {
            setActiveTab(t)
        }
    }, [searchParams])

    const handleTabChange = (t: ReportTab) => {
        setActiveTab(t)
        setSearchParams({ tab: t })
    }
    const [seletorAberto, setSeletorAberto] = useState(false)
    const [period, setPeriod] = useState<PeriodFilter>('30d')
    const [customStartDate, setCustomStartDate] = useState<string>('')
    const [customEndDate, setCustomEndDate] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [downloadingPdf, setDownloadingPdf] = useState(false)

    // Raw datasets
    const [allOrders, setAllOrders] = useState<any[]>([])
    const [allPrevOrders, setAllPrevOrders] = useState<any[]>([])
    const [expenses, setExpenses] = useState<any[]>([])
    const [technicians, setTechnicians] = useState<any[]>([])

    // Reativação de clientes
    const [reactivationList, setReactivationList] = useState<any[]>([])
    const [loadingReactivation, setLoadingReactivation] = useState(false)
    const [reactivationFilter, setReactivationFilter] = useState<'todos' | 'fossa' | 'gordura'>('todos')
    const [reactivationSearch, setReactivationSearch] = useState('')

    const orders = useMemo(() => {
        if (!selectedBrandId || selectedBrandId === 'all') return allOrders
        return allOrders.filter(o => o.marca_id === selectedBrandId)
    }, [allOrders, selectedBrandId])

    const prevOrders = useMemo(() => {
        if (!selectedBrandId || selectedBrandId === 'all') return allPrevOrders
        return allPrevOrders.filter(o => o.marca_id === selectedBrandId)
    }, [allPrevOrders, selectedBrandId])

    // Date range calculation based on period filter
    const dateRange = useMemo(() => {
        const now = new Date()
        let start = new Date()
        let end = new Date()

        if (period === '30d') {
            start.setDate(now.getDate() - 30)
        } else if (period === 'mes_atual') {
            start = new Date(now.getFullYear(), now.getMonth(), 1)
        } else if (period === 'mes_anterior') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        } else if (period === '90d') {
            start.setDate(now.getDate() - 90)
        } else if (period === 'ano') {
            start = new Date(now.getFullYear(), 0, 1)
        } else if (period === 'tudo') {
            start = new Date(2020, 0, 1)
        } else if (period === '15d_1') {
            start = new Date(now.getFullYear(), now.getMonth(), 1)
            end = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59)
        } else if (period === '15d_2') {
            start = new Date(now.getFullYear(), now.getMonth(), 16)
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        } else if (period === 'custom') {
            const parseLocal = (s: string) => {
                const [y, m, d] = s.split('-').map(Number)
                return new Date(y, m - 1, d)
            }
            start = customStartDate ? parseLocal(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1)
            if (customEndDate) {
                end = parseLocal(customEndDate)
                end.setHours(23, 59, 59)
            }
        }

        return { start, end }
    }, [period, customStartDate, customEndDate])

    // Período anterior equivalente para cálculo dos comparativos ▲ ▼
    const prevDateRange = useMemo(() => {
        const now = new Date()
        let prevStart: Date | null = null
        let prevEnd: Date | null = null

        if (period === 'mes_atual') {
            prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        } else if (period === 'mes_anterior') {
            prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
            prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59)
        } else if (period === '15d_1') {
            prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 16)
            prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        } else if (period === '15d_2') {
            prevStart = new Date(now.getFullYear(), now.getMonth(), 1)
            prevEnd = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59)
        } else if (period === 'ano') {
            prevStart = new Date(now.getFullYear() - 1, 0, 1)
            prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)
        } else if (period === 'tudo') {
            return null
        } else {
            const diffMs = dateRange.end.getTime() - dateRange.start.getTime()
            prevEnd = new Date(dateRange.start.getTime() - 1000)
            prevStart = new Date(prevEnd.getTime() - diffMs)
        }

        return { start: prevStart, end: prevEnd }
    }, [period, dateRange])

    useEffect(() => {
        if (userData?.empresa_id) {
            loadAllReportData()
        }
    }, [userData?.empresa_id, dateRange, prevDateRange])

    useEffect(() => {
        if (userData?.empresa_id && activeTab === 'reativacao' && reactivationList.length === 0) {
            loadReactivationClients()
        }
    }, [userData?.empresa_id, activeTab])

    const ultimaBuscaRef = useRef(0)

    const loadAllReportData = async () => {
        const buscaId = ++ultimaBuscaRef.current
        setLoading(true)
        try {
            const TAMANHO_PAGINA = 1000
            const buscarTodas = async (montarConsulta: (de: number, ate: number) => PromiseLike<{ data: any[] | null, error: any }>) => {
                const linhas: any[] = []
                for (let de = 0; ; de += TAMANHO_PAGINA) {
                    const { data, error } = await montarConsulta(de, de + TAMANHO_PAGINA - 1)
                    if (error) throw error
                    linhas.push(...(data || []))
                    if (!data || data.length < TAMANHO_PAGINA) break
                }
                return linhas
            }

            // 1. Ordens de Serviço do período atual
            const osQuery = (de: number, ate: number) => supabase
                .from('ordens_servico')
                .select(`
                    id, 
                    created_at, 
                    status, 
                    valor_total, 
                    cliente_id, 
                    cliente_nome, 
                    tecnico_id,
                    marca_id,
                    descricao_servico,
                    itens,
                    nfe_numero,
                    nfe_status,
                    nfe_ref,
                    nfe_pdf_url,
                    nfe_url_pdf,
                    marcas:marca_id (nome, cor_tema),
                    tecnicos:tecnico_id (nome_completo, nome),
                    clientes:cliente_id (bairro, cidade, endereco, cpf_cnpj, whatsapp)
                `)
                .eq('empresa_id', userData!.empresa_id!)
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString())
                .order('created_at', { ascending: false })
                .order('id', { ascending: true })
                .range(de, ate)

            // 2. Ordens do período anterior (para comparativo ▲ ▼)
            const prevOsQuery = prevDateRange ? (de: number, ate: number) => supabase
                .from('ordens_servico')
                .select('id, created_at, status, valor_total, marca_id')
                .eq('empresa_id', userData!.empresa_id!)
                .gte('created_at', prevDateRange.start.toISOString())
                .lte('created_at', prevDateRange.end.toISOString())
                .order('created_at', { ascending: false })
                .range(de, ate) : null

            // 3. Despesas operacionais do período atual
            const expQuery = (de: number, ate: number) => supabase
                .from('despesas_tecnicos')
                .select('*')
                .eq('empresa_id', userData!.empresa_id!)
                .eq('status_aprovacao', 'aprovado')
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString())
                .order('id', { ascending: true })
                .range(de, ate)

            // 4. Técnicos
            const techQuery = supabase
                .from('usuarios')
                .select('id, nome_completo, nome, percentual_comissao, cargo')
                .eq('empresa_id', userData!.empresa_id!)
                .eq('cargo', 'tecnico')

            const [osData, prevOsData, expData, techRes] = await Promise.all([
                buscarTodas(osQuery as any),
                prevOsQuery ? buscarTodas(prevOsQuery as any) : Promise.resolve([]),
                buscarTodas(expQuery as any),
                techQuery
            ])

            if (buscaId !== ultimaBuscaRef.current) return

            setAllOrders(osData)
            setAllPrevOrders(prevOsData || [])
            setExpenses(expData)
            setTechnicians(techRes.data || [])
        } catch (error) {
            console.error('Erro ao carregar dados de relatórios:', error)
            toast.error('Erro ao carregar dados para os relatórios.')
        } finally {
            if (buscaId === ultimaBuscaRef.current) setLoading(false)
        }
    }

    // Carregamento de clientes para reativação (Fossa & Caixa de Gordura)
    const loadReactivationClients = async () => {
        setLoadingReactivation(true)
        try {
            const agora = new Date()
            const ate5MesesAtras = new Date(agora.getFullYear(), agora.getMonth() - 5, agora.getDate())
            const de18MesesAtras = new Date(agora.getFullYear(), agora.getMonth() - 18, agora.getDate())

            const { data: ordensCandidatas, error: erroCandidatas } = await supabase
                .from('ordens_servico')
                .select(`
                    id,
                    created_at,
                    valor_total,
                    cliente_id,
                    cliente_nome,
                    cliente_whatsapp,
                    descricao_servico,
                    itens,
                    status,
                    marca_id,
                    marcas:marca_id (nome, cor_tema, telefone),
                    clientes:cliente_id (id, nome_razao, whatsapp, telefone, logradouro, numero, bairro, cidade)
                `)
                .eq('empresa_id', userData!.empresa_id!)
                .in('status', ['CONCLUIDO', 'concluido', 'concluído'])
                .gte('created_at', de18MesesAtras.toISOString())
                .lte('created_at', ate5MesesAtras.toISOString())
                .order('created_at', { ascending: false })

            if (erroCandidatas) throw erroCandidatas

            // Busca quem já teve serviço nos últimos 5 meses para não incomodar
            const { data: ordensRecentes, error: erroRecentes } = await supabase
                .from('ordens_servico')
                .select('cliente_id, cliente_whatsapp')
                .eq('empresa_id', userData!.empresa_id!)
                .in('status', ['CONCLUIDO', 'concluido', 'concluído'])
                .gte('created_at', ate5MesesAtras.toISOString())

            if (erroRecentes) throw erroRecentes

            const idsClientesRecentes = new Set((ordensRecentes || []).map(o => o.cliente_id).filter(Boolean))
            const fonesRecentes = new Set((ordensRecentes || []).map(o => (o.cliente_whatsapp || '').replace(/\D/g, '')).filter(f => f.length >= 8))

            const clientesAgrupados = new Map<string, any>()

            ;(ordensCandidatas || []).forEach(o => {
                const cat = categorizarServico(o.descricao_servico, o.itens)
                if (cat.id !== 'limpa_fossa' && cat.id !== 'caixa_gordura') return

                const foneLimpo = (o.clientes?.whatsapp || o.cliente_whatsapp || o.clientes?.telefone || '').replace(/\D/g, '')
                const clienteKey = o.cliente_id || foneLimpo || o.cliente_nome
                if (!clienteKey) return

                if (o.cliente_id && idsClientesRecentes.has(o.cliente_id)) return
                if (foneLimpo && fonesRecentes.has(foneLimpo)) return

                if (clientesAgrupados.has(clienteKey)) return

                const dataServico = new Date(o.created_at)
                const diffDias = Math.floor((agora.getTime() - dataServico.getTime()) / (1000 * 60 * 60 * 24))
                const mesesAtras = Math.max(1, Math.round(diffDias / 30))

                clientesAgrupados.set(clienteKey, {
                    id: o.id,
                    clienteId: o.cliente_id,
                    clienteNome: o.clientes?.nome_razao || o.cliente_nome || 'Cliente',
                    clienteWhatsapp: o.clientes?.whatsapp || o.cliente_whatsapp || o.clientes?.telefone || '',
                    endereco: o.clientes?.logradouro 
                        ? `${o.clientes.logradouro}${o.clientes.numero ? ', ' + o.clientes.numero : ''} - ${o.clientes.bairro || ''}, ${o.clientes.cidade || 'Curitiba'}`
                        : (o.clientes?.endereco || 'Curitiba e Região'),
                    bairro: o.clientes?.bairro || 'Curitiba',
                    cidade: o.clientes?.cidade || 'Curitiba',
                    tipoServico: cat.id,
                    categoriaNome: cat.nome,
                    valorPago: Number(o.valor_total) || 0,
                    dataServico: o.created_at,
                    mesesAtras,
                    diasAtras: diffDias,
                    marcaId: o.marca_id,
                    marcaNome: o.marcas?.nome || 'Desentupidora Hidro Curitiba',
                    marcaCor: o.marcas?.cor_tema || '#10b981',
                    descricaoOriginal: o.descricao_servico || cat.nome
                })
            })

            const listaFinal = Array.from(clientesAgrupados.values())
                .sort((a, b) => b.mesesAtras - a.mesesAtras)

            setReactivationList(listaFinal)
        } catch (e) {
            console.error('Erro ao carregar clientes para reativação:', e)
            toast.error('Erro ao carregar lista de reativação.')
        } finally {
            setLoadingReactivation(false)
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    // Helper para exibir o indicador de tendência comparativo com período anterior
    const renderTrend = (current: number, previous: number, format: 'currency' | 'count' | 'percent' = 'currency', invertColors: boolean = false) => {
        if (!prevDateRange) return null
        if (!previous || previous <= 0) {
            if (current > 0) {
                return (
                    <span className="inline-flex items-center text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                        ▲ Novo
                    </span>
                )
            }
            return <span className="text-[10px] font-medium text-slate-400">—</span>
        }
        const diff = current - previous
        const pct = (diff / previous) * 100
        const isUp = pct > 0
        const isNeutral = Math.abs(pct) < 0.1

        if (isNeutral) {
            return <span className="inline-flex items-center text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">= 0%</span>
        }

        const positiveColor = invertColors ? "text-rose-700 bg-rose-100/90" : "text-emerald-700 bg-emerald-100/90"
        const negativeColor = invertColors ? "text-emerald-700 bg-emerald-100/90" : "text-rose-700 bg-rose-100/90"

        const prevFormatted = format === 'currency' 
            ? formatCurrency(previous) 
            : format === 'percent' 
                ? `${previous.toFixed(1)}%` 
                : `${previous}`

        return (
            <span 
                className={cn(
                    "inline-flex items-center gap-0.5 text-[11px] font-black px-1.5 py-0.5 rounded-md shadow-xs cursor-help",
                    isUp ? positiveColor : negativeColor
                )}
                title={`Período anterior: ${prevFormatted} (${isUp ? '+' : ''}${format === 'currency' ? formatCurrency(diff) : diff})`}
            >
                {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
            </span>
        )
    }

    // ==========================================
    // 1. DRE & LUCRO LÍQUIDO REAL
    // ==========================================
    const dreData = useMemo(() => {
        const completedOrders = orders.filter(o => 
            ['concluido', 'concluído'].includes(o.status?.toLowerCase() || '')
        )
        const receitaBruta = completedOrders.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0)
        const comissoesTecnicos = receitaBruta * 0.5
        const despesasEmpresa = expenses.reduce((sum, e) => sum + (Number(e.valor) || 0), 0)

        const filtrandoFilial = !!selectedBrandId && selectedBrandId !== 'all'
        const receitaTodasFiliais = allOrders
            .filter(o => ['concluido', 'concluído'].includes(o.status?.toLowerCase() || ''))
            .reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0)
        const fatiaFilial = !filtrandoFilial ? 1 : (receitaTodasFiliais > 0 ? receitaBruta / receitaTodasFiliais : 0)
        const custosOperacionais = despesasEmpresa * fatiaFilial
        
        const lucroLiquido = receitaBruta - comissoesTecnicos - custosOperacionais
        const margemLucro = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

        // Período anterior
        const prevCompleted = prevOrders.filter(o => ['concluido', 'concluído'].includes(o.status?.toLowerCase() || ''))
        const prevReceitaBruta = prevCompleted.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0)
        const prevComissoes = prevReceitaBruta * 0.5
        const prevTotalOs = prevCompleted.length
        const prevTicketMedio = prevTotalOs > 0 ? prevReceitaBruta / prevTotalOs : 0
        const prevLucroLiquido = prevReceitaBruta - prevComissoes // base de lucro

        // Quebra por Marca / Filial
        const montarLinha = (base: { id: string, nome: string, cor_tema?: string | null }, brandOrders: any[]) => {
            const brandReceita = brandOrders.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0)
            const brandComissoes = brandReceita * 0.5
            const participacao = receitaBruta > 0 ? brandReceita / receitaBruta : 0
            const brandDespesas = custosOperacionais * participacao
            const brandLucro = brandReceita - brandComissoes - brandDespesas
            return {
                ...base,
                qtdOs: brandOrders.length,
                receita: brandReceita,
                comissoes: brandComissoes,
                despesas: brandDespesas,
                lucroLiquido: brandLucro,
                participacao: participacao * 100
            }
        }

        const marcasBreakdown = brands
            .map(b => montarLinha(b, completedOrders.filter(o => o.marca_id === b.id)))
            .filter(b => b.receita > 0 || b.qtdOs > 0)

        const idsMarcas = new Set(brands.map(b => b.id))
        const semMarca = completedOrders.filter(o => !o.marca_id || !idsMarcas.has(o.marca_id))
        if (semMarca.length > 0) {
            marcasBreakdown.push(montarLinha({ id: 'sem_marca', nome: 'Sem filial definida', cor_tema: '#94a3b8' }, semMarca))
        }

        return {
            receitaBruta,
            comissoesTecnicos,
            custosOperacionais,
            lucroLiquido,
            margemLucro,
            totalOsConcluidas: completedOrders.length,
            ticketMedio: completedOrders.length > 0 ? receitaBruta / completedOrders.length : 0,
            marcasBreakdown,
            filtrandoFilial,
            despesasEmpresa,
            fatiaFilial,
            // Métricas anteriores
            prevReceitaBruta,
            prevComissoes,
            prevTotalOs,
            prevTicketMedio,
            prevLucroLiquido
        }
    }, [orders, prevOrders, allOrders, expenses, brands, selectedBrandId])

    // ==========================================
    // 2. FISCAL & CONTÁBIL (NFS-e)
    // ==========================================
    const fiscalData = useMemo(() => {
        const nfseOrders = orders.filter(o => o.nfe_numero || o.nfe_status)
        const autorizadas = nfseOrders.filter(o => 
            ['autorizado', 'autorizada'].includes(o.nfe_status?.toLowerCase() || '')
        )
        const totalFaturadoNfse = autorizadas.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0)
        const issAproximado = totalFaturadoNfse * 0.02 // 2% ISS Mandirituba

        return {
            totalEmitidas: autorizadas.length,
            totalFaturadoNfse,
            issAproximado,
            lista: nfseOrders
        }
    }, [orders])

    // ==========================================
    // 3. COMISSÕES & DESEMPENHO DOS TÉCNICOS
    // ==========================================
    const teamData = useMemo(() => {
        const completed = orders.filter(o => 
            ['concluido', 'concluído'].includes(o.status?.toLowerCase() || '')
        )

        return technicians.map(t => {
            const techOrders = completed.filter(o => o.tecnico_id === t.id)
            const faturamentoGerado = techOrders.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0)
            const comissaoTotal = faturamentoGerado * 0.5
            const ticketMedio = techOrders.length > 0 ? faturamentoGerado / techOrders.length : 0

            return {
                id: t.id,
                nome: t.nome_completo || t.nome,
                osCount: techOrders.length,
                faturamentoGerado,
                comissaoTotal,
                ticketMedio
            }
        }).filter(t => t.osCount > 0 || t.faturamentoGerado > 0)
          .sort((a, b) => b.faturamentoGerado - a.faturamentoGerado)
    }, [orders, technicians])

    // ==========================================
    // 4. NÃO FEITOS & PERDA DE RECEITA
    // ==========================================
    const unfinishedData = useMemo(() => {
        const statusDe = (o: any) => (o.status || '').toLowerCase()
        const motivosPorStatus: Record<string, string> = {
            orcamento: 'Somente Orçamento',
            nao_feito_cancelado: 'Cancelado pelo Cliente',
            nao_feito_outra_empresa: 'Fechou com Outra Empresa',
            nao_feito_ja_realizado: 'Já Realizado'
        }

        const naoFeitos = orders.filter(o => statusDe(o) in motivosPorStatus)
        const concluidos = orders.filter(o => ['concluido', 'concluído'].includes(statusDe(o)))

        const totalPerdido = naoFeitos.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0)
        const totalDecididos = concluidos.length + naoFeitos.length
        const taxaConversao = totalDecididos > 0 ? (concluidos.length / totalDecididos) * 100 : 0

        const motivosMap = new Map<string, { count: number, valor: number }>()
        naoFeitos.forEach(o => {
            const motivo = motivosPorStatus[statusDe(o)]
            const prev = motivosMap.get(motivo) || { count: 0, valor: 0 }
            motivosMap.set(motivo, {
                count: prev.count + 1,
                valor: prev.valor + (Number(o.valor_total) || 0)
            })
        })

        return {
            quantidade: naoFeitos.length,
            totalPerdido,
            taxaConversao,
            motivos: Array.from(motivosMap.entries()).map(([motivo, data]) => ({ motivo, ...data })),
            lista: naoFeitos
        }
    }, [orders])

    // ==========================================
    // 5. FATURAMENTO POR TIPO DE SERVIÇO & GOOGLE ADS
    // ==========================================
    const servicesData = useMemo(() => {
        const completed = orders.filter(o => 
            ['concluido', 'concluído'].includes(o.status?.toLowerCase() || '')
        )
        const receitaTotal = completed.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0)

        const mapCategorias = new Map<string, {
            meta: ServiceCategoryMeta
            count: number
            receita: number
            orders: any[]
        }>()

        completed.forEach(o => {
            const meta = categorizarServico(o.descricao_servico, o.itens)
            const valor = Number(o.valor_total) || 0

            const prev = mapCategorias.get(meta.id) || { meta, count: 0, receita: 0, orders: [] }
            prev.count += 1
            prev.receita += valor
            prev.orders.push(o)
            mapCategorias.set(meta.id, prev)
        })

        const categoriasList = Array.from(mapCategorias.values())
            .map(item => ({
                id: item.meta.id,
                nome: item.meta.nome,
                icone: item.meta.icone,
                cor: item.meta.cor,
                bgLight: item.meta.bgLight,
                border: item.meta.border,
                googleAds: item.meta.googleAds,
                badgeAds: item.meta.badgeAds,
                dicaAds: item.meta.dicaAds,
                count: item.count,
                receita: item.receita,
                ticketMedio: item.count > 0 ? item.receita / item.count : 0,
                participacao: receitaTotal > 0 ? (item.receita / receitaTotal) * 100 : 0
            }))
            .sort((a, b) => b.receita - a.receita)

        const campeaoReceita = categoriasList[0] || null
        const maiorTicket = [...categoriasList].sort((a, b) => b.ticketMedio - a.ticketMedio)[0] || null
        const maiorVolume = [...categoriasList].sort((a, b) => b.count - a.count)[0] || null

        return {
            categorias: categoriasList,
            totalOs: completed.length,
            receitaTotal,
            campeaoReceita,
            maiorTicket,
            maiorVolume
        }
    }, [orders])

    // ==========================================
    // 6. INTELIGÊNCIA GEOGRÁFICA (BAIRROS)
    // ==========================================
    const geoData = useMemo(() => {
        const completed = orders.filter(o => 
            ['concluido', 'concluído'].includes(o.status?.toLowerCase() || '')
        )

        const bairroMap = new Map<string, { count: number, total: number, cidade: string }>()

        completed.forEach(o => {
            const bairro = o.clientes?.bairro?.trim() || 'Não Informado'
            const cidade = o.clientes?.cidade?.trim() || 'Curitiba'
            const valor = Number(o.valor_total) || 0

            const prev = bairroMap.get(bairro) || { count: 0, total: 0, cidade }
            bairroMap.set(bairro, {
                count: prev.count + 1,
                total: prev.total + valor,
                cidade: prev.cidade || cidade
            })
        })

        return Array.from(bairroMap.entries())
            .map(([bairro, data]) => ({
                bairro,
                cidade: data.cidade,
                count: data.count,
                total: data.total,
                ticketMedio: data.count > 0 ? data.total / data.count : 0
            }))
            .sort((a, b) => b.total - a.total)
    }, [orders])

    // ==========================================
    // 7. CLIENTES PARA REATIVAÇÃO (FILTRADOS)
    // ==========================================
    const filteredReactivationList = useMemo(() => {
        return reactivationList.filter(c => {
            if (reactivationFilter === 'fossa' && c.tipoServico !== 'limpa_fossa') return false
            if (reactivationFilter === 'gordura' && c.tipoServico !== 'caixa_gordura') return false

            if (reactivationSearch.trim()) {
                const q = reactivationSearch.toLowerCase()
                const matchNome = (c.clienteNome || '').toLowerCase().includes(q)
                const matchFone = (c.clienteWhatsapp || '').includes(q)
                const matchBairro = (c.bairro || '').toLowerCase().includes(q)
                if (!matchNome && !matchFone && !matchBairro) return false
            }

            return true
        })
    }, [reactivationList, reactivationFilter, reactivationSearch])

    const reactivationStats = useMemo(() => {
        const total = filteredReactivationList.length
        const receitaPotencial = filteredReactivationList.reduce((sum, c) => sum + (c.valorPago || 0), 0)
        const ticketMedio = total > 0 ? receitaPotencial / total : 0
        const qtdFossa = reactivationList.filter(c => c.tipoServico === 'limpa_fossa').length
        const qtdGordura = reactivationList.filter(c => c.tipoServico === 'caixa_gordura').length

        return { total, receitaPotencial, ticketMedio, qtdFossa, qtdGordura }
    }, [filteredReactivationList, reactivationList])

    // ==========================================
    // EXPORTAÇÕES (CSV E PDF)
    // ==========================================
    const handlePrint = () => {
        window.print()
    }

    const handleDownloadPdf = async () => {
        const reportElement = document.getElementById('report-main-content')
        if (!reportElement) {
            window.print()
            return
        }

        setDownloadingPdf(true)
        const toastId = toast.loading('Gerando arquivo PDF dos relatórios...')

        try {
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = pdf.internal.pageSize.getHeight()
            const imgWidth = pdfWidth
            const imgHeight = (canvas.height * pdfWidth) / canvas.width
            
            let heightLeft = imgHeight
            let position = 0

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
            heightLeft -= pdfHeight

            while (heightLeft > 0) {
                position = heightLeft - imgHeight
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
                heightLeft -= pdfHeight
            }

            const brandNameClean = (selectedBrand ? selectedBrand.nome : 'FlowDrain').replace(/\s+/g, '_')
            const tabName = activeTab.toUpperCase()
            const filename = `Relatorio_${brandNameClean}_${tabName}_${new Date().toISOString().split('T')[0]}.pdf`

            pdf.save(filename)
            toast.success(`PDF salvo com sucesso: ${filename}`, { id: toastId })
        } catch (err) {
            console.error('Erro ao gerar PDF:', err)
            toast.error('Erro na exportação automática. Abrindo janela de impressão...', { id: toastId })
            window.print()
        } finally {
            setDownloadingPdf(false)
        }
    }

    const exportCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
        const csvContent = "data:text/csv;charset=utf-8," + 
            [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
        
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success(`Relatório baixado em CSV com sucesso!`)
    }

    // Gerador de mensagem WhatsApp para reativação de clientes
    const getReactivationWhatsappLink = (client: any) => {
        let fone = (client.clienteWhatsapp || '').replace(/\D/g, '')
        if (fone.length === 8 || fone.length === 9) fone = '41' + fone
        if (fone.length === 10 || fone.length === 11) fone = '55' + fone

        const primeiroNome = (client.clienteNome || 'Cliente').trim().split(' ')[0]
        const empresaNome = client.marcaNome || 'nossa equipe'
        const servicoDesc = client.tipoServico === 'limpa_fossa' ? 'esgotamento da sua fossa séptica' : 'limpeza da sua caixa de gordura'

        const texto = `Olá ${primeiroNome}, tudo bem? Aqui é da equipe ${empresaNome}.

Verificamos em nosso histórico que realizamos o serviço de ${servicoDesc} no seu imóvel há cerca de ${client.mesesAtras} meses (${formatDate(client.dataServico)}).

A recomendação técnica e preventiva é realizar a manutenção periódica para evitar transbordamento, entupimento da rede e mau cheiro.

Gostaria de agendar uma revisão preventiva com nossa equipe com uma condição especial esta semana?`

        return `https://wa.me/${fone}?text=${encodeURIComponent(texto)}`
    }

    return (
        <div id="report-main-content" className="space-y-6 pb-24 md:pb-12 max-w-7xl mx-auto p-4 md:p-6 print:p-0 print:space-y-4">
            {/* Header da Tela */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 print:border-b-2 print:border-slate-800">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl print:hidden">
                            <TrendingUp className="h-6 w-6" />
                        </span>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                                Central de Relatórios
                            </h1>
                            <p className="text-sm text-slate-500 font-medium">
                                Auditoria de Lucro Líquido, Tipos de Serviço, NFS-e, Comissões e Reativação de Clientes
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filtros e Ações */}
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                    {/* Seletor de Período (aplicável aos relatórios de período) */}
                    {activeTab !== 'reativacao' && (
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
                            <Calendar className="h-4 w-4 text-slate-400 ml-2" />
                            <select 
                                value={period} 
                                onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                                className="text-xs font-bold text-slate-700 bg-transparent pr-2 py-1.5 outline-none cursor-pointer"
                            >
                                <option value="30d">Últimos 30 Dias</option>
                                <option value="15d_1">1ª Quinzena (01 a 15)</option>
                                <option value="15d_2">2ª Quinzena (16 ao Fim)</option>
                                <option value="mes_atual">Este Mês</option>
                                <option value="mes_anterior">Mês Anterior</option>
                                <option value="90d">Últimos 90 Dias</option>
                                <option value="ano">Ano Atual ({new Date().getFullYear()})</option>
                                <option value="tudo">Todo o Histórico</option>
                                <option value="custom">Personalizado por Data</option>
                            </select>
                        </div>
                    )}

                    {period === 'custom' && activeTab !== 'reativacao' && (
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="text-xs font-bold text-slate-700 px-2 py-1 outline-none rounded-lg bg-slate-50"
                                title="Data Inicial"
                            />
                            <span className="text-xs text-slate-400">até</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="text-xs font-bold text-slate-700 px-2 py-1 outline-none rounded-lg bg-slate-50"
                                title="Data Final"
                            />
                        </div>
                    )}

                    {/* Botão Baixar PDF no PC */}
                    <Button 
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 h-9"
                    >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingPdf ? 'Gerando...' : 'Baixar PDF'}
                    </Button>

                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handlePrint}
                        className="rounded-xl border-slate-200 bg-white font-bold text-xs flex items-center gap-1.5 h-9"
                    >
                        <Printer className="h-3.5 w-3.5 text-slate-500" />
                        Imprimir
                    </Button>
                </div>
            </div>

            {/* Cabeçalho exclusivo para Impressão */}
            <div className="hidden print:block text-center pb-4 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">
                    {selectedBrand ? selectedBrand.nome : 'FlowDrain - Gestão de Desentupidoras'}
                </h2>
                <p className="text-xs text-slate-500">
                    Relatório emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                </p>
            </div>

            {/* Seletor de relatório: menu no computador, gaveta de baixo no celular */}
            {(() => {
                const opcoes: { valor: ReportTab | "tecnicos", titulo: string, descricao: string, icone: typeof DollarSign, cor: string }[] = [
                    { valor: "dre", titulo: "DRE & Lucro Líquido", descricao: "Faturamento, comissões, despesas e lucro", icone: DollarSign, cor: "bg-emerald-600" },
                    { valor: "fiscal", titulo: "Fiscal & NFS-e", descricao: "Notas fiscais emitidas e ISS", icone: Receipt, cor: "bg-purple-600" },
                    { valor: "comissoes", titulo: "Comissões da Equipe", descricao: "Produção e comissão por técnico", icone: Users, cor: "bg-blue-600" },
                    { valor: "nao_feitos", titulo: "Não Feitos & Perdas", descricao: "Orçamentos perdidos e cancelamentos", icone: AlertTriangle, cor: "bg-rose-600" },
                    { valor: "servicos", titulo: "Tipos de Serviço & Google Ads", descricao: "Volume e ticket por tipo de serviço", icone: Wrench, cor: "bg-cyan-600" },
                    { valor: "geografico", titulo: "Bairros & Regiões", descricao: "Onde você mais fatura", icone: MapPin, cor: "bg-amber-500" },
                    { valor: "reativacao", titulo: "Reativação de Clientes", descricao: "Fossa e gordura: hora de voltar a atender", icone: Clock, cor: "bg-teal-600" },
                    { valor: "tecnicos", titulo: "Relatórios Técnicos", descricao: "Laudos formais para entregar ao cliente", icone: ClipboardCheck, cor: "bg-[#0f2a47]" }
                ]
                const atual = opcoes.find(o => o.valor === activeTab) || opcoes[0]
                const IconeAtual = atual.icone
                const escolher = (v: ReportTab | "tecnicos") => {
                    setSeletorAberto(false)
                    if (v === "tecnicos") navigate("/relatorios-tecnicos")
                    else handleTabChange(v)
                }
                const itens = opcoes.map(o => {
                    const Icone = o.icone
                    const ativo = o.valor === atual.valor
                    return (
                        <button
                            key={o.valor}
                            type="button"
                            role="option"
                            aria-selected={ativo}
                            onClick={() => escolher(o.valor)}
                            className={cn("w-full flex items-center gap-3 rounded-xl px-2 py-2 md:px-2.5 md:py-2.5 text-left transition-colors", ativo ? "bg-slate-100" : "hover:bg-slate-50")}
                        >
                            <span className={cn("w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-white shrink-0", o.cor)}>
                                <Icone className="h-4 w-4 md:h-5 md:w-5" />
                            </span>
                            <span className="flex flex-col min-w-0 flex-1">
                                <span className="font-bold text-sm text-slate-800">{o.titulo}</span>
                                <span className="text-[11px] md:text-xs text-slate-500 truncate">{o.descricao}</span>
                            </span>
                            {ativo ? <Check className="h-5 w-5 text-emerald-600 shrink-0" /> : null}
                        </button>
                    )
                })
                return (
                    <div className="relative print:hidden md:max-w-md" onKeyDown={e => { if (e.key === "Escape") setSeletorAberto(false) }}>
                        <button
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={seletorAberto}
                            onClick={() => setSeletorAberto(a => !a)}
                            className={cn(
                                "w-full flex items-center gap-2.5 bg-white border rounded-xl md:rounded-2xl shadow-xs pl-1.5 pr-2.5 py-1.5 md:pl-2.5 md:pr-3 md:py-2 text-left transition-colors",
                                seletorAberto ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <span className={cn("w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm", atual.cor)}>
                                <IconeAtual className="h-4 w-4 md:h-5 md:w-5" />
                            </span>
                            <span className="flex flex-col min-w-0 flex-1">
                                <span className="hidden md:block text-[10px] font-bold uppercase tracking-wider text-slate-400">Relatório</span>
                                <span className="font-extrabold text-sm text-slate-800 truncate">{atual.titulo}</span>
                            </span>
                            <ChevronDown className={cn("h-5 w-5 text-slate-400 shrink-0 transition-transform", seletorAberto && "rotate-180")} />
                        </button>

                        {seletorAberto ? (
                            <>
                                {/* Celular: gaveta de baixo, desenhada na raiz da página para ficar acima da barra inferior e dos botões flutuantes */}
                                {createPortal(
                                    <div className="md:hidden">
                                        <div className="fixed inset-0 z-[9998] bg-slate-900/40" onClick={() => setSeletorAberto(false)} />
                                        <div role="listbox" className="fixed inset-x-0 bottom-0 z-[9999] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-3 pb-8 shadow-2xl">
                                            <div className="mx-auto mb-3 mt-1 h-1.5 w-10 rounded-full bg-slate-200" />
                                            <div className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Escolha o relatório</div>
                                            {itens}
                                        </div>
                                    </div>,
                                    document.body
                                )}
                                {/* Computador: menu logo abaixo do botão */}
                                <div className="hidden md:block">
                                    <div className="fixed inset-0 z-40" onClick={() => setSeletorAberto(false)} />
                                    <div role="listbox" className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                                        {itens}
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                )
            })()}

            {/* Conteúdo Dinâmico por Aba */}
            {loading && activeTab !== 'reativacao' ? (
                <div className="p-16 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-100">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3" />
                    Calculando dados e consolidando métricas...
                </div>
            ) : (
                <>
                    {/* ======================================================== */}
                    {/* RELATÓRIO 1: DRE & LUCRO LÍQUIDO REAL                   */}
                    {/* ======================================================== */}
                    {activeTab === 'dre' && (
                        <div className="space-y-6">
                            {/* Cards de DRE com Comparativo de Período Anterior ▲ ▼ */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Faturamento Bruto</p>
                                        {renderTrend(dreData.receitaBruta, dreData.prevReceitaBruta, 'currency')}
                                    </div>
                                    <p className="text-2xl font-black text-slate-800 mt-2">{formatCurrency(dreData.receitaBruta)}</p>
                                    <div className="flex items-center justify-between text-[11px] text-emerald-600 font-semibold mt-1">
                                        <span>{dreData.totalOsConcluidas} ordens concluídas</span>
                                        {renderTrend(dreData.totalOsConcluidas, dreData.prevTotalOs, 'count')}
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">(-) Comissões Técnicos (50%)</p>
                                        {renderTrend(dreData.comissoesTecnicos, dreData.prevComissoes, 'currency', true)}
                                    </div>
                                    <p className="text-2xl font-black text-rose-600 mt-2">- {formatCurrency(dreData.comissoesTecnicos)}</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Repasse operacional aos técnicos</p>
                                </div>

                                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">(-) Despesas Operacionais</p>
                                    </div>
                                    <p className="text-2xl font-black text-amber-600 mt-2">- {formatCurrency(dreData.custosOperacionais)}</p>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {dreData.filtrandoFilial
                                            ? `Rateio ${(dreData.fatiaFilial * 100).toFixed(1)}% de ${formatCurrency(dreData.despesasEmpresa)} da empresa`
                                            : 'Combustível, veículos e peças'}
                                    </p>
                                </div>

                                <div className="bg-emerald-500 text-white p-5 rounded-3xl shadow-lg shadow-emerald-500/20">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-emerald-100 font-bold uppercase tracking-wide">(=) Lucro Líquido</p>
                                        {renderTrend(dreData.lucroLiquido, dreData.prevLucroLiquido, 'currency')}
                                    </div>
                                    <p className="text-2xl font-black text-white mt-2">{formatCurrency(dreData.lucroLiquido)}</p>
                                    <div className="flex items-center justify-between text-[11px] text-emerald-100 font-bold mt-1">
                                        <span>Margem: {dreData.margemLucro.toFixed(1)}%</span>
                                        <span>Ticket: {formatCurrency(dreData.ticketMedio)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tabela de DRE Consolidado por Empresa / Filial */}
                            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-base">Demonstrativo por Filial / Marca</h3>
                                        <p className="text-xs text-slate-400">Apuração de faturamento e lucro líquido de cada desentupidora</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => exportCsv(
                                            'dre_por_filial',
                                            ['Empresa', 'Atendimentos', 'Faturamento Bruto', 'Comissoes', 'Despesas (rateio)', 'Lucro Liquido', 'Participacao'],
                                            dreData.marcasBreakdown.map(b => [
                                                b.nome,
                                                b.qtdOs,
                                                b.receita,
                                                b.comissoes,
                                                b.despesas,
                                                b.lucroLiquido,
                                                `${b.participacao.toFixed(1)}%`
                                            ])
                                        )}
                                        className="rounded-xl border-slate-200 text-xs font-bold gap-1 print:hidden"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Exportar CSV
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                                            <tr>
                                                <th className="p-4">Empresa / Filial</th>
                                                <th className="p-4 text-center">Atendimentos</th>
                                                <th className="p-4 text-right">Faturamento Bruto</th>
                                                <th className="p-4 text-right">Comissões (50%)</th>
                                                <th className="p-4 text-right">Despesas (rateio)</th>
                                                <th className="p-4 text-right">Lucro Líquido</th>
                                                <th className="p-4 text-center">Participação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {dreData.marcasBreakdown.map(b => (
                                                <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="p-4 flex items-center gap-2">
                                                        <span 
                                                            className="w-3 h-3 rounded-full shrink-0" 
                                                            style={{ backgroundColor: b.cor_tema || '#10b981' }} 
                                                        />
                                                        <span className="font-bold text-slate-800">{b.nome}</span>
                                                    </td>
                                                    <td className="p-4 text-center font-bold text-slate-700">{b.qtdOs}</td>
                                                    <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(b.receita)}</td>
                                                    <td className="p-4 text-right text-rose-600 font-semibold">- {formatCurrency(b.comissoes)}</td>
                                                    <td className="p-4 text-right text-amber-600 font-semibold">- {formatCurrency(b.despesas)}</td>
                                                    <td className="p-4 text-right font-extrabold text-emerald-600">{formatCurrency(b.lucroLiquido)}</td>
                                                    <td className="p-4 text-center">
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-[10px] text-slate-600">
                                                            {b.participacao.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {dreData.marcasBreakdown.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="p-8 text-center text-slate-400">
                                                        Nenhuma ordem concluída no período selecionado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* RELATÓRIO 2: FISCAL & CONTÁBIL (NFS-e)                  */}
                    {/* ======================================================== */}
                    {activeTab === 'fiscal' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Notas Autorizadas</p>
                                    <p className="text-2xl font-black text-slate-800 mt-1">{fiscalData.totalEmitidas}</p>
                                    <p className="text-[11px] text-purple-600 font-semibold mt-1">Prefeitura de Mandirituba (Betha)</p>
                                </div>

                                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Faturamento Fiscal Total</p>
                                    <p className="text-2xl font-black text-purple-700 mt-1">{formatCurrency(fiscalData.totalFaturadoNfse)}</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Base tributável oficial</p>
                                </div>

                                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">ISS Municipal (2%)</p>
                                    <p className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(fiscalData.issAproximado)}</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Alíquota relativa Simples Nacional</p>
                                </div>
                            </div>

                            {/* Tabela de Notas Fiscais Emitidas */}
                            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-base">Livro Fiscal de NFS-e Emitidas</h3>
                                        <p className="text-xs text-slate-400">Relatório pronto para envio à contabilidade com DANFSe oficial</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => exportCsv(
                                            'livro_fiscal_nfse',
                                            ['Data', 'NFS-e', 'Cliente', 'CPF/CNPJ', 'Valor', 'Status', 'Ref'],
                                            fiscalData.lista.map(o => [
                                                formatDate(o.created_at),
                                                o.nfe_numero || '-',
                                                o.cliente_nome || '-',
                                                o.clientes?.cpf_cnpj || '-',
                                                o.valor_total || 0,
                                                o.nfe_status || '-',
                                                o.nfe_ref || '-'
                                            ])
                                        )}
                                        className="rounded-xl border-slate-200 text-xs font-bold gap-1 print:hidden"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Exportar Livro Fiscal (CSV)
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                                            <tr>
                                                <th className="p-4">Emissão</th>
                                                <th className="p-4">Número NFS-e</th>
                                                <th className="p-4">Tomador / Cliente</th>
                                                <th className="p-4">CPF / CNPJ</th>
                                                <th className="p-4 text-right">Valor Total</th>
                                                <th className="p-4 text-center">Status</th>
                                                <th className="p-4 text-center print:hidden">DANFSe</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {fiscalData.lista.map(o => (
                                                <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="p-4 text-slate-600">{formatDate(o.created_at)}</td>
                                                    <td className="p-4 font-bold text-slate-800">
                                                        {o.nfe_numero ? `Nº ${o.nfe_numero}` : '-'}
                                                    </td>
                                                    <td className="p-4 font-bold text-slate-800">{o.cliente_nome || '-'}</td>
                                                    <td className="p-4 text-slate-500">{o.clientes?.cpf_cnpj || '-'}</td>
                                                    <td className="p-4 text-right font-extrabold text-slate-800">{formatCurrency(Number(o.valor_total))}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full font-bold text-[10px]",
                                                            ['autorizado', 'autorizada'].includes(o.nfe_status?.toLowerCase() || '')
                                                                ? "bg-purple-100 text-purple-700"
                                                                : o.nfe_status === 'cancelado'
                                                                    ? "bg-slate-100 text-slate-500"
                                                                    : "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {o.nfe_status || 'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center print:hidden">
                                                        {(o.nfe_pdf_url || o.nfe_url_pdf) ? (
                                                            <a 
                                                                href={o.nfe_pdf_url || o.nfe_url_pdf} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors"
                                                            >
                                                                <FileText className="h-3 w-3" />
                                                                PDF
                                                            </a>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {fiscalData.lista.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="p-8 text-center text-slate-400">
                                                        Nenhuma NFS-e encontrada no período selecionado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* RELATÓRIO 3: COMISSÕES DA EQUIPE                        */}
                    {/* ======================================================== */}
                    {activeTab === 'comissoes' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-base">Comissões da Equipe (50%)</h3>
                                        <p className="text-xs text-slate-400">Faturamento gerado e comissões apuradas por técnico parceiro</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => exportCsv(
                                            'comissoes_equipe',
                                            ['Tecnico', 'Atendimentos', 'Faturamento Gerado', 'Comissao (50%)', 'Ticket Medio'],
                                            teamData.map(t => [
                                                t.nome,
                                                t.osCount,
                                                t.faturamentoGerado,
                                                t.comissaoTotal,
                                                t.ticketMedio
                                            ])
                                        )}
                                        className="rounded-xl border-slate-200 text-xs font-bold gap-1 print:hidden"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Exportar CSV
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                                            <tr>
                                                <th className="p-4">Técnico Parceiro</th>
                                                <th className="p-4 text-center">Atendimentos</th>
                                                <th className="p-4 text-right">Faturamento Gerado</th>
                                                <th className="p-4 text-right">Comissão (50%)</th>
                                                <th className="p-4 text-right">Ticket Médio</th>
                                                <th className="p-4 text-center print:hidden">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {teamData.map(t => (
                                                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="p-4 font-bold text-slate-800">{t.nome}</td>
                                                    <td className="p-4 text-center font-bold text-slate-700">{t.osCount}</td>
                                                    <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(t.faturamentoGerado)}</td>
                                                    <td className="p-4 text-right font-extrabold text-blue-600">{formatCurrency(t.comissaoTotal)}</td>
                                                    <td className="p-4 text-right text-slate-600">{formatCurrency(t.ticketMedio)}</td>
                                                    <td className="p-4 text-center print:hidden">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => navigate(`/print/comissoes/${t.id}`)}
                                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        >
                                                            Extrato
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {teamData.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                                        Nenhuma comissão apurada no período.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* RELATÓRIO 4: NÃO FEITOS & PERDAS                         */}
                    {/* ======================================================== */}
                    {activeTab === 'nao_feitos' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Serviços Não Feitos</p>
                                    <p className="text-2xl font-black text-rose-600 mt-1">{unfinishedData.quantidade}</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Orçamentos e cancelados</p>
                                </div>

                                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Valor Potencial Perdido</p>
                                    <p className="text-2xl font-black text-rose-600 mt-1">{formatCurrency(unfinishedData.totalPerdido)}</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Deixou de entrar no caixa</p>
                                </div>

                                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Taxa de Conversão</p>
                                    <p className="text-2xl font-black text-emerald-600 mt-1">{unfinishedData.taxaConversao.toFixed(1)}%</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Concluídos ÷ (concluídos + não feitos)</p>
                                </div>
                            </div>

                            {/* Tabela de Motivos de Cancelamento */}
                            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-base">Diagnóstico de Motivos de Cancelamento</h3>
                                        <p className="text-xs text-slate-400">Entenda por que os clientes não fecharam o serviço</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => exportCsv(
                                            'perda_receita_detalhado',
                                            ['Data', 'Cliente', 'Telefone', 'Tecnico', 'Status', 'Valor Potencial', 'Descricao'],
                                            unfinishedData.lista.map(o => [
                                                formatDate(o.created_at),
                                                o.cliente_nome || '-',
                                                o.clientes?.whatsapp || '-',
                                                o.tecnicos?.nome_completo || '-',
                                                o.status,
                                                o.valor_total || 0,
                                                o.descricao_servico || '-'
                                            ])
                                        )}
                                        className="rounded-xl border-slate-200 text-xs font-bold gap-1 print:hidden"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Exportar Detalhes (CSV)
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                                            <tr>
                                                <th className="p-4">Motivo / Situação</th>
                                                <th className="p-4 text-center">Quantidade</th>
                                                <th className="p-4 text-right">Valor Potencial Perdido</th>
                                                <th className="p-4 text-center">% do Total Perdido</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {unfinishedData.motivos.map(m => (
                                                <tr key={m.motivo} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="p-4 font-bold text-slate-800">{m.motivo}</td>
                                                    <td className="p-4 text-center font-bold text-slate-700">{m.count}</td>
                                                    <td className="p-4 text-right font-bold text-rose-600">{formatCurrency(m.valor)}</td>
                                                    <td className="p-4 text-center">
                                                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px]">
                                                            {unfinishedData.totalPerdido > 0 
                                                                ? ((m.valor / unfinishedData.totalPerdido) * 100).toFixed(1) 
                                                                : 0}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {unfinishedData.motivos.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-slate-400">
                                                        Nenhum serviço cancelado ou não realizado no período.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* RELATÓRIO 5: FATURAMENTO POR TIPO DE SERVIÇO & GOOGLE ADS*/}
                    {/* ======================================================== */}
                    {activeTab === 'servicos' && (
                        <div className="space-y-6">
                            {/* Destaques Estratégicos */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-5 rounded-3xl shadow-lg shadow-cyan-500/20">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-cyan-100 uppercase tracking-wide">🏆 Campeão em Receita</span>
                                        <Award className="h-5 w-5 text-yellow-300" />
                                    </div>
                                    <p className="text-xl font-black text-white mt-2">
                                        {servicesData.campeaoReceita ? servicesData.campeaoReceita.nome : 'Sem dados'}
                                    </p>
                                    <div className="flex items-center justify-between mt-2 text-xs text-cyan-100 font-bold">
                                        <span>{servicesData.campeaoReceita ? formatCurrency(servicesData.campeaoReceita.receita) : 'R$ 0,00'}</span>
                                        <span>{servicesData.campeaoReceita ? `${servicesData.campeaoReceita.participacao.toFixed(1)}% do faturamento` : ''}</span>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">💎 Maior Ticket Médio</span>
                                        <DollarSign className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <p className="text-xl font-black text-slate-800 mt-2">
                                        {servicesData.maiorTicket ? servicesData.maiorTicket.nome : 'Sem dados'}
                                    </p>
                                    <div className="flex items-center justify-between mt-2 text-xs font-bold">
                                        <span className="text-emerald-600 text-base">{servicesData.maiorTicket ? formatCurrency(servicesData.maiorTicket.ticketMedio) : 'R$ 0,00'} / OS</span>
                                        <span className="text-slate-400 text-[11px]">{servicesData.maiorTicket?.count || 0} atendimentos</span>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">📦 Maior Volume de OS</span>
                                        <Wrench className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <p className="text-xl font-black text-slate-800 mt-2">
                                        {servicesData.maiorVolume ? servicesData.maiorVolume.nome : 'Sem dados'}
                                    </p>
                                    <div className="flex items-center justify-between mt-2 text-xs font-bold">
                                        <span className="text-blue-600 text-base">{servicesData.maiorVolume?.count || 0} ordens</span>
                                        <span className="text-slate-400 text-[11px]">Ticket: {servicesData.maiorVolume ? formatCurrency(servicesData.maiorVolume.ticketMedio) : 'R$ 0,00'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tabela de Faturamento por Categoria & Recomendação Google Ads */}
                            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-base">Faturamento por Tipo de Desentupimento</h3>
                                        <p className="text-xs text-slate-400">Descubra o que mais dá dinheiro, tickets médios e onde investir verba no Google Ads</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => exportCsv(
                                            'faturamento_por_tipo_servico',
                                            ['Tipo de Servico', 'Atendimentos', 'Faturamento Total', 'Ticket Medio', 'Participacao', 'Recomendacao Google Ads'],
                                            servicesData.categorias.map(c => [
                                                c.nome,
                                                c.count,
                                                c.receita,
                                                c.ticketMedio,
                                                `${c.participacao.toFixed(1)}%`,
                                                c.badgeAds
                                            ])
                                        )}
                                        className="rounded-xl border-slate-200 text-xs font-bold gap-1 print:hidden"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Exportar CSV
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                                            <tr>
                                                <th className="p-4">Tipo de Serviço</th>
                                                <th className="p-4 text-center">Atendimentos</th>
                                                <th className="p-4 text-right">Faturamento Total</th>
                                                <th className="p-4 text-right">Ticket Médio</th>
                                                <th className="p-4 text-center">Participação</th>
                                                <th className="p-4">Estratégia & Google Ads</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {servicesData.categorias.map(c => {
                                                const IconComponent = c.icone
                                                return (
                                                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={cn("p-2 rounded-xl", c.bgLight)}>
                                                                    <IconComponent className="h-4 w-4" style={{ color: c.cor }} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-extrabold text-slate-800 text-sm">{c.nome}</p>
                                                                    <p className="text-[11px] text-slate-400 font-normal line-clamp-1">{c.dicaAds}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center font-bold text-slate-700 text-sm">
                                                            {c.count}
                                                        </td>
                                                        <td className="p-4 text-right font-black text-slate-800 text-sm">
                                                            {formatCurrency(c.receita)}
                                                        </td>
                                                        <td className="p-4 text-right font-extrabold text-emerald-600 text-sm">
                                                            {formatCurrency(c.ticketMedio)}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="font-bold text-slate-700 text-xs">
                                                                    {c.participacao.toFixed(1)}%
                                                                </span>
                                                                <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                    <div 
                                                                        className="h-full rounded-full" 
                                                                        style={{ width: `${Math.min(100, c.participacao)}%`, backgroundColor: c.cor }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-xs",
                                                                c.googleAds === 'ALTA_PRIORIDADE'
                                                                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                                                                    : c.googleAds === 'MODERADA'
                                                                        ? "bg-blue-100 text-blue-900 border border-blue-200"
                                                                        : "bg-slate-100 text-slate-700 border border-slate-200"
                                                            )}>
                                                                {c.badgeAds}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                            {servicesData.categorias.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                                        Nenhuma ordem concluída no período selecionado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* RELATÓRIO 6: INTELIGÊNCIA GEOGRÁFICA (BAIRROS)           */}
                    {/* ======================================================== */}
                    {activeTab === 'geografico' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-base">Bairros e Regiões Mais Rentáveis</h3>
                                        <p className="text-xs text-slate-400">Mapeamento de demanda em Curitiba e RMC para direcionamento de anúncios</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => exportCsv(
                                            'bairros_mais_rentaveis',
                                            ['Bairro', 'Cidade', 'Atendimentos', 'Faturamento Total', 'Ticket Medio'],
                                            geoData.map(g => [
                                                g.bairro,
                                                g.cidade,
                                                g.count,
                                                g.total,
                                                g.ticketMedio
                                            ])
                                        )}
                                        className="rounded-xl border-slate-200 text-xs font-bold gap-1 print:hidden"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Exportar CSV
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                                            <tr>
                                                <th className="p-4">Bairro</th>
                                                <th className="p-4">Cidade</th>
                                                <th className="p-4 text-center">Atendimentos</th>
                                                <th className="p-4 text-right">Faturamento Total</th>
                                                <th className="p-4 text-right">Ticket Médio</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {geoData.slice(0, 30).map((g, idx) => (
                                                <tr key={`${g.bairro}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                                                        <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                        {g.bairro}
                                                    </td>
                                                    <td className="p-4 text-slate-600">{g.cidade}</td>
                                                    <td className="p-4 text-center font-bold text-slate-700">{g.count}</td>
                                                    <td className="p-4 text-right font-extrabold text-emerald-600">{formatCurrency(g.total)}</td>
                                                    <td className="p-4 text-right text-slate-700 font-semibold">{formatCurrency(g.ticketMedio)}</td>
                                                </tr>
                                            ))}
                                            {geoData.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                                        Nenhum dado geográfico de atendimento disponível no período.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* RELATÓRIO 7: REATIVAÇÃO (FOSSA & CAIXA DE GORDURA)       */}
                    {/* ======================================================== */}
                    {activeTab === 'reativacao' && (
                        <div className="space-y-6">
                            {/* Explicação e KPIs de Reativação */}
                            <div className="bg-gradient-to-r from-teal-900 to-emerald-950 text-white p-6 rounded-3xl shadow-xl shadow-teal-950/20">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="max-w-2xl">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 border border-teal-400/30 rounded-full text-xs font-bold text-teal-300 mb-2">
                                            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                                            CRM de Recorrência Preventiva (CAC R$ 0,00)
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                                            Clientes para Voltar a Atender (6 a 18 Meses)
                                        </h2>
                                        <p className="text-xs md:text-sm text-teal-100/80 mt-1">
                                            Todo restaurante, condomínio e residência precisa limpar a caixa de gordura ou esgotar a fossa a cada 6 meses.
                                            Aqui estão seus clientes que já estão na janela ideal de manutenção preventiva. É o serviço mais barato e rápido de fechar!
                                        </p>
                                    </div>

                                    <Button
                                        onClick={loadReactivationClients}
                                        disabled={loadingReactivation}
                                        variant="outline"
                                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl text-xs font-bold flex items-center gap-2 h-10 shrink-0"
                                    >
                                        <RefreshCw className={cn("h-4 w-4", loadingReactivation && "animate-spin")} />
                                        Atualizar Lista
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-teal-800/60">
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                        <p className="text-[11px] font-bold text-teal-200 uppercase tracking-wide">Clientes Prontos p/ Recall</p>
                                        <p className="text-3xl font-black text-white mt-1">{reactivationStats.total}</p>
                                        <p className="text-[11px] text-teal-300 mt-1">
                                            {reactivationStats.qtdGordura} caixas de gordura • {reactivationStats.qtdFossa} fossas
                                        </p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                        <p className="text-[11px] font-bold text-teal-200 uppercase tracking-wide">Receita Potencial na Mesa</p>
                                        <p className="text-3xl font-black text-emerald-400 mt-1">{formatCurrency(reactivationStats.receitaPotencial)}</p>
                                        <p className="text-[11px] text-teal-300 mt-1">Baseada nos valores pagos no último atendimento</p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                        <p className="text-[11px] font-bold text-teal-200 uppercase tracking-wide">Ticket Médio de Recall</p>
                                        <p className="text-3xl font-black text-white mt-1">{formatCurrency(reactivationStats.ticketMedio)}</p>
                                        <p className="text-[11px] text-teal-300 mt-1">Custo de anúncio: R$ 0,00</p>
                                    </div>
                                </div>
                            </div>

                            {/* Barra de Filtros e Busca */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs print:hidden">
                                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                    <button
                                        onClick={() => setReactivationFilter('todos')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                            reactivationFilter === 'todos'
                                                ? "bg-teal-700 text-white shadow-xs"
                                                : "text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        Todos ({reactivationList.length})
                                    </button>
                                    <button
                                        onClick={() => setReactivationFilter('gordura')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                            reactivationFilter === 'gordura'
                                                ? "bg-emerald-600 text-white shadow-xs"
                                                : "text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        Caixa de Gordura ({reactivationStats.qtdGordura})
                                    </button>
                                    <button
                                        onClick={() => setReactivationFilter('fossa')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                            reactivationFilter === 'fossa'
                                                ? "bg-amber-600 text-white shadow-xs"
                                                : "text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        Limpa Fossa ({reactivationStats.qtdFossa})
                                    </button>
                                </div>

                                <div className="relative w-full sm:w-72">
                                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por cliente, bairro ou fone..."
                                        value={reactivationSearch}
                                        onChange={(e) => setReactivationSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-teal-600"
                                    />
                                </div>
                            </div>

                            {/* Lista de Clientes para Reativar */}
                            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                                {loadingReactivation ? (
                                    <div className="p-16 text-center text-slate-400 font-medium">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-3" />
                                        Buscando clientes de Fossa e Caixa de Gordura no histórico...
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                                                <tr>
                                                    <th className="p-4">Tempo Decorrido</th>
                                                    <th className="p-4">Cliente & Local</th>
                                                    <th className="p-4">Filial Atendente</th>
                                                    <th className="p-4">Último Serviço</th>
                                                    <th className="p-4 text-right">Valor Anterior</th>
                                                    <th className="p-4 text-center print:hidden">Ação Imediata</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {filteredReactivationList.map((client) => {
                                                    const isFossa = client.tipoServico === 'limpa_fossa'
                                                    const whatsappUrl = getReactivationWhatsappLink(client)

                                                    return (
                                                        <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                                                            <td className="p-4">
                                                                <span className={cn(
                                                                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black",
                                                                    client.mesesAtras >= 12
                                                                        ? "bg-rose-100 text-rose-800"
                                                                        : client.mesesAtras >= 8
                                                                            ? "bg-amber-100 text-amber-800"
                                                                            : "bg-emerald-100 text-emerald-800"
                                                                )}>
                                                                    <Clock className="h-3 w-3" />
                                                                    Há {client.mesesAtras} meses
                                                                </span>
                                                                <p className="text-[10px] text-slate-400 mt-1">
                                                                    Feito em {formatDate(client.dataServico)}
                                                                </p>
                                                            </td>

                                                            <td className="p-4">
                                                                <p className="font-extrabold text-slate-800 text-sm">
                                                                    {client.clienteNome}
                                                                </p>
                                                                <p className="text-slate-500 text-[11px] line-clamp-1 flex items-center gap-1 mt-0.5">
                                                                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                                                    {client.endereco}
                                                                </p>
                                                                <p className="text-slate-400 text-[10px] mt-0.5 font-bold">
                                                                    Tel: {client.clienteWhatsapp || 'Não cadastrado'}
                                                                </p>
                                                            </td>

                                                            <td className="p-4">
                                                                <span 
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold text-white shadow-xs"
                                                                    style={{ backgroundColor: client.marcaCor }}
                                                                >
                                                                    {client.marcaNome}
                                                                </span>
                                                            </td>

                                                            <td className="p-4">
                                                                <span className={cn(
                                                                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold",
                                                                    isFossa ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                                )}>
                                                                    {isFossa ? <Truck className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                                                                    {client.categoriaNome}
                                                                </span>
                                                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 max-w-[200px]">
                                                                    {client.descricaoOriginal}
                                                                </p>
                                                            </td>

                                                            <td className="p-4 text-right font-black text-slate-800 text-sm">
                                                                {formatCurrency(client.valorPago)}
                                                            </td>

                                                            <td className="p-4 text-center print:hidden">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <a
                                                                        href={whatsappUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all hover:scale-105"
                                                                        title="Abrir WhatsApp com mensagem cordial de manutenção semestral"
                                                                    >
                                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                                        Chamar no Whats
                                                                    </a>

                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => navigate(`/service-orders/new?clientId=${client.clienteId || ''}`)}
                                                                        className="text-[11px] font-bold text-slate-600 border-slate-200 hover:bg-slate-50 h-8 rounded-xl"
                                                                        title="Criar nova OS preventiva direto para este cliente"
                                                                    >
                                                                        + Nova OS
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}

                                                {filteredReactivationList.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-12 text-center text-slate-400">
                                                            Nenhum cliente de fossa ou caixa de gordura na faixa de 6 a 18 meses encontrado.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

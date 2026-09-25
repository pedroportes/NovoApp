import { Truck, AlertTriangle, CheckCircle, Receipt, Download, FileChartColumn, ArrowUpRight, Building2 } from 'lucide-react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useBrand } from '@/contexts/BrandContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LiveMap } from '@/components/LiveMap'
import { useLicenseCheck } from '@/hooks/useLicenseCheck'
import { Calendar as CalendarIcon, ShieldCheck, Clock, Check } from 'lucide-react'
import { DashboardStats, BrandBreakdownItem } from '@/components/dashboard/DashboardStats'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { ServiceDistributionChart } from '@/components/dashboard/ServiceDistributionChart'
import { TechnicianRanking } from '@/components/dashboard/TechnicianRanking'
import { ClientGrowthChart } from '@/components/dashboard/ClientGrowthChart'
import { generateDashboardReport } from '@/utils/reportGenerator'

// Audio for notifications
const playNotificationSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.5)

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5)

        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.5)
    } catch (e) {
        console.error('Audio play failed', e)
    }
}

export function Dashboard() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const { brands, selectedBrandId, selectedBrand } = useBrand()
    const { plan, isTrial, isTrialExpired, usage, expiresAt } = useLicenseCheck()
    const { setFabAction } = useOutletContext<{ setFabAction: (action: (() => void) | null) => void }>() ?? { setFabAction: () => { } }
    const dashboardRef = useRef<HTMLDivElement>(null)

    const [stats, setStats] = useState({
        revenue: 0,
        monthlyRevenue: 0,
        receivables: 0,
        payables: 0,
        averageTicket: 0,
        activeServices: 0,
        newClients: 0,
        commissions: 0
    })
    const [brandBreakdown, setBrandBreakdown] = useState<BrandBreakdownItem[]>([])
    const [chartData, setChartData] = useState<any[]>([])
    const [serviceDistribution, setServiceDistribution] = useState<any[]>([])
    const [clientGrowthData, setClientGrowthData] = useState<any[]>([])
    const [recentActivities, setRecentActivities] = useState<any[]>([])
    const [pendingExpenses, setPendingExpenses] = useState<any[]>([])
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - 30)
        return { start, end }
    })
    const [loading, setLoading] = useState(true)
    const [technicianStats, setTechnicianStats] = useState<any[]>([])

    // Setup FAB
    useEffect(() => {
        setFabAction(() => navigate('/service-orders/new'))
        return () => setFabAction(null)
    }, [])

    // Data Fetching com Auditoria Rigorosa de Cálculos e Filtro de Marcas
    const fetchDashboardData = async () => {
        if (!userData?.empresa_id) return

        setLoading(true)
        try {
            // Data de início para o histórico de 6 meses (sempre do dia 1 do mês de 5 meses atrás)
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setDate(1)
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
            sixMonthsAgo.setHours(0, 0, 0, 0)

            // 1. Query base para Ordens de Serviço no período selecionado
            let allOSQuery = supabase
                .from('ordens_servico')
                .select(`
                    id, 
                    itens, 
                    status, 
                    valor_total, 
                    created_at, 
                    marca_id,
                    tecnico_id,
                    marcas:marca_id (nome, cor_tema),
                    tecnico:tecnico_id (id, nome, nome_completo)
                `)
                .eq('empresa_id', userData.empresa_id)
                .not('status', 'in', '("NAO_FEITO_CANCELADO","CANCELADO","cancelado")')
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString())

            if (selectedBrandId && selectedBrandId !== 'all') {
                if (brands.length > 0 && selectedBrandId === brands[0].id) {
                    allOSQuery = allOSQuery.or(`marca_id.eq.${selectedBrandId},marca_id.is.null`)
                } else {
                    allOSQuery = allOSQuery.eq('marca_id', selectedBrandId)
                }
            }

            // 2. Query para o gráfico histórico de faturamento dos últimos 6 meses (100% real, sem random)
            let historicalOSQuery = supabase
                .from('ordens_servico')
                .select('valor_total, created_at, status, marca_id')
                .eq('empresa_id', userData.empresa_id)
                .in('status', ['CONCLUIDO', 'concluido', 'concluída', 'concluida'])
                .gte('created_at', sixMonthsAgo.toISOString())

            if (selectedBrandId && selectedBrandId !== 'all') {
                if (brands.length > 0 && selectedBrandId === brands[0].id) {
                    historicalOSQuery = historicalOSQuery.or(`marca_id.eq.${selectedBrandId},marca_id.is.null`)
                } else {
                    historicalOSQuery = historicalOSQuery.eq('marca_id', selectedBrandId)
                }
            }

            // 3. Query para Atividades Recentes (últimas 6 ordens do sistema)
            let recentOSQuery = supabase
                .from('ordens_servico')
                .select(`
                    id, 
                    cliente_nome, 
                    status, 
                    valor_total, 
                    created_at,
                    marca_id,
                    marcas:marca_id (nome, cor_tema),
                    deslocamento_iniciado_em,
                    previsao_chegada,
                    tecnico:tecnico_id (nome, nome_completo)
                `)
                .eq('empresa_id', userData.empresa_id)
                .order('created_at', { ascending: false })
                .limit(6)

            if (selectedBrandId && selectedBrandId !== 'all') {
                if (brands.length > 0 && selectedBrandId === brands[0].id) {
                    recentOSQuery = recentOSQuery.or(`marca_id.eq.${selectedBrandId},marca_id.is.null`)
                } else {
                    recentOSQuery = recentOSQuery.eq('marca_id', selectedBrandId)
                }
            }

            // Execução paralela de todas as consultas essenciais
            const [
                allOSRes,
                historicalOSRes,
                recentOSRes,
                commissionRes,
                expenseRes,
                clientDataRes,
                pendingExpensesRes
            ] = await Promise.all([
                // Todas as OSs do período
                allOSQuery,
                // Histórico de 6 meses para o gráfico
                historicalOSQuery,
                // Recentes
                recentOSQuery,
                // Comissões da empresa
                supabase
                    .from('historico_comissoes')
                    .select(`
                        id,
                        valor_comissao,
                        status_pagamento,
                        tecnico_id,
                        created_at,
                        tecnico:tecnico_id (id, nome, nome_completo)
                    `)
                    .eq('empresa_id', userData.empresa_id)
                    .gte('created_at', dateRange.start.toISOString())
                    .lte('created_at', dateRange.end.toISOString()),
                // Despesas operacionais aprovadas a pagar (excluindo despesas já pagas)
                supabase
                    .from('despesas_tecnicos')
                    .select('id, valor, status, status_aprovacao')
                    .eq('empresa_id', userData.empresa_id)
                    .eq('status', 'aprovado')
                    .gte('created_at', dateRange.start.toISOString())
                    .lte('created_at', dateRange.end.toISOString()),
                // Novos clientes cadastrados no período
                supabase
                    .from('clientes')
                    .select('id, created_at')
                    .eq('empresa_id', userData.empresa_id)
                    .gte('created_at', dateRange.start.toISOString())
                    .lte('created_at', dateRange.end.toISOString()),
                // Despesas pendentes que requerem aprovação do administrador
                userData.cargo === 'admin'
                    ? supabase
                        .from('despesas_tecnicos')
                        .select(`
                            id, 
                            valor, 
                            descricao, 
                            created_at, 
                            status,
                            tecnico:tecnico_id (nome, nome_completo),
                            comprovante_url
                        `)
                        .eq('empresa_id', userData.empresa_id)
                        .eq('status', 'pendente')
                        .order('created_at', { ascending: false })
                        .limit(5)
                    : Promise.resolve({ data: [] })
            ])

            // Dados recebidos
            const allOS = allOSRes.data || []
            const historicalOS = historicalOSRes.data || []
            const recentOS = recentOSRes.data || []
            const commissionData = commissionRes.data || []
            const expenseData = expenseRes.data || []
            const clientData = clientDataRes.data || []
            const expensesPending = pendingExpensesRes.data || []

            // ==========================================
            // CÁLCULO 1: FATURAMENTO (Serviços Concluídos)
            // ==========================================
            const completedOS = allOS.filter((os: any) =>
                ['CONCLUIDO', 'concluido', 'concluída', 'concluida'].includes(os.status)
            )
            const completedRevenue = completedOS.reduce((acc: number, os: any) => acc + (Number(os.valor_total) || 0), 0)
            const countCompleted = completedOS.length

            // ==========================================
            // CÁLCULO 2: TICKET MÉDIO
            // ==========================================
            const avgTicket = countCompleted > 0 ? (completedRevenue / countCompleted) : 0

            // ==========================================
            // CÁLCULO 3: A RECEBER (Serviços em Execução/Agendados)
            // ==========================================
            const openOS = allOS.filter((os: any) =>
                ['PENDENTE', 'EM_ANDAMENTO', 'AGENDADO', 'agendado', 'em_andamento', 'pendente'].includes(os.status)
            )
            const receivables = openOS.reduce((acc: number, os: any) => acc + (Number(os.valor_total) || 0), 0)

            // ==========================================
            // CÁLCULO 4: CONTAS A PAGAR
            // (Comissões a pagar aos técnicos + Despesas aprovadas pendentes de quitação)
            // ==========================================
            let totalPayables = 0
            let totalCommissionsPeriod = 0

            // Comissões dos técnicos
            commissionData.forEach((comm: any) => {
                const val = Number(comm.valor_comissao) || 0
                totalCommissionsPeriod += val
                if (comm.status_pagamento === 'a_pagar' || comm.status_pagamento === 'pendente') {
                    totalPayables += val
                }
            })

            // Despesas aprovadas da empresa/técnicos
            const approvedExpensesTotal = expenseData.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0)
            totalPayables += approvedExpensesTotal

            // ==========================================
            // CÁLCULO 5: RANKING E PERFORMANCE DA EQUIPE
            // ==========================================
            const techMap = new Map<string, { id: string, name: string, totalCommissions: number, servicesCount: number }>()

            // 5a. Contabilizar serviços concluídos por técnico
            completedOS.forEach((os: any) => {
                const techId = os.tecnico_id || os.tecnico?.id
                const name = os.tecnico?.nome_completo || os.tecnico?.nome
                if (name) {
                    if (!techMap.has(name)) {
                        techMap.set(name, { id: techId || '', name, totalCommissions: 0, servicesCount: 0 })
                    }
                    techMap.get(name)!.servicesCount += 1
                    if (techId && !techMap.get(name)!.id) {
                        techMap.get(name)!.id = techId
                    }
                }
            })

            // 5b. Contabilizar comissões por técnico
            commissionData.forEach((comm: any) => {
                const techId = comm.tecnico_id || comm.tecnico?.id
                const name = comm.tecnico?.nome_completo || comm.tecnico?.nome
                const val = Number(comm.valor_comissao) || 0
                if (name) {
                    if (!techMap.has(name)) {
                        techMap.set(name, { id: techId || '', name, totalCommissions: 0, servicesCount: 0 })
                    }
                    techMap.get(name)!.totalCommissions += val
                    if (techId && !techMap.get(name)!.id) {
                        techMap.get(name)!.id = techId
                    }
                }
            })

            setTechnicianStats(Array.from(techMap.values()))

            // ==========================================
            // CÁLCULO 6: BREAKDOWN POR MARCA (Multi-Empresa)
            // ==========================================
            if (brands.length > 0) {
                const breakdownMap = new Map<string, { revenue: number; count: number }>()
                completedOS.forEach((os: any) => {
                    const mId = os.marca_id || 'sem_marca'
                    const prev = breakdownMap.get(mId) || { revenue: 0, count: 0 }
                    breakdownMap.set(mId, {
                        revenue: prev.revenue + (Number(os.valor_total) || 0),
                        count: prev.count + 1
                    })
                })

                const items: BrandBreakdownItem[] = brands.map((b) => {
                    const stat = breakdownMap.get(b.id) || { revenue: 0, count: 0 }
                    return {
                        id: b.id,
                        nome: b.nome,
                        cor: b.cor_tema || '#10b981',
                        revenue: stat.revenue,
                        count: stat.count
                    }
                })

                // Se houver ordens sem marca explícita, atribuir à Matriz para garantir consistência 100%
                if (breakdownMap.has('sem_marca')) {
                    const unassigned = breakdownMap.get('sem_marca')!
                    if (items[0]) {
                        items[0].revenue += unassigned.revenue
                        items[0].count += unassigned.count
                    }
                }

                setBrandBreakdown(items)
            }

            // Atualiza os stats consolidados
            setStats({
                revenue: completedRevenue,
                monthlyRevenue: completedRevenue,
                receivables: receivables,
                payables: totalPayables,
                averageTicket: avgTicket,
                activeServices: openOS.length,
                newClients: clientData.length,
                commissions: totalCommissionsPeriod
            })

            // ==========================================
            // CÁLCULO 7: HISTÓRICO DE FATURAMENTO (6 Meses Real)
            // (Sem números randômicos: soma exata de cada mês)
            // ==========================================
            const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
            const monthlyTotals: { [key: string]: number } = {}

            historicalOS.forEach((os: any) => {
                const d = new Date(os.created_at)
                const key = `${d.getFullYear()}-${d.getMonth()}`
                monthlyTotals[key] = (monthlyTotals[key] || 0) + (Number(os.valor_total) || 0)
            })

            const historical = []
            for (let i = 5; i >= 0; i--) {
                const targetDate = new Date()
                targetDate.setDate(1)
                targetDate.setMonth(targetDate.getMonth() - i)
                const key = `${targetDate.getFullYear()}-${targetDate.getMonth()}`
                const name = monthNames[targetDate.getMonth()]
                const val = monthlyTotals[key] || 0
                historical.push({ name, faturamento: val })
            }
            setChartData(historical)

            // Atividades Recentes
            setRecentActivities(recentOS)

            // ==========================================
            // CÁLCULO 8: SERVIÇOS MAIS VENDIDOS
            // ==========================================
            const serviceMap: Record<string, number> = {}
            completedOS.forEach((os: any) => {
                if (Array.isArray(os.itens)) {
                    os.itens.forEach((item: any) => {
                        const name = item.descricao || 'Outros'
                        const val = Number(item.total || 0)
                        if (val > 0) {
                            serviceMap[name] = (serviceMap[name] || 0) + val
                        }
                    })
                }
            })
            setServiceDistribution(Object.entries(serviceMap).map(([name, value]) => ({ name, value })))

            // ==========================================
            // CÁLCULO 9: CRESCIMENTO DA BASE DE CLIENTES (6 Meses)
            // ==========================================
            const clientGroups: Record<string, number> = {}
            clientData.forEach((c: any) => {
                const d = new Date(c.created_at)
                const key = `${d.getFullYear()}-${d.getMonth()}`
                clientGroups[key] = (clientGroups[key] || 0) + 1
            })

            const growthData = []
            for (let i = 5; i >= 0; i--) {
                const d = new Date()
                d.setDate(1)
                d.setMonth(d.getMonth() - i)
                const key = `${d.getFullYear()}-${d.getMonth()}`
                const month = monthNames[d.getMonth()]
                growthData.push({ month, newClients: clientGroups[key] || 0 })
            }
            setClientGrowthData(growthData)

            // Despesas pendentes
            if (userData.cargo === 'admin') {
                setPendingExpenses(expensesPending)
            }

        } catch (error) {
            console.error('Erro ao buscar dados do dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    // Carregamento inicial e ao mudar marca ou data
    useEffect(() => {
        if (userData?.empresa_id) {
            fetchDashboardData()
        } else if (userData) {
            setLoading(false)
        }
    }, [userData?.empresa_id, dateRange, selectedBrandId])

    const fetchDashboardDataRef = useRef(fetchDashboardData)
    useEffect(() => {
        fetchDashboardDataRef.current = fetchDashboardData
    })

    // Subscrições Realtime
    useEffect(() => {
        if (!userData?.empresa_id) return

        const osChannel = supabase
            .channel('dashboard-os')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'ordens_servico',
                    filter: `empresa_id=eq.${userData.empresa_id}`
                },
                (payload) => {
                    fetchDashboardDataRef.current()
                    const newStatus = payload.new.status
                    const oldStatus = payload.old.status

                    if (newStatus !== oldStatus) {
                        playNotificationSound()
                        if (newStatus === 'em_deslocamento') {
                            toast.info(`Técnico em deslocamento para OS #${payload.new.id.slice(0, 6)}`, {
                                icon: <Truck className="h-4 w-4" />
                            })
                        } else if (['CONCLUIDO', 'concluido'].includes(newStatus)) {
                            toast.success(`OS #${payload.new.id.slice(0, 6)} concluída!`, {
                                icon: <CheckCircle className="h-4 w-4" />
                            })
                        }
                    }
                }
            )
            .subscribe()

        const expenseChannel = supabase
            .channel('dashboard-expenses')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'despesas_tecnicos',
                    filter: `empresa_id=eq.${userData.empresa_id}`
                },
                (payload) => {
                    fetchDashboardDataRef.current()
                    playNotificationSound()
                    toast.warning(`Nova despesa lançada: R$ ${payload.new.valor}`, {
                        description: payload.new.descricao,
                        action: {
                            label: 'Ver',
                            onClick: () => navigate('/financial')
                        }
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(osChannel)
            supabase.removeChannel(expenseChannel)
        }
    }, [userData?.empresa_id])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const handleExportPDF = () => {
        const toastId = toast.loading('Gerando relatório...')

        try {
            generateDashboardReport({
                companyName: selectedBrand ? selectedBrand.nome : ((userData as any)?.nome_fantasia || 'Minha Empresa'),
                dateRange: dateRange,
                stats: stats,
                technicianStats: technicianStats,
                recentActivities: recentActivities,
                pendingExpenses: pendingExpenses,
                clientGrowth: clientGrowthData
            })

            toast.dismiss(toastId)
            toast.success('Relatório gerado com sucesso!')
        } catch (error) {
            console.error(error)
            toast.dismiss(toastId)
            toast.error('Erro ao gerar relatório.')
        }
    }

    const handleExportCSV = async () => {
        if (!userData?.empresa_id) return
        const toastId = toast.loading('Gerando CSV...')
        try {
            let query = supabase
                .from('ordens_servico')
                .select(`
                    id, 
                    created_at, 
                    status, 
                    valor_total, 
                    cliente_nome, 
                    marca_id,
                    marcas:marca_id(nome),
                    tecnico:tecnico_id(nome, nome_completo)
                `)
                .eq('empresa_id', userData.empresa_id)
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString())

            if (selectedBrandId && selectedBrandId !== 'all') {
                query = query.eq('marca_id', selectedBrandId)
            }

            const { data: osData } = await query

            if (!osData || osData.length === 0) {
                toast.dismiss(toastId)
                toast.info('Sem dados para exportar no período.')
                return
            }

            let csvContent = "data:text/csv;charset=utf-8,ID,Data,Cliente,Empresa,Tecnico,Status,Valor\n"

            osData.forEach(row => {
                const date = row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '-'
                const tech = (row.tecnico as any)?.nome_completo || (row.tecnico as any)?.nome || 'Não atribuído'
                const empresaNome = (row.marcas as any)?.nome || 'Matriz'
                const val = (row.valor_total || 0).toFixed(2).replace('.', ',')
                csvContent += `"${row.id}","${date}","${row.cliente_nome || ''}","${empresaNome}","${tech}","${row.status}","${val}"\n`
            })

            const encodedUri = encodeURI(csvContent)
            const link = document.createElement("a")
            link.setAttribute("href", encodedUri)
            link.setAttribute("download", `dados_flowdrain_${new Date().toISOString().slice(0, 10)}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            toast.dismiss(toastId)
            toast.success('CSV baixado com sucesso!')
        } catch (e) {
            console.error(e)
            toast.dismiss(toastId)
            toast.error('Erro ao baixar CSV')
        }
    }

    const handlePeriodChange = (days: number) => {
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - days)
        setDateRange({ start, end })
    }

    const periods = [
        { label: 'Últimos 7 dias', days: 7 },
        { label: 'Últimos 15 dias', days: 15 },
        { label: 'Últimos 30 dias', days: 30 },
        { label: 'Últimos 90 dias', days: 90 },
    ]

    return (
        <div className="space-y-6 animate-in fade-in duration-500 mt-8 md:mt-0" ref={dashboardRef}>
            

            {/* HEAD & STATUS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100/50 backdrop-blur-sm px-3 py-1.5 rounded-2xl border border-slate-200/50">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight"> Plano {plan} </span>
                        {plan !== 'prime' && (
                            <button
                                onClick={() => navigate('/plans')}
                                className="ml-1 text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-black hover:bg-emerald-700 transition-all uppercase tracking-tighter shadow-sm hover:scale-105 active:scale-95"
                            >
                                Upgrade
                            </button>
                        )}
                    </div>

                    {isTrial ? (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-colors ${isTrialExpired ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                            <Clock className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-tight">
                                {isTrialExpired ? 'Período de Teste Expirado' : `Período de Teste (${7 - (usage.daysUsed || 0)} dias restantes)`}
                            </span>
                            {!isTrialExpired && (
                                <button
                                    onClick={() => navigate('/plans')}
                                    className="ml-2 text-[10px] bg-amber-600 text-white px-2.5 py-1 rounded-lg font-black hover:bg-amber-700 transition-all uppercase tracking-wide shadow-md shadow-amber-500/20 flex items-center gap-1 group"
                                >
                                    Assinar agora
                                    <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-2xl text-emerald-600">
                            <Check className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-tight"> Assinatura Ativa </span>
                            {expiresAt && (
                                <span className="text-[10px] ml-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md mix-blend-multiply flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    Até {expiresAt.substring(0, 10).split('-').reverse().join('/')}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Indicador de Filtro de Marca Ativo */}
                    {selectedBrand && (
                        <div 
                            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold shadow-sm"
                            style={{ 
                                backgroundColor: `${selectedBrand.cor_tema || '#10b981'}15`,
                                borderColor: `${selectedBrand.cor_tema || '#10b981'}40`,
                                color: selectedBrand.cor_tema || '#065f46'
                            }}
                        >
                            <Building2 className="h-3.5 w-3.5" />
                            <span>Filtrado: {selectedBrand.nome}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 items-center">
                    <select
                        className="bg-white border md:border-slate-200 text-slate-600 text-xs md:text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                        onChange={(e) => handlePeriodChange(Number(e.target.value))}
                        defaultValue={30}
                    >
                        {periods.map(p => (
                            <option key={p.days} value={p.days}>{p.label}</option>
                        ))}
                    </select>

                    <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={handleExportCSV}>
                        <FileChartColumn className="h-4 w-4" />
                        <span className="hidden md:inline">CSV</span>
                    </Button>

                    <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={handleExportPDF}>
                        <Download className="h-4 w-4" />
                        <span className="hidden md:inline">Exportar PDF</span>
                    </Button>
                </div>
            </div>

            {/* KPI STATS */}
            <DashboardStats
                revenue={stats.monthlyRevenue}
                receivables={stats.receivables}
                payables={stats.payables}
                averageTicket={stats.averageTicket}
                monthlyGrowth={5.2}
                brandBreakdown={brandBreakdown}
                selectedBrandName={selectedBrand?.nome}
                selectedBrandColor={selectedBrand?.cor_tema}
                isAllBrands={selectedBrandId === 'all'}
            />

            {/* CHART */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart data={chartData} />
                </div>

                <div className="lg:col-span-1">
                    <ServiceDistributionChart data={serviceDistribution} />
                </div>
            </div>

            {/* GROWTH & RANKING */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* GROWTH CHART */}
                <div className="h-96">
                    <ClientGrowthChart data={clientGrowthData} />
                </div>

                {/* RANKING */}
                <div>
                    <TechnicianRanking data={technicianStats} />
                </div>
            </div>

            {/* LISTAS INFERIORES */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* LISTA RECENTE COM BADGE DE MARCA */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-500/10 border border-slate-200/60 border-l-4 border-l-indigo-500 p-4 md:p-6 hover:shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-500 group">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                            <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                                <FileChartColumn className="h-5 w-5 text-white" />
                            </div>
                            Ordens de Serviço Recentes
                        </h3>
                        <button onClick={() => navigate('/service-orders')} className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full transition-colors cursor-pointer">
                            Ver Tudo
                        </button>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="h-12 bg-slate-50 rounded-2xl animate-pulse" />
                            ))
                        ) : recentActivities?.length === 0 ? (
                            <p className="text-center text-slate-400 py-4 text-sm">Nenhuma atividade recente.</p>
                        ) : (
                            recentActivities.slice(0, 5).map((os) => {
                                const brandName = (os.marcas as any)?.nome || ''
                                const brandColor = (os.marcas as any)?.cor_tema || '#10b981'
                                return (
                                    <div
                                        key={os.id}
                                        onClick={() => navigate(`/service-orders/${os.id}`)}
                                        className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                                    >
                                        <div className="min-w-0 flex-1 mr-3">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-slate-800 truncate">
                                                    {os.cliente_nome || 'Cliente'}
                                                </p>
                                                {brandName && (
                                                    <span 
                                                        className="text-[9px] px-2 py-0.5 rounded-full font-bold truncate max-w-[130px] shrink-0"
                                                        style={{ 
                                                            backgroundColor: `${brandColor}18`,
                                                            color: brandColor
                                                        }}
                                                    >
                                                        {brandName.replace('Desentupidora ', '')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                OS #{os.id.slice(0, 6)} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.valor_total || 0)}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                                            os.status === 'CONCLUIDO' || os.status === 'concluido'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {os.status === 'CONCLUIDO' || os.status === 'concluido' ? 'Concluído' : 'Pendente'}
                                        </span>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* DESPESAS PENDENTES (Somente Admin) */}
                {userData?.cargo === 'admin' && pendingExpenses.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-2xl shadow-amber-500/10 border border-slate-200/60 border-l-4 border-l-amber-500 p-4 md:p-6 hover:shadow-amber-500/20 hover:-translate-y-1 transition-all duration-500 group">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                                    <AlertTriangle className="h-5 w-5 text-white" />
                                </div>
                                Requer Atenção
                            </h3>
                            <button onClick={() => navigate('/financial')} className="text-xs font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1 rounded-full transition-colors cursor-pointer">
                                Resolver
                            </button>
                        </div>

                        <div className="space-y-4">
                            {pendingExpenses.map((expense) => (
                                <div key={expense.id} className="flex items-center justify-between p-4 bg-white hover:bg-amber-50 rounded-2xl transition-all duration-300 border border-amber-200 shadow-md shadow-amber-500/5 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                                            <Receipt className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{expense.descricao}</p>
                                            <p className="text-xs text-slate-500 font-medium">{formatCurrency(expense.valor)}</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 px-4 text-xs font-bold text-amber-600 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (expense.comprovante_url) {
                                                window.open(expense.comprovante_url, '_blank')
                                            } else {
                                                navigate('/financial')
                                            }
                                        }}
                                    >
                                        {expense.comprovante_url ? 'Ver Comprovante' : 'Ver Detalhes'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* RASTREAMENTO EM TEMPO REAL (Somente Admin) */}
                {userData?.cargo === 'admin' && (
                    <div className="bg-white rounded-3xl shadow-2xl shadow-slate-500/10 border border-slate-200/60 border-l-4 border-l-slate-800 p-6 hover:shadow-slate-500/20 hover:-translate-y-1 transition-all duration-500">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-slate-800 rounded-xl shadow-lg shadow-slate-800/30">
                                <Truck className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800">Monitoramento</h3>
                        </div>
                        <LiveMap />
                    </div>
                )}
            </div>
        </div>
    )
}

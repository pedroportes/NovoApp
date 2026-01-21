import { Truck, AlertTriangle, CheckCircle, Receipt, Download, FileChartColumn } from 'lucide-react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LiveMap } from '@/components/LiveMap'
import { useLicenseCheck } from '@/hooks/useLicenseCheck'
import { Calendar as CalendarIcon, ShieldCheck, Clock, Check } from 'lucide-react'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { ServiceDistributionChart } from '@/components/dashboard/ServiceDistributionChart'
import { TechnicianRanking } from '@/components/dashboard/TechnicianRanking'
import { ClientGrowthChart } from '@/components/dashboard/ClientGrowthChart'
import { generateDashboardReport } from '@/utils/reportGenerator'

// Audio for notifications
const playNotificationSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.5); // Drop to A4

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.error('Audio play failed', e);
    }
}

export function Dashboard() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const { plan, isTrial, isTrialExpired, usage } = useLicenseCheck()
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
    const [chartData, setChartData] = useState<any[]>([])
    const [serviceDistribution, setServiceDistribution] = useState<any[]>([])
    const [clientGrowthData, setClientGrowthData] = useState<any[]>([])
    const [recentActivities, setRecentActivities] = useState<any[]>([])
    const [pendingExpenses, setPendingExpenses] = useState<any[]>([])
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    })
    const [loading, setLoading] = useState(true)
    const [technicianStats, setTechnicianStats] = useState<any[]>([])

    // Setup FAB
    useEffect(() => {
        setFabAction(() => navigate('/service-orders/new'))
        return () => setFabAction(null)
    }, [])

    // Data Fetching
    const fetchDashboardData = async () => {
        if (!userData?.empresa_id) return

        setLoading(true)
        try {
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)

            // Parallel Requests
            const [
                statsRes,
                completedRes,
                commissionRes,
                expenseRes,
                openOSRes,
                flowRes,
                recentOSRes,
                allOSRes,
                clientDataRes,
                pendingExpensesRes
            ] = await Promise.all([
                // 1. Stats RPC
                supabase.rpc('get_dashboard_stats', {
                    p_empresa_id: userData.empresa_id,
                    p_start_date: dateRange.start.toISOString(),
                    p_end_date: dateRange.end.toISOString()
                }),
                // 2. Completed Count
                supabase
                    .from('ordens_servico')
                    .select('*', { count: 'exact', head: true })
                    .eq('empresa_id', userData.empresa_id)
                    .eq('status', 'CONCLUIDO')
                    .gte('created_at', dateRange.start.toISOString())
                    .lte('created_at', dateRange.end.toISOString()),
                // 3. Commissions
                supabase
                    .from('historico_comissoes')
                    .select(`
                        valor_comissao,
                        status_pagamento,
                        tecnico:tecnico_id (nome_completo)
                    `)
                    .eq('empresa_id', userData.empresa_id)
                    .gte('created_at', dateRange.start.toISOString())
                    .lte('created_at', dateRange.end.toISOString()),
                // 4. Expenses (Approved)
                supabase
                    .from('despesas_tecnicos')
                    .select('valor')
                    .eq('empresa_id', userData.empresa_id)
                    .eq('status', 'aprovado')
                    .gte('created_at', dateRange.start.toISOString())
                    .lte('created_at', dateRange.end.toISOString()),
                // 5. Open OS (Receivables)
                supabase
                    .from('ordens_servico')
                    .select('valor_total')
                    .eq('empresa_id', userData.empresa_id)
                    .in('status', ['PENDENTE', 'EM_ANDAMENTO', 'AGENDADO'])
                    .gte('created_at', dateRange.start.toISOString())
                    .lte('created_at', dateRange.end.toISOString()),
                // 6. Flow (Chart)
                supabase
                    .from('financeiro_fluxo')
                    .select('valor, data_lancamento, tipo')
                    .eq('empresa_id', userData.empresa_id)
                    .eq('tipo', 'RECEITA')
                    .gte('data_lancamento', new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString()),
                // 7. Recent Activity
                supabase
                    .from('ordens_servico')
                    .select(`
                        id, 
                        cliente_nome, 
                        status, 
                        valor_total, 
                        created_at,
                        deslocamento_iniciado_em,
                        previsao_chegada,
                        tecnico:tecnico_id (nome_completo)
                    `)
                    .eq('empresa_id', userData.empresa_id)
                    .gte('created_at', dateRange.start.toISOString())
                    .lte('created_at', dateRange.end.toISOString())
                    .order('updated_at', { ascending: false })
                    .limit(5),
                // 8. Service Distribution
                supabase
                    .from('ordens_servico')
                    .select('itens')
                    .eq('empresa_id', userData.empresa_id)
                    .neq('status', 'CANCELADO')
                    .gte('created_at', dateRange.start.toISOString())
                    .lte('created_at', dateRange.end.toISOString()),
                // 9. Client Growth
                supabase
                    .from('clientes')
                    .select('created_at')
                    .eq('empresa_id', userData.empresa_id)
                    .gte('created_at', sixMonthsAgo.toISOString()),
                // 10. Pending Expenses (Admin)
                userData.cargo === 'admin' ?
                    supabase
                        .from('despesas_tecnicos')
                        .select(`
                        id, 
                        valor, 
                        descricao, 
                        created_at, 
                        status,
                        tecnico:tecnico_id (nome_completo),
                        comprovante_url
                    `)
                        .eq('empresa_id', userData.empresa_id)
                        .eq('status', 'pendente')
                        .gte('created_at', dateRange.start.toISOString())
                        .lte('created_at', dateRange.end.toISOString())
                        .order('created_at', { ascending: false })
                        .limit(5)
                    : Promise.resolve({ data: [] })
            ])

            // Process Data
            const statsData = statsRes.data
            const completedCount = completedRes.count
            const commissionData = commissionRes.data
            const expenseData = expenseRes.data
            const openOS = openOSRes.data
            const flowData = flowRes.data
            const recentOS = recentOSRes.data
            const allOS = allOSRes.data
            const clientData = clientDataRes.data
            const expenses = pendingExpensesRes.data

            // ... Calculations ...
            let receivables = 0;
            let payables = 0;
            let totalCommissions = 0;

            // Process Commissions & Technician Map
            const techMap = new Map<string, { name: string, totalCommissions: number, servicesCount: number }>();

            if (commissionData) {
                commissionData.forEach((comm: any) => {
                    const val = Number(comm.valor_comissao) || 0
                    totalCommissions += val

                    if (comm.status_pagamento === 'a_pagar') {
                        payables += val
                    }

                    const techName = comm.tecnico?.nome_completo || 'Desconhecido';
                    if (!techMap.has(techName)) {
                        techMap.set(techName, { name: techName, totalCommissions: 0, servicesCount: 0 });
                    }
                    const current = techMap.get(techName)!;
                    current.totalCommissions += val;
                    current.servicesCount += 1;
                });
            }
            setTechnicianStats(Array.from(techMap.values()));

            // Expenses
            if (expenseData) payables += expenseData.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0)

            // Receivables
            if (openOS) receivables = openOS.reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0)

            // Chart Data
            const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            const currentMonth = new Date().getMonth();
            const historical = [];

            if (statsData) {
                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(currentMonth - i);
                    const name = monthNames[d.getMonth()];
                    let val = i === 0 ? (statsData[0]?.period_revenue || 0) : Math.max(0, (statsData[0]?.period_revenue || 0) * (0.8 + Math.random() * 0.4));

                    if (flowData && flowData.length > 0) {
                        const monthFlow = flowData.filter((f: any) => new Date(f.data_lancamento).getMonth() === d.getMonth()).reduce((acc: number, curr: any) => acc + curr.valor, 0);
                        if (monthFlow > 0) val = monthFlow;
                    }
                    historical.push({ name, faturamento: val });
                }
            }
            setChartData(historical);

            // Set Stats
            if (statsData && statsData[0]) {
                const revenue = statsData[0].period_revenue || 0
                const count = completedCount || 0
                const avgTicket = count > 0 ? revenue / count : 0

                setStats({
                    revenue: revenue,
                    monthlyRevenue: revenue,
                    receivables: receivables,
                    payables: payables,
                    averageTicket: avgTicket,
                    activeServices: statsData[0].active_services || 0,
                    newClients: statsData[0].total_clients || 0,
                    commissions: totalCommissions
                })
            }

            setRecentActivities(recentOS || [])

            // Service Distribution
            const serviceMap: Record<string, number> = {}
            allOS?.forEach((os: any) => {
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

            // Client Growth
            const clientGroups: Record<string, number> = {}
            clientData?.forEach((c: any) => {
                const month = new Date(c.created_at).toLocaleString('pt-BR', { month: 'short' })
                clientGroups[month] = (clientGroups[month] || 0) + 1
            })

            const growthData = []
            for (let i = 5; i >= 0; i--) {
                const d = new Date()
                d.setMonth(d.getMonth() - i)
                const month = d.toLocaleString('pt-BR', { month: 'short' })
                growthData.push({ month, newClients: clientGroups[month] || 0 })
            }
            setClientGrowthData(growthData)

            if (userData.cargo === 'admin') {
                setPendingExpenses(expenses || [])
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Initial Fetch
    useEffect(() => {
        if (userData?.empresa_id) {
            fetchDashboardData()
        } else if (userData) {
            setLoading(false)
        }
    }, [userData?.empresa_id, dateRange])

    // Realtime Subscriptions
    useEffect(() => {
        if (!userData?.empresa_id) return

        // Channel for OS updates
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
                    fetchDashboardData() // Refresh data
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

        // Channel for Expenses (Insert only)
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
                    fetchDashboardData() // Refresh pending list
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


    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const handleExportPDF = () => {
        const toastId = toast.loading('Gerando relatório...');

        try {
            generateDashboardReport({
                companyName: userData?.nome_fantasia,
                dateRange: dateRange,
                stats: stats,
                technicianStats: technicianStats,
                recentActivities: recentActivities,
                pendingExpenses: pendingExpenses,
                clientGrowth: clientGrowthData
            })

            toast.dismiss(toastId);
            toast.success('Relatório gerado com sucesso!');
        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            toast.error('Erro ao gerar relatório.');
        }
    };

    const handleExportCSV = async () => {
        if (!userData?.empresa_id) return;
        const toastId = toast.loading('Gerando CSV...');
        try {
            const { data: osData } = await supabase
                .from('ordens_servico')
                .select(`id, created_at, status, valor_total, cliente_nome, tecnico:tecnico_id(nome_completo)`)
                .eq('empresa_id', userData.empresa_id)
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString())

            if (!osData || osData.length === 0) {
                toast.dismiss(toastId);
                toast.info('Sem dados para exportar no período.');
                return;
            }

            // CSV Header
            let csvContent = "data:text/csv;charset=utf-8,ID,Data,Cliente,Tecnico,Status,Valor\n";

            // Rows
            osData.forEach(row => {
                const date = row.created_at ? new Date(row.created_at).toLocaleDateString() : '-';
                const tech = (row.tecnico as any)?.nome_completo || 'N/A';
                const val = row.valor_total || 0;
                csvContent += `${row.id},${date},"${row.cliente_nome}",${tech},${row.status},${val}\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `dados_flowdrain_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.dismiss(toastId);
            toast.success('CSV baixado com sucesso!');
        } catch (e) {
            console.error(e);
            toast.dismiss(toastId);
            toast.error('Erro ao baixar CSV');
        }
    }

    const handlePeriodChange = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        setDateRange({ start, end });
    }

    // Helper for select
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
                    </div>

                    {isTrial ? (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-colors ${isTrialExpired ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                            <Clock className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-tight">
                                {isTrialExpired ? 'Período de Teste Expirado' : `Período de Teste (${7 - (usage.daysUsed || 0)} dias restantes)`}
                            </span>
                            {!isTrialExpired && (
                                <button onClick={() => navigate('/settings/plan')} className="text-[10px] underline ml-1 hover:opacity-80">Assinar agora</button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-2xl text-emerald-600">
                            <Check className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-tight"> Assinatura Ativa </span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 items-center">
                    <select
                        className="bg-white border md:border-slate-200 text-slate-600 text-xs md:text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
                        onChange={(e) => handlePeriodChange(Number(e.target.value))}
                        defaultValue={30}
                    >
                        {periods.map(p => (
                            <option key={p.days} value={p.days}>{p.label}</option>
                        ))}
                    </select>

                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
                        <FileChartColumn className="h-4 w-4" />
                        <span className="hidden md:inline">CSV</span>
                    </Button>

                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
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
                monthlyGrowth={5.2} // Exemplo fixo por enquanto
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
                {/* LISTA RECENTE */}
                <div className="bg-gradient-to-br from-white to-indigo-50/30 rounded-3xl shadow-xl shadow-indigo-500/5 border border-slate-100 border-l-4 border-l-indigo-500 p-4 md:p-6 hover:shadow-indigo-500/10 transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileChartColumn className="h-5 w-5 text-emerald-500" />
                            Recentes
                        </h3>
                        <button onClick={() => navigate('/service-orders')} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Ver</button>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="h-12 bg-slate-50 rounded-2xl animate-pulse" />
                            ))
                        ) : recentActivities?.length === 0 ? (
                            <p className="text-center text-slate-400 py-4 text-sm">Nenhuma atividade recente.</p>
                        ) : (
                            recentActivities.slice(0, 5).map((os) => (
                                <div key={os.id} onClick={() => navigate(`/service-orders/${os.id}`)} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{os.cliente_nome || 'Cliente'}</p>
                                        <p className="text-[10px] text-slate-400">#{os.id.slice(0, 6)}</p>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${os.status === 'CONCLUIDO' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {os.status === 'CONCLUIDO' ? 'OK' : 'Pendente'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* DESPESAS PENDENTES (Somente Admin) */}
                {userData?.cargo === 'admin' && pendingExpenses.length > 0 && (
                    <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-3xl shadow-xl shadow-amber-500/10 border border-slate-100 p-4 md:p-6 border-l-4 border-amber-400 hover:shadow-amber-500/20 transition-all duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Requer Atenção
                            </h3>
                            <button onClick={() => navigate('/financial')} className="text-sm font-medium text-amber-600 hover:text-amber-700">Resolver</button>
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
                                        className="h-8 px-4 text-xs font-bold text-amber-600 hover:bg-amber-100 rounded-xl transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (expense.comprovante_url) {
                                                window.open(expense.comprovante_url, '_blank');
                                            } else {
                                                navigate('/financial');
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
                    <div className="bg-gradient-to-br from-white to-slate-50/30 rounded-3xl shadow-xl shadow-slate-500/5 border border-slate-100 p-6 border-l-4 border-l-slate-400 hover:shadow-slate-500/10 transition-all duration-300">
                        <LiveMap />
                    </div>
                )}
            </div>
        </div >
    )
}

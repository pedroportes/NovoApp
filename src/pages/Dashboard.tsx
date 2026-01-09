import { TrendingUp, Users, ClipboardList, Wallet, ArrowUpRight, Truck, AlertTriangle, CheckCircle, Bell, Receipt, Check, X, FileText } from 'lucide-react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveMap } from '@/components/LiveMap'
import { useLicenseCheck } from '@/hooks/useLicenseCheck'
import { Calendar as CalendarIcon, ShieldCheck, Clock } from 'lucide-react'

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
    const { plan, isTrial, isTrialExpired, usage, limits } = useLicenseCheck()
    const { setFabAction } = useOutletContext<{ setFabAction: (action: (() => void) | null) => void }>() ?? { setFabAction: () => { } }

    const [stats, setStats] = useState({
        revenue: 0,
        monthlyRevenue: 0,
        activeServices: 0,
        newClients: 0
    })
    const [recentActivities, setRecentActivities] = useState<any[]>([])
    const [pendingExpenses, setPendingExpenses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

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
            // 1. Stats from RPC
            const { data: statsData, error: statsError } = await supabase
                .rpc('get_dashboard_stats', { p_empresa_id: userData.empresa_id })

            if (statsError) console.error('Error fetching stats:', statsError)

            if (statsData) {
                setStats({
                    revenue: statsData.total_revenue || 0,
                    monthlyRevenue: statsData.monthly_revenue || 0,
                    activeServices: statsData.active_services || 0,
                    newClients: statsData.total_clients || 0
                })
            }

            // 4. Recent Activities (Latest 5 OS updates)
            const { data: recentOS } = await supabase
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
                .order('updated_at', { ascending: false })
                .limit(5)

            setRecentActivities(recentOS || [])

            // 5. Pending Expenses (For Admin Dashboard)
            if (userData.cargo === 'admin') {
                const { data: expenses } = await supabase
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
                    .order('created_at', { ascending: false })
                    .limit(5)

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
        fetchDashboardData()
    }, [userData?.empresa_id])

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

    return (
        <div className="space-y-6 animate-in fade-in duration-500 mt-8 md:mt-0">
            {/* STATUS DO PLANO */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
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

                <div className="flex items-center gap-2 bg-slate-100/50 backdrop-blur-sm px-3 py-1.5 rounded-2xl border border-slate-200/50">
                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 italic">
                        Renovação automática
                    </span>
                </div>
            </div>

            {/* GRID DE CARDS PRINCIPAIS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Card - Agenda / Calendário */}
                <div
                    onClick={() => navigate('/schedule')}
                    className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-6 flex flex-col justify-between h-32 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-transparent hover:border-emerald-200"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="p-3 bg-emerald-100/50 rounded-2xl text-emerald-600">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            Ver
                        </span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-slate-500 mb-1">Agenda</p>
                        <h3 className="text-xl font-bold text-slate-800">
                            Calendário
                        </h3>
                    </div>
                </div>

                {/* Card - Receita */}
                <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-6 flex flex-col justify-between h-32 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="p-3 bg-emerald-100/50 rounded-2xl text-emerald-600">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            Real
                        </span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-slate-500 mb-1">Receita Total</p>
                        <h3 className="text-2xl font-bold text-slate-800">
                            {loading ? <span className="animate-pulse bg-slate-200 rounded h-8 w-32 block"></span> : formatCurrency(stats.revenue)}
                        </h3>
                    </div>
                </div>

                {/* Card - Receita Mensal */}
                <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-6 flex flex-col justify-between h-32 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="p-3 bg-purple-100/50 rounded-2xl text-purple-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                            Mês Atual
                        </span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-slate-500 mb-1">Faturamento (Mês)</p>
                        <h3 className="text-2xl font-bold text-slate-800">
                            {loading ? <span className="animate-pulse bg-slate-200 rounded h-8 w-32 block"></span> : formatCurrency(stats.monthlyRevenue)}
                        </h3>
                    </div>
                </div>

                {/* Card - Serviços Ativos */}
                <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-6 flex flex-col justify-between h-32 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="p-3 bg-sky-100/50 rounded-2xl text-sky-600">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-full">
                            Ativos
                        </span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-slate-500 mb-1">Serviços Ativos</p>
                        <h3 className="text-2xl font-bold text-slate-800">
                            {loading ? <span className="animate-pulse bg-slate-200 rounded h-8 w-16 block"></span> : `${stats.activeServices} O.S.`}
                        </h3>
                    </div>
                </div>

                {/* Card - Clientes */}
                <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-6 flex flex-col justify-between h-32 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="p-3 bg-indigo-100/50 rounded-2xl text-indigo-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                            Total
                        </span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-slate-500 mb-1">Clientes Cadastrados</p>
                        <h3 className="text-2xl font-bold text-slate-800">
                            {loading ? <span className="animate-pulse bg-slate-200 rounded h-8 w-16 block"></span> : stats.newClients}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* LISTA RECENTE */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Truck className="h-5 w-5 text-emerald-500" />
                            Atividades Recentes
                        </h3>
                        <button onClick={() => navigate('/service-orders')} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Ver tudo</button>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />
                            ))
                        ) : recentActivities?.length === 0 ? (
                            <p className="text-center text-slate-400 py-4">Nenhuma atividade recente.</p>
                        ) : (
                            recentActivities.map((os) => (
                                <div key={os.id} onClick={() => navigate(`/service-orders/${os.id}`)} className="flex items-center justify-between p-2 md:p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group gap-2 md:gap-3">
                                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                                        <div className="w-8 h-8 md:w-12 md:h-12 shrink-0 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <ClipboardList className="h-4 w-4 md:h-5 md:w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs md:text-sm font-bold text-slate-800 truncate">{os.cliente_nome || 'Cliente sem nome'}</p>
                                            <div className="flex items-center gap-1 text-[10px] md:text-xs text-slate-500 whitespace-nowrap overflow-hidden">
                                                <span className="shrink-0">#{os.id.slice(0, 6)}</span>
                                                {os.tecnico?.nome_completo && (
                                                    <>
                                                        <span className="shrink-0">•</span>
                                                        <span className="truncate max-w-[80px] md:max-w-none">{os.tecnico.nome_completo.split(' ')[0]}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{formatCurrency(os.valor_total || 0)}</p>
                                        <span className={`text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-medium uppercase whitespace-nowrap ${os.status?.toLowerCase() === 'concluido' || os.status?.toLowerCase() === 'concluida' || os.status?.toLowerCase() === 'concluído' ? 'bg-emerald-100 text-emerald-600' :
                                            os.deslocamento_iniciado_em && os.status !== 'concluido' ? 'bg-blue-100 text-blue-600' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                            {os.status?.toLowerCase() === 'concluido' ? 'Concluído' :
                                                os.deslocamento_iniciado_em && !['concluido', 'concluído'].includes(os.status?.toLowerCase() || '') ? (
                                                    os.previsao_chegada ?
                                                        `Chegada: ${new Date(os.previsao_chegada).getHours().toString().padStart(2, '0')}:${new Date(os.previsao_chegada).getMinutes().toString().padStart(2, '0')}` :
                                                        'Deslocamento'
                                                ) :
                                                    os.status || 'Pendente'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* DESPESAS PENDENTES (Somente Admin) */}
                {userData?.cargo === 'admin' && (
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-6 border-l-4 border-amber-400">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Despesas Pendentes
                            </h3>
                            <button onClick={() => navigate('/financial')} className="text-sm font-medium text-amber-600 hover:text-amber-700">Gerenciar</button>
                        </div>

                        <div className="space-y-4">
                            {loading ? (
                                <div className="h-16 bg-slate-50 rounded-2xl animate-pulse" />
                            ) : pendingExpenses.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="h-12 w-12 text-emerald-200 mx-auto mb-2" />
                                    <p className="text-slate-400">Tudo em dia! Nenhuma despesa pendente.</p>
                                </div>
                            ) : (
                                pendingExpenses.map((expense) => (
                                    <div key={expense.id} className="flex items-center justify-between p-3 bg-amber-50/50 hover:bg-amber-50 rounded-2xl transition-colors border border-amber-100/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                                                <Receipt className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{expense.descricao}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    {expense.tecnico?.nome_completo?.split(' ')[0] || 'Técnico'} • {new Date(expense.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-800">{formatCurrency(expense.valor)}</p>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-xs text-amber-600 hover:bg-amber-100 mt-1"
                                                onClick={() => navigate('/financial')}
                                            >
                                                Avaliar
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* RASTREAMENTO EM TEMPO REAL (Somente Admin) */}
            {userData?.cargo === 'admin' && (
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-6">
                    <LiveMap />
                </div>
            )}
        </div>
    )
}

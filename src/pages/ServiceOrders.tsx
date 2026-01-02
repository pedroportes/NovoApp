import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Plus, Search, FileText, Calendar, User, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
// import { Database } from '@/types/supabase'

type ServiceOrder = any
// type ServiceOrder = Database['public']['Tables']['ordens_servico']['Row'] & {
//    clientes: { nome_razao: string } | null
//    tecnicos: { nome_completo: string } | null
// }

export function ServiceOrders() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const [orders, setOrders] = useState<ServiceOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const { setFabAction } = useOutletContext<{ setFabAction: (action: (() => void) | null) => void }>() ?? { setFabAction: () => { } }

    useEffect(() => {
        setFabAction(() => navigate('/service-orders/new'))
        return () => setFabAction(null)
    }, [setFabAction])

    useEffect(() => {
        if (userData?.empresa_id) {
            fetchOrders()
        }
    }, [userData?.empresa_id])

    const fetchOrders = async () => {
        try {
            // 1. Fetch OS plain (no joins to avoid ambiguity)
            let query = supabase
                .from('ordens_servico')
                .select('*')
                .eq('empresa_id', userData!.empresa_id)

            // If technician, ONLY see own orders
            if (userData?.cargo?.toLowerCase() === 'tecnico') {
                query = query.eq('tecnico_id', userData.id)
            }

            const { data: osData, error: osError } = await query.order('created_at', { ascending: false })

            if (osError) throw osError

            // 2. Fetch Technicians separately
            // Extract unique tecnico_ids to avoid fetching same user multiple times
            const tecnicoIds = Array.from(new Set(osData.map((os: any) => os.tecnico_id).filter(Boolean)))

            let techMap: Record<string, string> = {}

            if (tecnicoIds.length > 0) {
                const { data: techData, error: techError } = await supabase
                    .from('usuarios')
                    .select('id, nome_completo')
                    .in('id', tecnicoIds)

                if (!techError && techData) {
                    techData.forEach((t: any) => {
                        techMap[t.id] = t.nome_completo
                    })
                }
            }

            // 3. Merge data
            const formattedData = (osData as any).map((item: any) => ({
                ...item,
                tecnicos: { nome_completo: techMap[item.tecnico_id] || 'Técnico ex-funcionário' }
            }))

            setOrders(formattedData)
        } catch (error) {
            console.error('Erro ao buscar OS:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredOrders = orders.filter(os =>
        (os.cliente_nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatCurrency = (value: number | null) => {
        if (!value) return 'R$ 0,00'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR')
    }

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('ordens_servico')
                .delete()
                .eq('id', id)

            if (error) throw error

            setOrders(orders.filter(os => os.id !== id))
        } catch (error) {
            console.error('Erro ao excluir:', error)
            alert('Erro ao excluir OS')
        }
    }

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'aprovado': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
            case 'em andamento': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            case 'pendente': return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            case 'concluído': return 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
            default: return 'bg-slate-100 text-slate-500 border-slate-200'
        }
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex justify-end mb-4">
                <Button className="h-14 text-base md:w-auto w-full shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold" onClick={() => navigate('/service-orders/new')}>
                    <Plus className="mr-2 h-5 w-5" />
                    Nova OS
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-4 h-6 w-6 text-emerald-500/50" />
                <Input
                    placeholder="Buscar por cliente ou ID..."
                    className="pl-14 h-14 text-lg shadow-xl shadow-emerald-500/5 border-0 bg-white/80 backdrop-blur-xl rounded-2xl focus:ring-2 focus:ring-emerald-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-20 text-emerald-600 font-medium animate-pulse">Carregando ordens de serviço...</div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200 mx-4">
                    Nenhuma ordem de serviço encontrada.
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredOrders.map((os) => (
                        <div key={os.id}
                            onClick={() => navigate(`/service-orders/${os.id}`)}
                            className="group relative flex flex-col justify-between rounded-[24px] border border-white bg-white/90 backdrop-blur-xl p-6 shadow-xl shadow-emerald-900/5 hover:shadow-2xl hover:shadow-emerald-900/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden">

                            {/* Decorative gradient blob */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />

                            <div className="flex justify-between items-start mb-5 relative z-10">
                                <div className={`px-4 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusColor(os.status || 'pendente')}`}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                    {(os.status || 'Pendente').toUpperCase()}
                                </div>
                                <span className="text-xs text-slate-400 font-mono tracking-wider">#{os.id.slice(0, 8)}</span>
                            </div>

                            <div className="space-y-4 mb-8 relative z-10">
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-1">Cliente</p>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <span className="font-bold text-slate-700 text-lg truncate flex-1">
                                            {os.cliente_nome || 'Cliente Desconhecido'}
                                        </span>
                                    </div>
                                </div>

                                {os.tecnicos && (
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-1">Técnico Responsável</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                            <span className="font-medium">{os.tecnicos.nome_completo}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-400 font-bold uppercase">Valor Total</span>
                                    <span className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(os.valor_total)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" onClick={(e) => {
                                        e.stopPropagation()
                                        if (confirm('Tem certeza que deseja excluir esta Ordem de Serviço?')) {
                                            handleDelete(os.id)
                                        }
                                    }}>
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:scale-105 transition-all">
                                        <FileText className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

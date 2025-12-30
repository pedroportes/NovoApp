import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, FileText, Calendar, User, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Database } from '@/types/supabase'

type ServiceOrder = Database['public']['Tables']['ordens_servico']['Row'] & {
    clientes: { nome_razao: string } | null
    tecnicos: { nome: string } | null
}

export function ServiceOrders() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const [orders, setOrders] = useState<ServiceOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (userData?.empresa_id) {
            fetchOrders()
        }
    }, [userData?.empresa_id])

    const fetchOrders = async () => {
        try {
            // 1. Fetch OS plain (no joins to avoid ambiguity)
            const { data: osData, error: osError } = await supabase
                .from('ordens_servico')
                .select('*')
                .eq('empresa_id', userData!.empresa_id)
                .order('created_at', { ascending: false })

            if (osError) throw osError

            // 2. Fetch Technicians separately
            // Extract unique tecnico_ids to avoid fetching same user multiple times
            const tecnicoIds = Array.from(new Set(osData.map((os: any) => os.tecnico_id).filter(Boolean)))

            let techMap: Record<string, string> = {}

            if (tecnicoIds.length > 0) {
                const { data: techData, error: techError } = await supabase
                    .from('usuarios')
                    .select('id, nome')
                    .in('id', tecnicoIds)

                if (!techError && techData) {
                    techData.forEach((t: any) => {
                        techMap[t.id] = t.nome
                    })
                }
            }

            // 3. Merge data
            const formattedData = (osData as any).map((item: any) => ({
                ...item,
                tecnicos: { nome: techMap[item.tecnico_id] || 'Técnico ex-funcionário' }
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
            case 'aprovado': return 'bg-green-500/10 text-green-500 border-green-500/20'
            case 'em andamento': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            case 'pendente': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
        }
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex justify-end mb-4">

                <Button className="h-14 text-base md:w-auto w-full shadow-lg" onClick={() => navigate('/service-orders/new')}>
                    <Plus className="mr-2 h-5 w-5" />
                    Nova OS
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Buscar por cliente ou ID..."
                    className="pl-10 h-14 text-lg shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-10">Carregando ordens de serviço...</div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    Nenhuma ordem de serviço encontrada.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredOrders.map((os) => (
                        <div key={os.id}
                            onClick={() => navigate(`/service-orders/${os.id}`)}
                            className="group flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer">

                            <div className="flex justify-between items-start mb-4">
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(os.status || 'pendente')}`}>
                                    {os.status || 'Pendente'}
                                </div>
                                <span className="text-xs text-muted-foreground font-mono">#{os.id.slice(0, 8)}</span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" />
                                    <span className="font-semibold text-lg truncate">
                                        {os.cliente_nome || 'Cliente Desconhecido'}
                                    </span>
                                </div>

                                {os.tecnicos && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        <span>Tec: {os.tecnicos.nome}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDate(os.created_at)}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Valor Total</span>
                                    <span className="text-xl font-bold text-primary">{formatCurrency(os.valor_total)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={(e) => {
                                        e.stopPropagation()
                                        if (confirm('Tem certeza que deseja excluir esta Ordem de Serviço?')) {
                                            handleDelete(os.id)
                                        }
                                    }}>
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
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

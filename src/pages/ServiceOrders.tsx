import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Plus, Search, FileText, Calendar, User, Trash2, Phone, MapPin } from 'lucide-react'
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
            // 1. Fetch OS plain
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

            // 2. Fetch Technicians AND Clients separately
            // Extract IDs
            const tecnicoIds = Array.from(new Set(osData.map((os: any) => os.tecnico_id).filter(Boolean)))
            const clienteIds = Array.from(new Set(osData.map((os: any) => os.cliente_id).filter(Boolean)))

            let techMap: Record<string, string> = {}
            let clientMap: Record<string, any> = {}

            if (tecnicoIds.length > 0) {
                const { data: techData } = await supabase
                    .from('usuarios')
                    .select('id, nome_completo')
                    .in('id', tecnicoIds)

                if (techData) {
                    techData.forEach((t: any) => {
                        techMap[t.id] = t.nome_completo
                    })
                }
            }

            if (clienteIds.length > 0) {
                const { data: clientData } = await supabase
                    .from('clientes')
                    .select('id, whatsapp, telefone, logradouro, numero, cidade, uf')
                    .in('id', clienteIds)

                if (clientData) {
                    clientData.forEach((c: any) => {
                        clientMap[c.id] = c
                    })
                }
            }

            // 3. Merge data
            const formattedData = (osData as any).map((item: any) => ({
                ...item,
                tecnicos: { nome_completo: techMap[item.tecnico_id] || 'Técnico ex-funcionário' },
                clientes: clientMap[item.cliente_id] || null // Attach full client object if found
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

    // Helper to extract address for map query
    const getClientAddress = (os: any) => {
        if (!os.clientes) return ''
        const { logradouro, cidade, uf } = os.clientes
        return `${logradouro || ''} - ${cidade || ''} ${uf || ''}`
    }

    // Helper to get phone
    const getClientPhone = (os: any) => {
        return os.clientes?.whatsapp || os.clientes?.telefone || os.cliente_whatsapp
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex justify-end mb-4 hidden md:flex">
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

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 mt-3 pl-1" onClick={(e) => e.stopPropagation()}>
                                        {getClientPhone(os) && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                    onClick={() => window.open(`tel:${getClientPhone(os)?.replace(/\D/g, '')}`, '_self')}
                                                    title="Ligar"
                                                >
                                                    <Phone className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                    onClick={() => window.open(`https://wa.me/55${getClientPhone(os)?.replace(/\D/g, '')}`, '_blank')}
                                                    title="WhatsApp"
                                                >
                                                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                </Button>
                                            </>
                                        )}
                                        {getClientAddress(os) && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 rounded-full border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getClientAddress(os))}`, '_blank')}
                                                title="Navegar"
                                            >
                                                <MapPin className="h-4 w-4" />
                                            </Button>
                                        )}
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

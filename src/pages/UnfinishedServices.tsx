import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Plus, Search, FileText, Calendar, User, Trash2, Phone, MapPin, Receipt, FileSignature, Pencil, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { SyncService } from '@/services/syncService'
import { useOfflineServiceOrders, useOfflineClients } from '@/hooks/useOfflineData'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'

type ServiceOrder = any

export function UnfinishedServices() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const { orders: rawOrders, loading: loadingOrders } = useOfflineServiceOrders()
    const { clients } = useOfflineClients()
    const [searchTerm, setSearchTerm] = useState('')

    // Delete Modal State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [osToDelete, setOsToDelete] = useState<string | null>(null)

    const orders = (rawOrders || []).map(order => {
        const client = clients?.find(c => c.id === order.cliente_id)
        return {
            ...order,
            clientes: client,
            tecnicos: { nome_completo: 'Técnico' }
        }
    })

    const loading = loadingOrders

    const filteredOrders = orders.filter(os => {
        const term = searchTerm.toLowerCase()

        // ONLY show "Not Done" statuses
        const isNotDoneStatus = ['orcamento', 'nao_feito_outra_empresa', 'nao_feito_ja_realizado', 'nao_feito_cancelado'].includes(os.status?.toLowerCase())
        if (!isNotDoneStatus) return false

        if (!term) return true

        if ((os.cliente_nome || '').toLowerCase().includes(term)) return true
        if (os.id.toLowerCase().includes(term)) return true
        if (os.clientes?.logradouro?.toLowerCase().includes(term)) return true
        if (os.clientes?.cidade?.toLowerCase().includes(term)) return true
        if (os.clientes?.endereco?.toLowerCase().includes(term)) return true
        const cleanedTerm = term.replace(/\D/g, '')
        if (cleanedTerm && (os.clientes?.whatsapp?.replace(/\D/g, '').includes(cleanedTerm))) return true

        return false
    })

    const formatCurrency = (value: number | null) => {
        if (!value) return 'R$ 0,00'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'orcamento': return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            case 'nao_feito_cancelado': return 'bg-red-500/10 text-red-600 border-red-500/20'
            case 'nao_feito_outra_empresa':
            case 'nao_feito_ja_realizado': return 'bg-slate-500/10 text-slate-600 border-slate-500/20'
            default: return 'bg-slate-100 text-slate-600 border-slate-200'
        }
    }

    const handleQuickStatusUpdate = async (osId: string, newStatus: string) => {
        try {
            await SyncService.saveServiceOrder({
                ...orders.find(o => o.id === osId),
                status: newStatus
            })
            toast.success(`Status atualizado para ${newStatus.replace(/_/g, ' ')}`)
        } catch (error) {
            console.error('Erro ao atualizar status:', error)
            toast.error('Erro ao atualizar status')
        }
    }

    const handleDeleteClick = (osId: string) => {
        setOsToDelete(osId)
        setDeleteConfirmOpen(true)
    }

    const confirmDelete = async () => {
        if (!osToDelete) return
        try {
            await SyncService.deleteServiceOrder(osToDelete)
            toast.success('OS excluída com sucesso')
            setDeleteConfirmOpen(false)
            setOsToDelete(null)
        } catch (error) {
            console.error('Erro ao excluir:', error)
            toast.error('Erro ao excluir OS')
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="hidden md:block"></div>
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-xs font-bold">
                    <AlertCircle className="h-4 w-4" />
                    ESTES REGISTROS NÃO GERAM COMISSÃO
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-4 h-6 w-6 text-slate-400" />
                <Input
                    placeholder="Buscar nos históricos de serviços não realizados..."
                    className="pl-14 h-14 text-lg shadow-xl shadow-slate-900/5 border-0 bg-white/80 backdrop-blur-xl rounded-2xl focus:ring-2 focus:ring-slate-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-600 font-medium">Carregando registros...</div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200 mx-4">
                    Nenhum serviço não realizado encontrado.
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredOrders.map((os) => (
                        <div key={os.id}
                            onClick={() => navigate(`/service-orders/${os.id}`)}
                            className="group relative flex flex-col justify-between rounded-[24px] border border-white bg-white/90 backdrop-blur-xl p-6 shadow-xl shadow-slate-900/5 hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden">

                            <div className="flex justify-between items-start mb-5 relative z-10">
                                <Select
                                    value={os.status || 'PENDENTE'}
                                    onValueChange={(value) => handleQuickStatusUpdate(os.id, value)}
                                >
                                    <SelectTrigger onClick={(e) => e.stopPropagation()} className={cn(
                                        "w-fit h-auto px-4 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all outline-none ring-0 focus:ring-0 select-none",
                                        getStatusColor(os.status)
                                    )}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        <SelectValue>
                                            {(os.status || '').replace(/_/g, ' ').toUpperCase()}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent onClick={(e) => e.stopPropagation()} className="rounded-xl shadow-xl border-slate-100">
                                        <SelectItem value="PENDENTE">Pendente</SelectItem>
                                        <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                                        <SelectItem value="CONCLUIDO" className="text-emerald-600 font-bold">Concluído</SelectItem>
                                        <SelectItem value="ORCAMENTO">Somente Orçamento</SelectItem>
                                        <SelectItem value="NAO_FEITO_CANCELADO">Cancelado</SelectItem>
                                        <SelectItem value="NAO_FEITO_OUTRA_EMPRESA">Outra Empresa</SelectItem>
                                    </SelectContent>
                                </Select>
                                <span className="text-xs text-slate-400 font-mono tracking-wider">#{os.id.slice(0, 8)}</span>
                            </div>

                            <div className="space-y-4 mb-8 relative z-10">
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-1">Cliente</p>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <span className="font-bold text-slate-700 text-lg truncate flex-1">
                                            {os.cliente_nome || 'Cliente Desconhecido'}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-1">Valor do Orçamento</p>
                                    <span className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(os.valor_total)}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                                <div className="text-xs text-slate-400 font-medium">
                                    {new Date(os.created_at || os.data_agendamento).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteClick(os.id)
                                    }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50" onClick={(e) => {
                                        e.stopPropagation()
                                        navigate(`/service-orders/${os.id}`)
                                    }}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar exclusão</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir esta Ordem de Serviço? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

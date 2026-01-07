import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Plus, Search, FileText, Calendar, User, Trash2, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useLicenseCheck } from '@/hooks/useLicenseCheck'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { SyncService } from '@/services/syncService'
import { useOfflineServiceOrders, useOfflineClients } from '@/hooks/useOfflineData'

type ServiceOrder = any

export function ServiceOrders() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const { orders: rawOrders, loading: loadingOrders } = useOfflineServiceOrders()
    const { clients } = useOfflineClients()
    const [searchTerm, setSearchTerm] = useState('')

    // License Check
    const { canAddOS, isTrialExpired, usage, limits } = useLicenseCheck()
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)
    const [upgradeMessage, setUpgradeMessage] = useState('')

    const handleNewOSClick = useCallback(() => {
        if (!canAddOS) {
            if (isTrialExpired) {
                setUpgradeMessage("Seu período de teste expirou. Assine um plano para continuar criando Ordens de Serviço.")
            } else {
                setUpgradeMessage(`Você atingiu o limite de ${limits.os} OS do plano gratuito.`)
            }
            setShowUpgradeModal(true)
            return
        }
        navigate('/service-orders/new')
    }, [canAddOS, isTrialExpired, limits.os, navigate])

    // Delete Modal State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [osToDelete, setOsToDelete] = useState<string | null>(null)

    // ... (Enrichment logic stays same)
    const orders = (rawOrders || []).map(order => {
        const client = clients?.find(c => c.id === order.cliente_id)
        return {
            ...order,
            clientes: client,
            tecnicos: { nome_completo: 'Técnico' }
        }
    })

    const loading = loadingOrders
    const [isNavDialogOpen, setIsNavDialogOpen] = useState(false)
    const [selectedOsForNav, setSelectedOsForNav] = useState<any>(null)
    const [etaMinutes, setEtaMinutes] = useState('')

    const handleNavigationStart = async (app: 'waze' | 'google') => {
        // ... (existing logic)
        if (!selectedOsForNav) return
        const updates: any = { deslocamento_iniciado_em: new Date().toISOString() }
        if (etaMinutes) {
            const minutes = parseInt(etaMinutes)
            if (!isNaN(minutes)) {
                const arrivalTime = new Date()
                arrivalTime.setMinutes(arrivalTime.getMinutes() + minutes)
                updates.previsao_chegada = arrivalTime.toISOString()
            }
        }
        const { error } = await supabase.from('ordens_servico').update(updates).eq('id', selectedOsForNav.id)
        if (error) console.error('Erro ao atualizar deslocamento:', error)
        const address = getClientAddress(selectedOsForNav)
        const encodedAddress = encodeURIComponent(address)
        if (app === 'waze') window.open(`https://waze.com/ul?q=${encodedAddress}&navigate=yes`, '_blank')
        else window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
    }

    const { setFabAction } = useOutletContext<{ setFabAction: (action: (() => void) | null) => void }>() ?? { setFabAction: () => { } }

    useEffect(() => {
        setFabAction(() => handleNewOSClick)
        return () => setFabAction(null)
    }, [setFabAction, handleNewOSClick])

    // fetchOrders removed in favor of useOfflineServiceOrders hook

    const filteredOrders = orders.filter(os => {
        const term = searchTerm.toLowerCase()
        if (!term) return true

        // Search by client name
        if ((os.cliente_nome || '').toLowerCase().includes(term)) return true
        // Search by ID
        if (os.id.toLowerCase().includes(term)) return true
        // Search by address
        if (os.clientes?.logradouro?.toLowerCase().includes(term)) return true
        if (os.clientes?.cidade?.toLowerCase().includes(term)) return true
        if (os.clientes?.endereco?.toLowerCase().includes(term)) return true
        // Search by phone
        const cleanedTerm = term.replace(/\D/g, '') // Remove non-digits for phone matching
        if (cleanedTerm && (os.clientes?.whatsapp?.replace(/\D/g, '').includes(cleanedTerm))) return true
        // LocalClient doesn't strictly have 'telefone' in TS definition, cast to any if legacy data exists
        if (cleanedTerm && ((os.clientes as any)?.telefone?.replace(/\D/g, '').includes(cleanedTerm))) return true
        // Top level cliente_whatsapp might not exist on enriched local object
        // if (cleanedTerm && (os.cliente_whatsapp?.replace(/\D/g, '').includes(cleanedTerm))) return true 

        return false
    })

    const formatCurrency = (value: number | null) => {
        if (!value) return 'R$ 0,00'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR')
    }

    const confirmDelete = async () => {
        if (!osToDelete) return
        try {
            await SyncService.deleteServiceOrder(osToDelete)
            setDeleteConfirmOpen(false)
            setOsToDelete(null)
        } catch (error) {
            console.error('Erro ao excluir:', error)
            alert('Erro ao excluir OS')
        }
    }

    const getStatusColor = (status: string, hasDeslocamento?: boolean) => {
        // Se está em deslocamento ativo (e não concluído), mostrar como azul
        if (hasDeslocamento && !['concluído', 'concluido'].includes(status?.toLowerCase())) {
            return 'bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
        }

        switch (status?.toLowerCase()) {
            case 'pendente': return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
            case 'em andamento': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            case 'concluido':
            case 'concluído': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            case 'cancelado': return 'bg-red-500/10 text-red-600 border-red-500/20'
            default: return 'bg-slate-100 text-slate-600 border-slate-200'
        }
    }

    // Helper to extract address for map query - updated for LocalServiceOrder structure
    // useOfflineServiceOrders hook should return relations joined if implementation allows, 
    // OR it returns ids and we might need to join recursively?
    // Actually, dexie-react-hooks useLiveQuery in useOfflineData.ts *does* attempt to join if we programmed it to.
    // Let's check useOfflineData.ts. If it joins 'clientes', then 'os.clientes' property exists.
    // If not, we might need to fetch clients separately or useOfflineClients().
    // Assuming for now the hook maps it or we need to adjust.

    // Inspecting useOfflineData.ts previously: it did:
    // const oss = await db.ordens_servico.orderBy('created_at').reverse().toArray()
    // const clients = await db.clientes.toArray()
    // const techs = await db.usuarios? or we don't have local users table yet? 
    // We don't have local 'usuarios' table in db.ts yet! 
    // So 'tecnicos.nome_completo' might be missing.
    // We need to robustly handle missing relations.

    // Helper to extract address for map query
    const getClientAddress = (os: ServiceOrder) => {
        const c = os.clientes
        if (!c) return ''
        return `${c.logradouro || ''}, ${c.numero || ''} - ${c.bairro || ''}, ${c.cidade || ''}`
    }

    // Helper to get phone
    const getClientPhone = (os: ServiceOrder) => {
        // Tries to find phone in multiple places
        return os.clientes?.whatsapp || (os.clientes as any)?.telefone || os.cliente_whatsapp
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Ordens de Serviço</h1>
                    <p className="text-slate-500 font-medium mt-1">Gerencie sua empresa com eficiência. <span className='text-xs ml-2 opacity-50'>{userData?.email}</span></p>
                </div>
                <Button onClick={handleNewOSClick} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 rounded-2xl h-12 px-6 font-bold transition-all hover:scale-105 active:scale-95">
                    <Plus className="mr-2 h-5 w-5" />
                    Nova OS
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-4 h-6 w-6 text-emerald-500/50" />
                <Input
                    placeholder="Buscar por cliente, endereço, telefone ou ID..."
                    className="pl-14 h-14 text-lg shadow-xl shadow-emerald-500/5 border-0 bg-white/80 backdrop-blur-xl rounded-2xl focus:ring-2 focus:ring-emerald-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                description={upgradeMessage}
            />

            {loading ? (
                <div className="text-center py-20 text-emerald-600 font-medium">Carregando ordens de serviço...</div>
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
                                <div className={`px-4 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusColor(os.status || 'pendente', !!os.deslocamento_iniciado_em)}`}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                    {os.deslocamento_iniciado_em && !['concluído', 'concluido'].includes(os.status?.toLowerCase() || '')
                                        ? 'EM DESLOCAMENTO'
                                        : (os.status || 'Pendente').toUpperCase()}
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
                                                    onClick={() => {
                                                        const cleanPhone = getClientPhone(os)?.replace(/\D/g, '') || ''
                                                        const techName = (userData as any)?.nome || (userData as any)?.nome_completo || 'Técnico'
                                                        const firstName = techName.split(' ')[0]
                                                        const address = getClientAddress(os)

                                                        const message = `Olá ${os.cliente_nome?.split(' ')[0] || 'Cliente'}, eu sou o técnico ${firstName} e logo vou para seu endereço...\n${address}`

                                                        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank')
                                                    }}
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
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedOsForNav(os)
                                                    setEtaMinutes('') // Reset input using empty string
                                                    setIsNavDialogOpen(true)
                                                }}
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
                                        setOsToDelete(os.id)
                                        setDeleteConfirmOpen(true)
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

            {/* Modal de Exclusão */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-2xl border-0 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-800">Confirmar Exclusão</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Tem certeza que deseja excluir esta Ordem de Serviço? Esta ação removerá o item do sistema.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="rounded-xl border-slate-200">
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 rounded-xl">
                            Excluir OS
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isNavDialogOpen} onOpenChange={setIsNavDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-2xl border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-800">Iniciar Navegação</DialogTitle>
                        <DialogDescription>
                            Escolha o aplicativo para navegar até o cliente:<br />
                            <span className="font-semibold text-slate-700">{selectedOsForNav ? getClientAddress(selectedOsForNav) : ''}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600">Previsão GPS (minutos)</label>
                            <Input
                                type="number"
                                placeholder="Ex: 20"
                                className="h-12 text-lg bg-slate-50 border-slate-200"
                                value={etaMinutes}
                                onChange={e => setEtaMinutes(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button
                                className="flex-1 h-20 flex-col gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl"
                                onClick={() => handleNavigationStart('waze')}
                            >
                                <span className="text-2xl">🚙</span>
                                <span className="font-bold">Waze</span>
                            </Button>
                            <Button
                                className="flex-1 h-20 flex-col gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl"
                                onClick={() => handleNavigationStart('google')}
                            >
                                <span className="text-2xl">🗺️</span>
                                <span className="font-bold">Google Maps</span>
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Plus, Search, FileText, Calendar, User, Trash2, Phone, MapPin, Receipt, FileSignature, Pencil, FileBadge, Loader2, Mic, MicOff, Building2, RefreshCw, AlertCircle } from 'lucide-react'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { SearchAssistant, SmartFilter } from '@/services/searchAssistant'
import { FocusNFeService } from '@/services/focusNFeService'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useBrand } from '@/contexts/BrandContext'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SyncService } from '@/services/syncService'
import { useOfflineServiceOrders, useOfflineClients, useOfflineTechnicians } from '@/hooks/useOfflineData'

type ServiceOrder = any

export function ServiceOrders() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const { orders: rawOrders, loading: loadingOrders } = useOfflineServiceOrders()
    const { clients } = useOfflineClients()
    const { technicians: offlineTechs } = useOfflineTechnicians()
    const { brands, selectedBrandId } = useBrand()

    const [dbTechnicians, setDbTechnicians] = useState<any[]>([])

    // Sincroniza dados fiscais de NFS-e do Supabase para o banco offline local
    useEffect(() => {
        if (!userData?.empresa_id) return
        supabase
            .from('ordens_servico')
            .select('id, nfe_status, nfe_ref, nfe_numero, nfe_pdf_url, nfe_mensagem_erro')
            .eq('empresa_id', userData.empresa_id)
            .not('nfe_status', 'is', null)
            .then(async ({ data }) => {
                if (data && data.length > 0) {
                    for (const item of data) {
                        try {
                            const pdfLink = item.nfe_pdf_url || (item as any).nfe_url_pdf || null
                            await db.ordens_servico.update(item.id, {
                                nfe_status: item.nfe_status,
                                nfe_ref: item.nfe_ref,
                                nfe_numero: item.nfe_numero,
                                nfe_url_pdf: pdfLink,
                                nfe_pdf_url: pdfLink,
                                nfe_mensagem_erro: item.nfe_mensagem_erro,
                                synced: 1
                            })
                        } catch (e) {
                            console.warn('Erro ao sincronizar OS local:', e)
                        }
                    }
                }
            })
    }, [userData?.empresa_id])

    // Busca técnicos parceiros do banco para garantir nomes reais
    useEffect(() => {
        if (!userData?.empresa_id) return
        supabase
            .from('usuarios')
            .select('id, nome, nome_completo, email')
            .eq('empresa_id', userData.empresa_id)
            .then(({ data }) => {
                if (data && data.length > 0) {
                    setDbTechnicians(data)
                }
            })
    }, [userData?.empresa_id])

    const [searchTerm, setSearchTerm] = useState('')
    const [smartFilter, setSmartFilter] = useState<SmartFilter | null>(null)

    const { isListening, startListening, stopListening } = useVoiceRecognition({
        onResult: (transcript) => {
            const parsed = SearchAssistant.parseQuery(transcript)
            setSmartFilter(parsed)
            setSearchTerm(parsed.term || transcript)
        }
    })

    // License Check
    const { canAddOS, isTrialExpired, usage, limits } = useLicenseCheck()
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)
    const [upgradeMessage, setUpgradeMessage] = useState('')

    const handleNewOSClick = useCallback(() => {
        if (!canAddOS) {
            if (isTrialExpired) {
                setUpgradeMessage("Seu período de teste expirou. Assine um plano para continuar criando Ordens de Serviço.")
            } else {
                setUpgradeMessage(`Você atingiu o limite de ${limits?.os || 10} OS do plano gratuito.`)
            }
            setShowUpgradeModal(true)
            return
        }
        navigate('/service-orders/new')
    }, [canAddOS, isTrialExpired, limits.os, navigate])

    // Delete Modal State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [osToDelete, setOsToDelete] = useState<string | null>(null)
    const [cancelModalOpen, setCancelModalOpen] = useState(false)
    const [osToCancel, setOsToCancel] = useState<any | null>(null)
    const [cancelJustificativa, setCancelJustificativa] = useState('Cancelamento de serviço solicitado pelo cliente')
    const [isCanceling, setIsCanceling] = useState(false)
    const [emittingIds, setEmittingIds] = useState<Set<string>>(new Set())
    const [syncing, setSyncing] = useState(false)
    const [displayLimit, setDisplayLimit] = useState(24)

    // Reseta paginação quando o usuário pesquisa ou troca de marca
    useEffect(() => {
        setDisplayLimit(24)
    }, [searchTerm, selectedBrandId, smartFilter])

    const handleManualSync = async () => {
        if (!userData?.empresa_id || syncing) return
        setSyncing(true)
        toast.info('Sincronizando todas as ordens de serviço da nuvem...')
        try {
            await SyncService.pullAllData(userData.empresa_id)
            toast.success('Todas as ordens de serviço foram sincronizadas!')
        } catch (error: any) {
            console.error('Erro na sincronização manual:', error)
            toast.error('Erro ao sincronizar: ' + error.message)
        } finally {
            setSyncing(false)
        }
    }

    // Combina técnicos locais e remotos
    const allTechnicians = dbTechnicians.length > 0 ? dbTechnicians : (offlineTechs || [])

    // Enriquecimento com técnicos reais e dados da marca
    const orders = (rawOrders || [])
        .map(order => {
            const client = clients?.find(c => c.id === order.cliente_id)
            const tech = allTechnicians.find((t: any) => t.id === order.tecnico_id)
            const techName = tech?.nome_completo || tech?.nome || (order.tecnico_id ? 'Técnico Parceiro' : null)
            
            // Prioridade de identificação da marca:
            // 1. Marca expressa na OS (order.marca_id)
            // 2. Marca cadastrada no cliente (client?.marca_id)
            // 3. Fallback para Matriz Hidro Curitiba / primeira marca do grupo
            const brandId = order.marca_id || client?.marca_id
            const fallbackBrand = brands?.find(b => b.matriz) || (brands && brands.length > 0 ? brands[0] : null)
            const marca = (brands && brands.length > 0)
                ? (brands.find(b => b.id === brandId) || fallbackBrand)
                : null

            return {
                ...order,
                clientes: client,
                marca: marca,
                tecnicos: techName ? { nome_completo: techName } : null
            }
        })

    const loading = loadingOrders
    const [isNavDialogOpen, setIsNavDialogOpen] = useState(false)
    const [selectedOsForNav, setSelectedOsForNav] = useState<any>(null)
    const [etaMinutes, setEtaMinutes] = useState('')

    const handleNavigationStart = async (app: 'waze' | 'google') => {
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
        setFabAction(handleNewOSClick)
        return () => setFabAction(null)
    }, [setFabAction, handleNewOSClick])

    const filteredOrders = orders.filter(os => {
        const term = searchTerm.toLowerCase()

        // Filtro por marca se estiver selecionada no seletor do topo
        if (selectedBrandId && selectedBrandId !== 'all') {
            if (os.marca_id && os.marca_id !== selectedBrandId) return false
        }

        // Strictly hide "Not Done" statuses from the main list unless explicitly filtered.
        const osStatus = os.status?.toLowerCase()
        const isNotDoneStatus = ['orcamento', 'nao_feito_outra_empresa', 'nao_feito_ja_realizado', 'nao_feito_cancelado'].includes(osStatus)

        if (smartFilter?.status) {
            if (osStatus !== smartFilter.status) return false
        } else if (isNotDoneStatus) {
            return false
        }

        // Filter by City if smartFilter has it
        if (smartFilter?.city && !(os.clientes?.cidade || '').toLowerCase().includes(smartFilter.city.toLowerCase())) {
            return false
        }

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
        const cleanedTerm = term.replace(/\D/g, '')
        if (cleanedTerm && (os.clientes?.whatsapp?.replace(/\D/g, '').includes(cleanedTerm))) return true
        if (cleanedTerm && ((os.clientes as any)?.telefone?.replace(/\D/g, '').includes(cleanedTerm))) return true

        return false
    })

    const formatCurrency = (value: number | null) => {
        if (!value) return 'R$ 0,00'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR')
    }

    // Ordenação do mais recém-criado (topo) para o mais antigo (final)
    const sortedOrders = [...filteredOrders].sort((a, b) => {
        const getTime = (val: any) => {
            if (!val) return 0;
            const d = new Date(val).getTime();
            return isNaN(d) ? 0 : d;
        };
        const tA = getTime(a.created_at) || getTime(a.updated_at) || getTime(a.data_agendamento);
        const tB = getTime(b.created_at) || getTime(b.updated_at) || getTime(b.data_agendamento);
        return tB - tA;
    });

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

    const handleGenerateDoc = async (os: any, type: string) => {
        const column = type === 'ORCAMENTO' ? 'orcamento_gerado' : type === 'RECIBO' ? 'recibo_gerado' : 'contrato_gerado'

        try {
            const effectiveBrandId = os.marca?.id || os.marca_id || os.clientes?.marca_id
            await SyncService.saveServiceOrder({
                ...os,
                marca_id: effectiveBrandId || os.marca_id,
                [column]: true
            })
            window.open(`/print/service-orders/${os.id}?type=${type}`, '_blank')
        } catch (error) {
            console.error('Erro ao marcar documento:', error)
            window.open(`/print/service-orders/${os.id}?type=${type}`, '_blank')
        }
    }

    const handleQuickStatusUpdate = async (osId: string, newStatus: string) => {
        try {
            const rawOs = orders.find(o => o.id === osId)
            if (!rawOs) return

            // Limpa campos enriquecidos que não pertencem à tabela 'ordens_servico' no Dexie
            const { clientes, tecnicos, marca, ...osData } = rawOs as any

            const updatedOs = {
                ...osData,
                status: newStatus
            }

            if (newStatus === 'CONCLUIDO') {
                const items = Array.isArray(updatedOs.itens) ? updatedOs.itens : []
                const total = items.reduce((sum: number, item: any) => {
                    const price = parseFloat(item.valor) || 0
                    const qty = parseInt(item.quantidade) || 1
                    return sum + (price * qty)
                }, 0)
                if (total > 0) {
                    updatedOs.valor_total = total
                }
            }

            await SyncService.saveServiceOrder(updatedOs)
            toast.success(`Status atualizado para ${newStatus.replace(/_/g, ' ')}`)
        } catch (error) {
            console.error('Erro ao atualizar status:', error)
            toast.error('Erro ao atualizar status')
        }
    }

    const handleCancelNFe = async () => {
        if (!osToCancel) return
        if (!cancelJustificativa || cancelJustificativa.trim().length < 10) {
            toast.error('Informe uma justificativa com no mínimo 10 caracteres para o cancelamento.')
            return
        }

        const ref = osToCancel.nfe_ref
        if (!ref) {
            toast.error('Referência fiscal da nota não encontrada.')
            return
        }

        try {
            setIsCanceling(true)
            toast.info('Enviando solicitação de cancelamento para a prefeitura...')

            const res = await FocusNFeService.cancelarNotaFiscal(ref, cancelJustificativa.trim(), osToCancel.empresa_id)

            // Atualiza status local e remoto
            await db.ordens_servico.update(osToCancel.id, {
                nfe_status: 'cancelado',
                synced: 1
            })
            await supabase.from('ordens_servico').update({
                nfe_status: 'cancelado'
            }).eq('id', osToCancel.id)

            toast.success('NFS-e cancelada com sucesso na prefeitura!', { duration: 6000 })
            setCancelModalOpen(false)
            setOsToCancel(null)
        } catch (err: any) {
            console.error('Erro ao cancelar NFS-e:', err)
            // Se a prefeitura informou que está em processamento de cancelamento:
            if (err.message && (err.message.includes('Não processado') || err.message.includes('Aguardando validação'))) {
                await db.ordens_servico.update(osToCancel.id, {
                    nfe_status: 'processando_cancelamento',
                    synced: 1
                })
                await supabase.from('ordens_servico').update({
                    nfe_status: 'processando_cancelamento'
                }).eq('id', osToCancel.id)

                toast.info('Cancelamento enviado! A prefeitura está processando a anulação da nota.', { duration: 6000 })
                setCancelModalOpen(false)
                setOsToCancel(null)
            } else {
                toast.error(`Erro ao cancelar NFS-e: ${err.message || 'Falha na comunicação'}`, { duration: 7000 })
            }
        } finally {
            setIsCanceling(false)
        }
    }

    const handleQuickEmitNFe = async (os: any) => {
        const osId = typeof os === 'string' ? os : os.id
        const currentOs = typeof os === 'string' ? (serviceOrders.find(item => item.id === osId) || os) : os

        try {
            setEmittingIds(prev => new Set(prev).add(osId))

            // 1. Se já tem URL do PDF e está autorizada, abre direto
            if (currentOs?.nfe_url_pdf && (currentOs?.nfe_status === 'autorizado' || currentOs?.nfe_status === 'autorizada')) {
                window.open(currentOs.nfe_url_pdf, '_blank')
                return
            }

            // Se a nota deu erro anteriormente ou foi cancelada, força nova emissão gerando novo ref
            const isErroOuCancelada = currentOs?.nfe_status === 'erro_autorizacao' || currentOs?.nfe_status === 'erro' || currentOs?.nfe_status === 'cancelado'
            let refParaConsultar = isErroOuCancelada ? null : currentOs?.nfe_ref

            // 2. Se não tem ref (ou deu erro antes), dispara a emissão inicial
            if (!refParaConsultar) {
                toast.info('Enviando NFS-e para a prefeitura via Focus NFe...')
                const result = await FocusNFeService.emitirNotaFiscal(osId)
                refParaConsultar = result?.ref || null
                
                if (refParaConsultar) {
                    await db.ordens_servico.update(osId, {
                        nfe_status: 'processando_autorizacao',
                        nfe_ref: refParaConsultar,
                        synced: 1
                    })
                    await supabase.from('ordens_servico').update({
                        nfe_status: 'processando_autorizacao',
                        nfe_ref: refParaConsultar,
                    }).eq('id', osId)
                }
            }

            if (!refParaConsultar) {
                throw new Error('Não foi possível obter a referência da nota para acompanhamento.')
            }

            // 3. POLLING ATIVO: Consulta a cada 2.5s por até 10 tentativas (25s) até autorizar
            toast.info('Aguardando autorização da prefeitura (verificando retorno)...', { duration: 4000 })
            
            let autorizada = false
            let tentativas = 0
            const maxTentativas = 10

            while (tentativas < maxTentativas && !autorizada) {
                tentativas++
                await new Promise(resolve => setTimeout(resolve, 2500))

                try {
                    const data = await FocusNFeService.consultarNotaFiscal(refParaConsultar, currentOs?.empresa_id)

                    if (data.status === 'autorizado' || data.status === 'autorizada') {
                        autorizada = true
                        const pdfHost = (data.caminho_danfe && data.caminho_danfe.startsWith('http'))
                            ? ''
                            : (currentOs?.nfe_ambiente === 'producao' ? 'https://api.focusnfe.com.br' : 'https://homologacao.focusnfe.com.br')
                        const pdfUrl = data.url_danfse || (data.caminho_danfe ? (`${pdfHost}${data.caminho_danfe}`) : null)
                        const nroNota = String(data.numero || data.numero_dps || '')

                        // Atualiza no banco local e nuvem
                        await db.ordens_servico.update(osId, {
                            nfe_status: 'autorizado',
                            nfe_url_pdf: pdfUrl,
                            nfe_pdf_url: pdfUrl,
                            nfe_numero: nroNota,
                            synced: 1
                        })
                        await supabase.from('ordens_servico').update({
                            nfe_status: 'autorizado',
                            nfe_url_pdf: pdfUrl,
                            nfe_pdf_url: pdfUrl,
                            nfe_numero: nroNota,
                        }).eq('id', osId)

                        toast.success(`🎉 NFS-e nº ${nroNota || ''} AUTORIZADA com sucesso! Abrindo PDF...`, { duration: 6000 })
                        if (pdfUrl) {
                            window.open(pdfUrl, '_blank')
                        }
                        return
                    } else if (data.status === 'erro_autorizacao' || data.status === 'erro') {
                        const msgErro = data.erros?.[0]?.mensagem || data.motivo_status || 'Erro retornado pela prefeitura'
                        await db.ordens_servico.update(osId, {
                            nfe_status: 'erro_autorizacao',
                            nfe_mensagem_erro: msgErro,
                            synced: 1
                        })
                        await supabase.from('ordens_servico').update({
                            nfe_status: 'erro_autorizacao',
                            nfe_mensagem_erro: msgErro,
                        }).eq('id', osId)

                        toast.error(`NFS-e Rejeitada: ${msgErro}`, { duration: 7000 })
                        return
                    }
                } catch (pollErr: any) {
                    console.warn('Tentativa de consulta:', pollErr.message)
                }
            }

            if (!autorizada) {
                toast.info('A nota ainda está sendo processada pela prefeitura. Clique no botão de status para checar novamente.', { duration: 6000 })
            }

        } catch (error: any) {
            console.error('Erro ao emitir NFe:', error)
            toast.error(`Erro ao emitir NFS-e: ${error.message}`)
        } finally {
            setEmittingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(osId)
                return newSet
            })
        }
    }

    const normalizePhoneForWhatsApp = (rawPhone: string | null | undefined): string => {
        if (!rawPhone) return ''
        let clean = rawPhone.replace(/\D/g, '').replace(/^0+/, '')
        // Se tem 8 ou 9 dígitos (ex: 984501037), está sem DDD. Sede em Curitiba/RMC = DDD 41
        if (clean.length === 8 || clean.length === 9) {
            clean = '41' + clean
        }
        // Se tem 10 ou 11 dígitos, adiciona DDI 55
        if (clean.length === 10 || clean.length === 11) {
            clean = '55' + clean
        }
        return clean
    }

    const handleShareNFeWhatsApp = (os: ServiceOrder) => {
        const cleanPhone = normalizePhoneForWhatsApp(getClientPhone(os))
        const clientFirstName = (os.cliente_nome || 'Cliente').split(' ')[0]
        const brandName = os.marca?.nome || 'Desentupidora Hidro Curitiba'
        const pdfUrl = os.nfe_url_pdf || os.nfe_pdf_url || ''
        const nfNumber = os.nfe_numero || ''
        const valorFormatado = (os.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

        const message = `Olá, *${clientFirstName}*! Tudo bem?\n\nSegue a sua *Nota Fiscal de Serviço Eletrônica (NFS-e nº ${nfNumber})* referente ao atendimento da *${brandName}*:\n\n📄 *Acesse e baixe o seu DANFSe em PDF:*\n${pdfUrl}\n\n💰 *Valor:* ${valorFormatado}\n\nAgradecemos pela preferência e confiança! Qualquer dúvida, estamos sempre à disposição.`

        if (cleanPhone) {
            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank')
        } else {
            toast.info('Cliente sem telefone cadastrado. Selecione o contato no WhatsApp.')
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
        }
    }

    const getStatusColor = (status: string, hasDeslocamento?: boolean) => {
        if (hasDeslocamento && !['concluído', 'concluido'].includes(status?.toLowerCase())) {
            return 'bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
        }

        switch (status?.toLowerCase()) {
            case 'pendente': return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
            case 'em andamento':
            case 'em_andamento': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            case 'concluido':
            case 'concluído': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
            case 'orcamento': return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            case 'cancelado':
            case 'nao_feito_cancelado': return 'bg-red-500/10 text-red-600 border-red-500/20'
            case 'nao_feito_outra_empresa':
            case 'nao_feito_ja_realizado': return 'bg-slate-500/10 text-slate-600 border-slate-500/20'
            default: return 'bg-slate-100 text-slate-600 border-slate-200'
        }
    }

    const getClientAddress = (os: ServiceOrder) => {
        const c = os.clientes
        if (!c) {
            return (os as any).cliente_endereco || (os as any).endereco || ''
        }
        if (c.logradouro) {
            const parts = [
                `${c.logradouro}${c.numero ? `, ${c.numero}` : ''}`,
                c.bairro || '',
                c.cidade || ''
            ].filter(Boolean)
            return parts.join(' - ')
        }
        return c.endereco || (os as any).cliente_endereco || (os as any).endereco || ''
    }

    const getClientPhone = (os: ServiceOrder) => {
        return os.clientes?.whatsapp || (os.clientes as any)?.telefone || os.cliente_whatsapp
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Ordens de Serviço</h1>
                    <p className="text-slate-500 text-sm mt-1">Gerencie os atendimentos e serviços da sua empresa.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button 
                        variant="outline"
                        type="button"
                        onClick={handleManualSync}
                        disabled={syncing}
                        className="flex-1 md:flex-initial gap-2 rounded-xl h-11 px-3 sm:px-4 border-slate-200 text-slate-700 hover:bg-slate-50 transition-all font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0"
                        title="Buscar todas as ordens de serviço atualizadas do banco"
                    >
                        <RefreshCw className={`h-4 w-4 text-emerald-600 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Sincronizando...' : 'Atualizar Dados'}
                    </Button>
                    <Button onClick={handleNewOSClick} className="flex-1 md:flex-initial gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 text-white rounded-xl h-11 px-3 sm:px-5 font-bold transition-all text-xs sm:text-sm whitespace-nowrap shrink-0">
                        <Plus className="h-4 sm:h-5 w-4 sm:w-5 shrink-0" />
                        <span className="hidden sm:inline">Nova Ordem de Serviço</span>
                        <span className="sm:hidden">Nova OS</span>
                    </Button>
                </div>
            </div>

            

            {/* Smart Search Bar */}
            <div className="relative">
                <div className="relative flex items-center">
                    <Search className="absolute left-4 h-5 w-5 text-slate-400" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            if (smartFilter) setSmartFilter(null)
                        }}
                        placeholder="Buscar por cliente, endereço, telefone ou use a voz (ex: 'Ver serviços em Curitiba')"
                        className="pl-12 pr-12 h-14 bg-white border-slate-200/80 rounded-2xl shadow-sm text-base focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                    <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        className={`absolute right-4 p-2 rounded-xl transition-all ${isListening ? 'bg-red-50 text-red-600 animate-pulse' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        title={isListening ? "Parar gravação" : "Pesquisar por voz"}
                    >
                        {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                </div>

                {smartFilter && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-xl w-fit">
                        <span>Filtro inteligente ativo:</span>
                        {smartFilter.status && <span className="bg-emerald-100 px-2 py-0.5 rounded-md">Status: {smartFilter.status}</span>}
                        {smartFilter.city && <span className="bg-emerald-100 px-2 py-0.5 rounded-md">Cidade: {smartFilter.city}</span>}
                        <button onClick={() => setSmartFilter(null)} className="text-emerald-500 hover:text-emerald-800 ml-1 font-bold">×</button>
                    </div>
                )}
            </div>

            {/* Grid de Ordens de Serviço */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 bg-white rounded-3xl border border-slate-100 p-6 animate-pulse" />
                    ))}
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-700">Nenhuma ordem de serviço encontrada</h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                        Tente ajustar a sua busca ou crie uma nova OS para começar a atender seus clientes.
                    </p>
                </div>
            ) : (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedOrders.slice(0, displayLimit).map((os) => (
                        <div
                            key={os.id}
                            onClick={() => navigate(`/service-orders/${os.id}`)}
                            className="group relative flex flex-col justify-between rounded-[24px] border border-white bg-white/90 backdrop-blur-xl p-6 shadow-xl shadow-emerald-900/5 hover:shadow-2xl hover:shadow-emerald-900/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                            {/* Decorative gradient blob */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />

                            <div className="flex justify-between items-center mb-4 relative z-10 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Select
                                        value={os.status || 'PENDENTE'}
                                        onValueChange={(value) => handleQuickStatusUpdate(os.id, value)}
                                    >
                                        <SelectTrigger onClick={(e) => e.stopPropagation()} className={cn(
                                            "w-fit h-7 px-2.5 py-0 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition-all outline-none ring-0 focus:ring-0 select-none shrink-0 shadow-xs",
                                            getStatusColor(os.status || 'pendente', !!os.deslocamento_iniciado_em)
                                        )}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                                            <SelectValue>
                                                {os.deslocamento_iniciado_em && !['concluído', 'concluido'].includes(os.status?.toLowerCase() || '')
                                                    ? 'EM DESLOCAMENTO'
                                                    : (os.status || 'Pendente').replace(/_/g, ' ').toUpperCase()}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent onClick={(e) => e.stopPropagation()} className="rounded-xl shadow-xl border-slate-100">
                                            <SelectItem value="PENDENTE">Pendente</SelectItem>
                                            <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                                            <SelectItem value="CONCLUIDO" className="text-emerald-600 font-bold">Concluído</SelectItem>
                                            <SelectItem value="ORCAMENTO">Somente Orçamento</SelectItem>
                                            <SelectItem value="NAO_FEITO_CANCELADO">Cancelado</SelectItem>
                                            <SelectItem value="NAO_FEITO_OUTRA_EMPRESA">Outra Empresa</SelectItem>
                                            <SelectItem value="NAO_FEITO_JA_REALIZADO">Já Realizado</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {os.marca && (
                                        <span 
                                            className="h-7 px-2.5 flex items-center justify-center rounded-full font-bold text-[11px] shadow-xs shrink-0 whitespace-nowrap"
                                            style={{ 
                                                backgroundColor: `${os.marca.cor_tema || '#10b981'}15`,
                                                color: os.marca.cor_tema || '#059669',
                                                border: `1px solid ${os.marca.cor_tema || '#10b981'}35`
                                            }}
                                        >
                                            {os.marca.nome.replace('Desentupidora ', '')}
                                        </span>
                                    )}
                                </div>

                                <span className="text-[11px] text-slate-400 font-mono tracking-wider shrink-0 select-none">#{os.id.slice(0, 8)}</span>
                            </div>

                            <div className="space-y-4 mb-8 relative z-10">
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-1">Cliente</p>
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const clientId = os.cliente_id || os.clientes?.id
                                            if (clientId) {
                                                navigate(`/clients?edit=${clientId}`)
                                            } else {
                                                navigate(`/clients?search=${encodeURIComponent(os.cliente_nome || '')}`)
                                            }
                                        }}
                                        className="flex items-center gap-2 group/client cursor-pointer"
                                        title="Clique para ver ou editar o cadastro deste cliente"
                                    >
                                        <div className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover/client:bg-emerald-100 group-hover/client:text-emerald-700 transition-colors shrink-0">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            <span className="font-bold text-slate-800 text-lg truncate group-hover/client:text-emerald-700 group-hover/client:underline underline-offset-2 transition-colors">
                                                {os.cliente_nome || 'Cliente Desconhecido'}
                                            </span>
                                            <Pencil className="h-3.5 w-3.5 text-slate-400 group-hover/client:text-emerald-600 opacity-60 group-hover/client:opacity-100 transition-all shrink-0" />
                                        </div>
                                    </div>

                                    {/* Endereço Visível do Cliente no Card */}
                                    {getClientAddress(os) ? (
                                        <div 
                                            className="flex items-start gap-1.5 text-xs text-slate-600 mt-2 pl-0.5 leading-snug group/addr cursor-pointer hover:text-emerald-700 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedOsForNav(os)
                                                setEtaMinutes('')
                                                setIsNavDialogOpen(true)
                                            }}
                                            title="Clique para navegar até o endereço"
                                        >
                                            <MapPin className="h-3.5 w-3.5 text-slate-400 group-hover/addr:text-emerald-600 shrink-0 mt-0.5" />
                                            <span className="font-medium line-clamp-2">
                                                {getClientAddress(os)}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 italic mt-2 pl-0.5">
                                            <MapPin className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                            <span>Endereço não informado</span>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 mt-3 pl-1" onClick={(e) => e.stopPropagation()}>
                                        {getClientPhone(os) && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        window.open(`tel:${getClientPhone(os)?.replace(/\D/g, '')}`, '_self')
                                                    }}
                                                    title="Ligar"
                                                >
                                                    <Phone className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        const cleanPhone = normalizePhoneForWhatsApp(getClientPhone(os))
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
                                                    setEtaMinutes('')
                                                    setIsNavDialogOpen(true)
                                                }}
                                                title="Navegar"
                                            >
                                                <MapPin className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Técnico Responsável com Nome Real */}
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-1">Técnico Responsável</p>
                                    {os.tecnicos?.nome_completo ? (
                                        <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
                                            <span className="font-bold text-slate-800 truncate">{os.tecnicos.nome_completo}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-50 px-3 py-2 rounded-xl border border-dashed border-slate-200">
                                            <div className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                                            <span className="text-xs italic">Não atribuído</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Faixa Horizontal Exclusiva e Destacada da NFS-e */}
                            {os.nfe_status && (
                                <div className="mb-4 relative z-10" onClick={(e) => e.stopPropagation()}>
                                    {(os.nfe_status === 'autorizado' || os.nfe_status === 'autorizada') && (
                                        <div 
                                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50/90 border border-emerald-200/90 text-xs shadow-xs hover:bg-emerald-100/70 transition-all cursor-pointer group gap-1.5"
                                        >
                                            <div 
                                                onClick={() => window.open(os.nfe_url_pdf || os.nfe_pdf_url, '_blank')}
                                                className="flex items-center gap-1.5 min-w-0 flex-1 truncate"
                                            >
                                                <span className="relative flex h-2 w-2 shrink-0">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                <span className="font-extrabold text-emerald-900 tracking-tight whitespace-nowrap text-[11px] sm:text-xs">
                                                    NFS-e nº {os.nfe_numero || '579'}
                                                </span>
                                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1 py-0.5 rounded uppercase shrink-0">
                                                    Emitida
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <button 
                                                    type="button"
                                                    onClick={() => window.open(os.nfe_url_pdf || os.nfe_pdf_url, '_blank')}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[10px] sm:text-[11px] shadow-xs hover:bg-emerald-800 transition-all cursor-pointer shrink-0"
                                                    title="Visualizar e Imprimir DANFSe PDF"
                                                >
                                                    <FileText className="w-3 h-3" /> PDF
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleShareNFeWhatsApp(os)}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-[10px] sm:text-[11px] shadow-xs transition-all cursor-pointer shrink-0"
                                                    title="Enviar NFS-e por WhatsApp para o Cliente"
                                                >
                                                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                    </svg>
                                                    Enviar
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setOsToCancel(os)
                                                        setCancelJustificativa('Cancelamento de serviço solicitado pelo cliente')
                                                        setCancelModalOpen(true)
                                                    }}
                                                    className="px-1.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-600 font-bold text-[10px] sm:text-[11px] hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                                                    title="Cancelar NFS-e na prefeitura"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {os.nfe_status === 'processando_autorizacao' && (
                                        <div 
                                            onClick={() => handleQuickEmitNFe(os)}
                                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 shadow-xs hover:bg-amber-100 transition-all cursor-pointer animate-pulse"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                                <span className="font-bold">NFS-e em processamento na prefeitura...</span>
                                            </div>
                                            <span className="text-[11px] font-bold text-amber-700 underline">Consultar agora</span>
                                        </div>
                                    )}

                                    {(os.nfe_status === 'cancelado' || os.nfe_status === 'cancelada') && (
                                        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500">
                                            <span className="font-semibold line-through text-[11px]">NFS-e nº {os.nfe_numero || ''} (Cancelada)</span>
                                            <button 
                                                type="button"
                                                onClick={() => handleQuickEmitNFe(os)}
                                                className="text-emerald-700 font-bold hover:underline text-[11px] cursor-pointer"
                                            >
                                                Emitir nova
                                            </button>
                                        </div>
                                    )}

                                    {os.nfe_status === 'processando_cancelamento' && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
                                            <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                                            <span className="text-[11px] font-medium">Cancelamento em processamento na prefeitura...</span>
                                        </div>
                                    )}

                                    {(os.nfe_status === 'erro_autorizacao' || os.nfe_status === 'erro') && (
                                        <div 
                                            onClick={() => handleQuickEmitNFe(os)}
                                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 shadow-xs hover:bg-rose-100 transition-all cursor-pointer"
                                            title={os.nfe_mensagem_erro || 'Erro na emissão. Clique para tentar novamente'}
                                        >
                                            <div className="flex items-center gap-1.5 truncate mr-2">
                                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                                <span className="font-medium truncate text-[11px]">{os.nfe_mensagem_erro || 'Rejeição na prefeitura'}</span>
                                            </div>
                                            <span className="font-bold text-rose-700 underline shrink-0 text-[11px]">Tentar de novo</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-400 font-bold uppercase">Valor Total</span>
                                    <span className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(os.valor_total)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 ml-2">
                                    {/* Grupo: Controle */}
                                    <div className="flex items-center bg-slate-100/50 p-0.5 rounded-lg border border-slate-200/50">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-red-500 hover:bg-white transition-all cursor-pointer" onClick={(e) => {
                                            e.stopPropagation()
                                            setOsToDelete(os.id)
                                            setDeleteConfirmOpen(true)
                                        }}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>

                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-amber-500 hover:bg-white transition-all cursor-pointer" onClick={(e) => {
                                            e.stopPropagation()
                                            navigate(`/service-orders/${os.id}`)
                                        }}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    {/* Grupo: Documentos */}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Orçamento"
                                            className={`h-7 w-7 md:h-8 md:w-8 rounded-lg transition-all hover:scale-105 cursor-pointer ${os.orcamento_gerado ? 'text-blue-600 bg-blue-50 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleGenerateDoc(os, 'ORCAMENTO')
                                            }}
                                        >
                                            <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Recibo"
                                            className={`h-7 w-7 md:h-8 md:w-8 rounded-lg transition-all hover:scale-105 cursor-pointer ${os.recibo_gerado ? 'text-emerald-600 bg-emerald-50 shadow-sm border border-emerald-100' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleGenerateDoc(os, 'RECIBO')
                                            }}
                                        >
                                            <Receipt className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Contrato"
                                            className={`h-7 w-7 md:h-8 md:w-8 rounded-lg transition-all hover:scale-105 cursor-pointer ${os.contrato_gerado ? 'text-indigo-600 bg-indigo-50 shadow-sm border border-indigo-100' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleGenerateDoc(os, 'CONTRATO')
                                            }}
                                        >
                                            <FileSignature className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                        </Button>
                                    </div>

                                    {/* Botão NFS-e com cores reativas: Verde = Autorizado, Amarelo = Processando, Vermelho = Erro */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title={
                                            os.nfe_status === 'autorizado' || os.nfe_status === 'autorizada'
                                                ? 'NFS-e Autorizada (Clique para abrir PDF)'
                                                : os.nfe_status === 'processando_autorizacao'
                                                ? 'NFS-e em Processamento na Receita (Clique para consultar)'
                                                : os.nfe_status === 'erro_autorizacao' || os.nfe_status === 'erro'
                                                ? `Erro na NFS-e: ${os.nfe_mensagem_erro || 'Rejeição na prefeitura/receita. Clique para consultar ou tentar novamente'}`
                                                : 'Emitir NFS-e'
                                        }
                                        disabled={emittingIds.has(os.id)}
                                        className={`h-7 w-7 md:h-8 md:w-8 rounded-lg transition-all hover:scale-105 cursor-pointer ${
                                            os.nfe_status === 'autorizado' || os.nfe_status === 'autorizada'
                                                ? 'text-emerald-600 bg-emerald-50 shadow-sm border border-emerald-200 hover:bg-emerald-100'
                                                : os.nfe_status === 'processando_autorizacao'
                                                ? 'text-amber-600 bg-amber-50 shadow-sm border border-amber-200 animate-pulse hover:bg-amber-100'
                                                : os.nfe_status === 'erro_autorizacao' || os.nfe_status === 'erro'
                                                ? 'text-rose-600 bg-rose-50 shadow-sm border border-rose-200 hover:bg-rose-100 animate-bounce'
                                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                        }`}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleQuickEmitNFe(os)
                                        }}
                                    >
                                        {emittingIds.has(os.id) ? (
                                            <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin text-emerald-600" />
                                        ) : (
                                            <FileBadge className={`h-3.5 w-3.5 md:h-4 md:w-4 ${
                                                os.nfe_status === 'erro_autorizacao' || os.nfe_status === 'erro' ? 'text-rose-600' : ''
                                            }`} />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredOrders.length > displayLimit && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm mt-6">
                        <div className="text-sm text-slate-500 font-medium">
                            Exibindo <span className="font-bold text-slate-800">{Math.min(displayLimit, filteredOrders.length)}</span> de <span className="font-bold text-slate-800">{filteredOrders.length}</span> ordens de serviço
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDisplayLimit(prev => prev + 24)}
                            className="w-full sm:w-auto rounded-xl border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 font-bold transition-all px-6 cursor-pointer"
                        >
                            Carregar mais serviços (+24)
                        </Button>
                    </div>
                )}
                </>
            )}

            {/* Modal de Exclusão */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Excluir Ordem de Serviço</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            
            {/* Modal de Cancelamento de NFS-e na Prefeitura */}
            <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600 font-bold">
                            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                            Cancelar NFS-e nº {osToCancel?.nfe_numero || ''}
                        </DialogTitle>
                        <DialogDescription>
                            Esta ação solicitará o cancelamento oficial da nota fiscal na prefeitura. A anulação da nota fiscal tem efeito jurídico irrevogável.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {osToCancel && (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                                <div className="text-slate-500">Cliente: <strong className="text-slate-800">{clients.find((c: any) => c.id === osToCancel.cliente_id)?.nome || osToCancel.cliente_nome || 'Cliente'}</strong></div>
                                <div className="text-slate-500">Valor da NFS-e: <strong className="text-emerald-700">R$ {Number(osToCancel.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                                <div className="text-slate-500">Ref Fiscal: <code className="text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">{osToCancel.nfe_ref || 'N/A'}</code></div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Justificativa do Cancelamento *
                            </label>
                            <Input
                                placeholder="Informe o motivo (mínimo 10 caracteres)"
                                value={cancelJustificativa}
                                onChange={(e) => setCancelJustificativa(e.target.value)}
                                className="h-11"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Ex: Cancelamento de serviço solicitado pelo cliente
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                                setCancelModalOpen(false)
                                setOsToCancel(null)
                            }}
                            disabled={isCanceling}
                        >
                            Fechar
                        </Button>
                        <Button 
                            type="button" 
                            variant="destructive" 
                            onClick={handleCancelNFe}
                            disabled={isCanceling || !cancelJustificativa || cancelJustificativa.trim().length < 10}
                            className="gap-2 font-bold"
                        >
                            {isCanceling ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Cancelando na Prefeitura...
                                </>
                            ) : (
                                'Confirmar Cancelamento'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Navegação */}
            <Dialog open={isNavDialogOpen} onOpenChange={setIsNavDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Iniciar Deslocamento</DialogTitle>
                        <DialogDescription>
                            Defina a previsão de chegada e selecione o aplicativo de navegação.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Previsão de Chegada (minutos)</label>
                            <Input
                                type="number"
                                placeholder="Ex: 25"
                                value={etaMinutes}
                                onChange={(e) => setEtaMinutes(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => handleNavigationStart('waze')}
                                className="h-12 border-blue-200 text-blue-600 hover:bg-blue-50 font-bold gap-2"
                            >
                                <MapPin className="h-4 w-4" />
                                Waze
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleNavigationStart('google')}
                                className="h-12 border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold gap-2"
                            >
                                <MapPin className="h-4 w-4" />
                                Google Maps
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Upgrade */}
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                message={upgradeMessage}
            />
        </div>
    )
}

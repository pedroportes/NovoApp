import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useOutletContext, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, FileText, Printer, Trash2, PenTool, Eraser, Calendar, Upload, Cloud, Wifi, CheckCircle2, AlertTriangle, Eye, Plus, User, ChevronDown, ClipboardList, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SignaturePad } from '@/components/ui/signature-pad'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { SyncService } from '@/services/syncService'
import { LocalServiceOrder, db } from '@/lib/db'
import { useOfflineClients, useOfflineTechnicians, useOfflineServices } from '@/hooks/useOfflineData'
import { compressImage } from '@/lib/utils'

interface ServiceItem {
    descricao: string
    qtd: number
    valor_unitario: number
    total: number
}

export function NewServiceOrder() {
    const navigate = useNavigate()
    const { id } = useParams()
    const { userData } = useAuth()
    const [savingSignature, setSavingSignature] = useState(false)
    const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)



    // Form State
    const [formData, setFormData] = useState({
        cliente_id: '',
        tecnico_id: '',
        tipo: 'ORCAMENTO',
        data_agendamento: new Date().toISOString().split('T')[0],
        hora_agendamento: '09:00',
        validade: '',
        descricao_servico: '',
        observacoes: '',
        desconto: '',
        status: 'PENDENTE'
    })

    const [items, setItems] = useState<ServiceItem[]>([])
    const [photos, setPhotos] = useState<{ antes: string[], depois: string[] }>({ antes: [], depois: [] })
    const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null)
    const [initialSignatureUrl, setInitialSignatureUrl] = useState<string | null>(null)

    // Derived Discount State (for UI sync)
    const subtotal = items.length > 0 ? items.reduce((acc, item) => acc + (Number(item.total) || 0), 0) : 0

    // We use a local state for the currency input to "buffer" the user's typing
    // preventing the circular calculation from messing up the input while typing.
    const [currencyInput, setCurrencyInput] = useState('')
    const [percentInput, setPercentInput] = useState('')

    // FAB Action Context
    const { setFabAction } = useOutletContext<{ setFabAction: (action: (() => void) | null) => void }>() ?? { setFabAction: () => { } }

    useEffect(() => {
        setFabAction(() => handleSubmit())
        return () => setFabAction(null)
    }, [formData, items, photos, signatureBlob, setFabAction]) // Re-bind on state change

    // Initialize inputs when data loads or subtotal changes (if inputs are empty/clean)
    useEffect(() => {
        // Sync internal state with formData on load
        if (formData.desconto && !percentInput) {
            setPercentInput(formData.desconto)
            const val = (subtotal * parseFloat(formData.desconto)) / 100
            setCurrencyInput(val.toFixed(2))
        }
    }, [formData.desconto, subtotal])

    // Calculate final totals for display/save
    const discountPercent = parseFloat(formData.desconto) || 0
    const discountValue = (subtotal * discountPercent) / 100
    const total = Math.max(0, subtotal - discountValue)

    const handleSignatureChange = (blob: Blob | null) => {
        setSignatureBlob(blob)
    }

    const [selectedServiceId, setSelectedServiceId] = useState('')

    // Calculator State
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
    const [calcType, setCalcType] = useState<'rectangular' | 'cilindrico'>('rectangular')
    const [calcDimensions, setCalcDimensions] = useState({
        largura: '',
        comprimento: '',
        profundidade: '',
        diametro: '',
        preco_litro: ''
    })
    const [calculatedVolume, setCalculatedVolume] = useState<{ litros: number, total: number } | null>(null)

    // Calculator Effect
    useEffect(() => {
        calculateVolume()
    }, [calcDimensions, calcType])

    const calculateVolume = () => {
        const { largura, comprimento, profundidade, diametro, preco_litro } = calcDimensions
        let volumeLitros = 0

        if (calcType === 'rectangular') {
            const l = parseFloat(largura) || 0
            const c = parseFloat(comprimento) || 0
            const p = parseFloat(profundidade) || 0
            if (l && c && p) {
                // cm -> m: /100. Volume m3 = l*c*p. Litros = m3 * 1000
                // Se input for em CM:
                volumeLitros = (l * c * p) / 1000
            }
        } else {
            const d = parseFloat(diametro) || 0
            const p = parseFloat(profundidade) || 0
            if (d && p) {
                // Raio = d/2. Area = pi * r^2. Vol = Area * p
                const r = d / 2
                volumeLitros = (Math.PI * (r * r) * p) / 1000
            }
        }

        const preco = parseFloat(preco_litro.replace(',', '.')) || 0
        const total = volumeLitros * preco

        setCalculatedVolume({
            litros: Math.round(volumeLitros * 100) / 100,
            total: Math.round(total * 100) / 100
        })
    }

    // --- Discount Handlers ---

    // When user types in % input
    const handlePercentChange = (val: string) => {
        setPercentInput(val)
        const p = parseFloat(val) || 0

        // Update currency input display based on new %
        const cVal = (subtotal * p) / 100
        setCurrencyInput(cVal > 0 ? cVal.toFixed(2) : '')

        // Update main form data
        setFormData(prev => ({ ...prev, desconto: val }))
    }

    // When user types in R$ input
    const handleCurrencyChange = (val: string) => {
        setCurrencyInput(val) // Allow free typing (e.g. "100.")

        const cVal = parseFloat(val) || 0
        if (subtotal === 0) return

        // Calc percentage
        const p = (cVal / subtotal) * 100

        // Update % input display (keep reasonable precision)
        setPercentInput(p.toFixed(2))

        // Update main form data
        setFormData(prev => ({ ...prev, desconto: p.toFixed(4) })) // Store with higher precision to avoid drift
    }


    // Check for user data
    useEffect(() => {
        if (userData && !userData.empresa_id) {
            console.warn('Usuario sem empresa_id', userData)
        }
    }, [userData])

    // --- Offline Data Hooks ---
    const [searchParams] = useSearchParams()
    const queryClientId = searchParams.get('client_id')
    const queryDate = searchParams.get('date')

    const { clients: rawClients, loading: loadingClients } = useOfflineClients()
    const { technicians: rawTechnicians, loading: loadingTechs } = useOfflineTechnicians()
    const { services: rawServices, loading: loadingServices } = useOfflineServices()

    const clients = rawClients || []
    const services = rawServices || []

    // Filter technicians based on role
    const technicians = useMemo(() => {
        return rawTechnicians ? rawTechnicians.filter((t: any) => {
            if (userData?.cargo?.toLowerCase() === 'tecnico') {
                return t.id === userData.id
            }
            return true;
        }).map((t: any) => ({
            ...t,
            nome: t.nome_completo || t.nome || 'Técnico'
        })) : []
    }, [rawTechnicians, userData])

    // Pre-fill client from URL if available
    useEffect(() => {
        if (queryClientId && clients && clients.length > 0 && !formData.cliente_id) {
            const clientExists = clients.find(c => c.id === queryClientId)
            if (clientExists) {
                setFormData(prev => ({ ...prev, cliente_id: queryClientId }))
            }
        }

        if (queryDate && !id) {
            setFormData(prev => ({ ...prev, data_agendamento: queryDate }))
        }
    }, [queryClientId, queryDate, clients, formData.cliente_id, id])

    // Load OS Data for Editing
    useEffect(() => {
        if (id && userData?.empresa_id) {
            loadOrderData(id)
        } else if (userData?.cargo?.toLowerCase() === 'tecnico') {
            // Default to self if technician creating new
            setFormData(prev => ({ ...prev, tecnico_id: userData.id }))
        }
    }, [id, userData, technicians]) // added technicians dependency to ensure we have them before setting default? no, ID is string.


    const loadOrderData = async (orderId: string) => {
        setLoading(true)
        try {
            // Try Local DB First
            let osData: any = await db.ordens_servico.get(orderId)

            // If not found locally, try network (if online) - hybrid approach
            // But ideally everything should be sync'd. 
            if (!osData && navigator.onLine) {
                const { data, error } = await supabase
                    .from('ordens_servico')
                    .select('*')
                    .eq('id', orderId)
                    .single()
                if (data) osData = data
            }

            if (osData) {
                const [date, time] = osData.data_agendamento ? osData.data_agendamento.split('T') : ['', '']

                // If technician, force their ID (security/logic check)
                let selectedTechId = osData.tecnico_id
                if (userData?.cargo?.toLowerCase() === 'tecnico') {
                    selectedTechId = userData.id
                }

                setFormData({
                    cliente_id: osData.cliente_id,
                    tecnico_id: selectedTechId,
                    tipo: osData.tipo,
                    data_agendamento: date,
                    hora_agendamento: time ? time.slice(0, 5) : '09:00',
                    validade: osData.validade || '',
                    descricao_servico: osData.descricao_servico || '',
                    observacoes: osData.observacoes || '',
                    desconto: osData.desconto ? osData.desconto.toString() : '',
                    status: osData.status || 'PENDENTE'
                })
                setItems((osData.itens as ServiceItem[]) || [])

                // Photos
                const loadedPhotos = osData.fotos as any || { antes: [], depois: [] }
                setPhotos({
                    antes: Array.isArray(loadedPhotos.antes) ? loadedPhotos.antes : (loadedPhotos.antes ? [loadedPhotos.antes] : []),
                    depois: Array.isArray(loadedPhotos.depois) ? loadedPhotos.depois : (loadedPhotos.depois ? [loadedPhotos.depois] : [])
                })

                if (osData.assinatura_cliente_url) {
                    setInitialSignatureUrl(osData.assinatura_cliente_url)
                }

                // Init local inputs
                if (osData.desconto) {
                    setPercentInput(osData.desconto.toString())
                }
            }
        } catch (error) {
            console.error('Erro ao carregar OS:', error)
            alert('Erro ao carregar dados da OS.')
        } finally {
            setLoading(false)
        }
    }


    const fetchOrderData = async (orderId: string) => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('ordens_servico')
                .select('*')
                .eq('id', orderId)
                .single()

            if (error) throw error
            if (data) {
                // Explicitly cast data to any to avoid "property does not exist on type never" errors
                const osData = data as any
                const [date, time] = osData.data_agendamento ? osData.data_agendamento.split('T') : ['', '']

                // If technician, force their ID
                let selectedTechId = osData.tecnico_id
                if (userData?.cargo?.toLowerCase() === 'tecnico') {
                    selectedTechId = userData.id
                }

                setFormData({
                    cliente_id: osData.cliente_id,
                    tecnico_id: selectedTechId,
                    tipo: osData.tipo,
                    data_agendamento: date,
                    hora_agendamento: time ? time.slice(0, 5) : '09:00',
                    validade: osData.validade || '',
                    descricao_servico: osData.descricao_servico || '',
                    observacoes: osData.observacoes || '',
                    desconto: osData.desconto ? osData.desconto.toString() : '',
                    status: osData.status || 'PENDENTE'
                })
                setItems((osData.itens as ServiceItem[]) || [])
                // Handle JSONB photos structure (backward compatible if null)
                const loadedPhotos = osData.fotos as any || { antes: [], depois: [] }
                setPhotos({
                    antes: Array.isArray(loadedPhotos.antes) ? loadedPhotos.antes : (loadedPhotos.antes ? [loadedPhotos.antes] : []),
                    depois: Array.isArray(loadedPhotos.depois) ? loadedPhotos.depois : (loadedPhotos.depois ? [loadedPhotos.depois] : [])
                })
                if (osData.assinatura_cliente_url) {
                    setInitialSignatureUrl(osData.assinatura_cliente_url)
                }

                // Init local inputs
                if (osData.desconto) {
                    setPercentInput(osData.desconto.toString())
                    // Logic to set currencyInput happens in useEffect once items are loaded (subtotal needed)
                }
            }
        } catch (error) {
            console.error('Erro ao carregar OS:', error)
            alert('Erro ao carregar dados da OS.')
            navigate('/service-orders')
        } finally {
            setLoading(false)
        }
    }

    const addItem = () => {
        setItems(prev => [...prev, { descricao: '', qtd: 1, valor_unitario: 0, total: 0 }])
    }

    const handleAddServiceItem = (serviceId: string) => {
        const service = services.find(s => s.id === serviceId) as any
        if (service) {
            // DB field is valor_padrao
            const val = Number(service.valor_padrao) || 0
            setItems(prev => [...prev, {
                descricao: service.descricao ? `${service.nome} - ${service.descricao} ` : service.nome,
                qtd: 1,
                valor_unitario: val,
                total: val
            }])
            setSelectedServiceId('') // Reset selection
        }
    }

    const handleAddCalculatedItem = () => {
        // Recalculate on the fly to ensure no stale state usage
        const { largura, comprimento, profundidade, diametro, preco_litro } = calcDimensions
        let volumeLitros = 0
        let currentTotal = 0

        if (calcType === 'rectangular') {
            const l = parseFloat(largura.replace(',', '.')) || 0
            const c = parseFloat(comprimento.replace(',', '.')) || 0
            const p = parseFloat(profundidade.replace(',', '.')) || 0
            if (l && c && p) {
                volumeLitros = (l * c * p) / 1000
            }
        } else {
            const d = parseFloat(diametro.replace(',', '.')) || 0
            const p = parseFloat(profundidade.replace(',', '.')) || 0
            if (d && p) {
                const r = d / 2
                volumeLitros = (Math.PI * (r * r) * p) / 1000
            }
        }

        const preco = parseFloat(preco_litro.replace(',', '.')) || 0
        currentTotal = volumeLitros * preco

        // Round to 2 decimals for currency
        currentTotal = Math.round(currentTotal * 100) / 100
        volumeLitros = Math.round(volumeLitros * 100) / 100

        if (currentTotal <= 0) return

        const desc = calcType === 'rectangular'
            ? `Limpeza Fossa Retangular(${largura}x${comprimento}x${profundidade}cm) - ${volumeLitros} L`
            : `Limpeza Fossa Cilíndrica(Ø${diametro}x${profundidade}cm) - ${volumeLitros} L`

        setItems(prev => [...prev, {
            descricao: desc,
            qtd: 1,
            valor_unitario: currentTotal,
            total: currentTotal
        }])
        setIsCalculatorOpen(false)
    }

    const updateItem = (index: number, field: keyof ServiceItem, value: any) => {
        setItems(prev => {
            const newItems = [...prev]
            const item = { ...newItems[index] }

            if (field === 'qtd') {
                item.qtd = Number(value)
                item.total = Number((item.qtd * item.valor_unitario).toFixed(2))
            } else if (field === 'valor_unitario') {
                // Handle text input that might have commas if browser allows it
                const valStr = String(value).replace(',', '.')
                const valNum = parseFloat(valStr) || 0
                item.valor_unitario = valNum
                item.total = Number((item.qtd * valNum).toFixed(2))
            } else if (field === 'descricao') {
                item.descricao = value
            }

            newItems[index] = item
            return newItems
        })
    }

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    // ...

    const handlePhotoUpload = async (file: File, type: 'antes' | 'depois') => {
        try {
            // Compress image before upload
            const compressedBlob = await compressImage(file)
            const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' })

            const fileName = `os-evidence-${Date.now()}-${type}-${Math.random().toString(36).substring(7)}.jpg`
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, compressedFile)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            setPhotos(prev => ({
                ...prev,
                [type]: [...(prev[type] || []), publicUrl]
            }))

        } catch (error) {
            console.error('Upload failed', error)
            alert('Erro ao enviar foto: ' + error)
        }
    }

    const removePhoto = (type: 'antes' | 'depois', index: number) => {
        setPhotos(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async (options?: { status?: string, print?: boolean, forceType?: string }) => {
        if (!formData.cliente_id || !formData.tecnico_id) {
            alert('Selecione um cliente e um técnico.')
            return
        }

        setLoading(true)

        try {
            let signatureUrl = initialSignatureUrl

            if (signatureBlob) {
                // Sanitize filename: no spaces, unique ID
                const fileName = `os-sig-${Date.now()}-${Math.random().toString(36).substring(7)}.png`

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, signatureBlob, {
                        contentType: 'image/png',
                        upsert: true
                    })

                if (uploadError) {
                    console.error('Erro upload assinatura:', uploadError)
                    throw new Error('Falha ao salvar assinatura: ' + uploadError.message)
                }

                const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
                signatureUrl = data.publicUrl
            }

            const selectedClient = clients.find(c => c.id === formData.cliente_id)

            const finalStatus = options?.status || (id ? undefined : 'PENDENTE')
            const finalType = options?.forceType || formData.tipo

            const payload: any = {
                empresa_id: userData!.empresa_id,
                cliente_id: formData.cliente_id,
                cliente_nome: selectedClient?.nome_razao || 'Cliente não identificado',
                cliente_whatsapp: selectedClient?.whatsapp || null,
                descricao_servico: formData.descricao_servico,
                tecnico_id: formData.tecnico_id,
                tipo: finalType,
                data_agendamento: `${formData.data_agendamento}T${formData.hora_agendamento}:00`,
                validade: formData.validade || null,
                observacoes: formData.observacoes,
                desconto: discountPercent,
                itens: items,
                fotos: { antes: photos.antes, depois: photos.depois },
                valor_total: total
            }

            if (finalStatus) {
                payload.status = finalStatus
            }

            if (signatureUrl) {
                payload.assinatura_cliente_url = signatureUrl
            }

            let savedId = id;

            if (id) {
                // Update
                await SyncService.saveServiceOrder({
                    id,
                    ...payload,
                    status: finalStatus || payload.status
                } as LocalServiceOrder);
            } else {
                // Create
                if (!payload.status) payload.status = 'PENDENTE';
                savedId = await SyncService.saveServiceOrder(payload as LocalServiceOrder);
            }

            // if (error) throw error // No error throwing here, SyncService handles it or throws validation error

            if (options?.print && savedId) {
                // Open PDF in new tab
                window.open(`/print/service-orders/${savedId}?type=${finalType}`, '_blank')
            }

            alert(id ? 'OS atualizada com sucesso!' : 'OS criada com sucesso!')

            // Only navigate away if NOT printing
            if (!options?.print) {
                navigate('/service-orders')
            } else if (!id) {
                // If it was new and we printed, maybe navigate to edit mode?
                // For now, let's just go to list to be safe, OR stay.
                // User said "returns to initial page".
                // If we stay, we need to update the ID in URL to avoid creating duplicate if they save again.
                // Safest default: Go to list, but since the PDF opens in new tab, the user has the PDF. 
                // But user complained "voltou para inicial".
                // Let's TRY staying. But we must update ID. 
                // As I can't easily update URL params without reload or extensive state change logic:
                // I will navigate to EDIT page of the new OS.
                navigate(`/service-orders/${savedId}`, { replace: true })
            }

        } catch (error: any) {
            console.error(error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleConclude = async () => {
        if (confirm('Deseja realmente concluir esta OS? Isso irá gerar a comissão e o lançamento financeiro.')) {
            await handleSubmit({ status: 'CONCLUIDO' })
        }
    }

    if (loading) return <div className="p-8 text-center">Carregando dados da OS...</div>

    return (
        <div className="pb-20 md:pb-10 max-w-4xl mx-auto space-y-6 pt-6 md:pt-0">
            {/* Header with Print Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/service-orders')}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{id ? 'Editar OS' : 'Nova OS'}</h1>
                        <p className="text-muted-foreground text-sm">Preencha os dados abaixo</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {id && (
                        <Button
                            variant="outline"
                            className="flex-1 md:flex-none gap-2"
                            onClick={() => window.open(`/print/service-orders/${id}?type=${formData.tipo}`, '_blank')}
                        >
                            <Printer className="h-4 w-4" />
                            <span className="md:inline">PDF</span>
                        </Button>
                    )}

                    {id && formData.status !== 'CONCLUIDO' && (
                        <Button
                            className="flex-1 md:flex-none gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                            onClick={handleConclude}
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Concluir
                        </Button>
                    )}
                </div>
            </div>

            {/* GERAL CARD */}
            <div className="bg-white rounded-3xl p-4 md:p-8 shadow-xl shadow-slate-200/50 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-sky-400" />


                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                        <User className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Informações Gerais</h2>
                        <p className="text-xs text-slate-400">Dados do cliente e responsável</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-slate-600 font-medium ml-1">Cliente</Label>
                        <div className="relative">
                            <select
                                className="w-full h-14 pl-4 pr-10 bg-slate-50 border-0 rounded-2xl text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                                value={formData.cliente_id}
                                onChange={e => setFormData({ ...formData, cliente_id: e.target.value })}
                            >
                                <option value="">Selecione o Cliente</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.nome_razao}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-slate-600 font-medium ml-1">Tipo de Documento</Label>
                        <div className="flex bg-slate-100 p-1 rounded-xl md:rounded-full overflow-x-auto md:overflow-visible">
                            {['ORCAMENTO', 'RECIBO', 'CONTRATO'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, tipo: type })}
                                    className={`flex-1 py-2 md:py-3 px-2 text-[10px] md:text-xs font-bold rounded-lg md:rounded-full transition-all duration-300 whitespace-nowrap ${formData.tipo === type
                                        ? 'bg-white text-emerald-600 shadow-md transform scale-100'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-600 font-medium ml-1">Técnico</Label>
                            <div className="relative">
                                <select
                                    className="w-full h-14 pl-4 pr-10 bg-slate-50 border-0 rounded-2xl text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                                    value={formData.tecnico_id}
                                    onChange={e => setFormData({ ...formData, tecnico_id: e.target.value })}
                                >
                                    <option value="">Selecione...</option>
                                    {technicians.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                            </div>
                            {clients.length === 0 && !loading && (
                                <p className="text-red-500 text-xs mt-1 ml-1">
                                    Nenhum cliente encontrado. <span className="font-bold cursor-pointer underline" onClick={() => navigate('/clients')}>Cadastre um novo cliente.</span>
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600 font-medium ml-1">Agendamento</Label>
                            <div className="flex gap-3">
                                <input
                                    type="date"
                                    className="flex-1 h-14 px-4 bg-slate-50 border-0 rounded-2xl text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                    value={formData.data_agendamento}
                                    onChange={e => setFormData({ ...formData, data_agendamento: e.target.value })}
                                />
                                <input
                                    type="time"
                                    className="w-32 h-14 px-4 bg-slate-50 border-0 rounded-2xl text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                    value={formData.hora_agendamento}
                                    onChange={e => setFormData({ ...formData, hora_agendamento: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ITENS CARD */}
            <div className="bg-white rounded-3xl p-4 md:p-8 shadow-xl shadow-slate-200/50 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-indigo-400" />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-100 rounded-lg text-sky-600">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Serviços</h2>
                            <p className="text-xs text-slate-400">Itens e valores</p>
                        </div>
                    </div>
                </div>

                {/* ADICIONAR ITEM */}
                <div className="flex gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex-1">
                        <select
                            className="w-full h-12 bg-transparent border-0 text-sm font-medium text-slate-700 focus:ring-0"
                            value={selectedServiceId}
                            onChange={(e) => {
                                setSelectedServiceId(e.target.value)
                                handleAddServiceItem(e.target.value)
                            }}
                        >
                            <option value="">+ Adicionar serviço do catálogo...</option>
                            {services.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.nome} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(s.valor_padrao) || 0)}</option>
                            ))}
                        </select>
                    </div>
                    <Button size="sm" className="bg-white text-slate-700 hover:bg-slate-100 shadow-sm rounded-xl h-12 px-6 font-bold" onClick={addItem}>
                        <Plus className="h-4 w-4 mr-1 text-slate-400" /> Manual
                    </Button>
                </div>

                {/* CALCULADORA */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <div
                        className="bg-slate-50 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white rounded-md shadow-sm">
                                <span className="text-lg">🧮</span>
                            </div>
                            <span className="font-bold text-sm text-slate-600">Calculadora de Volume</span>
                        </div>
                        {isCalculatorOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </div>

                    {isCalculatorOpen && (
                        <div className="p-6 bg-white space-y-6">
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button type="button" onClick={() => setCalcType('rectangular')} className={`flex - 1 py - 2 text - xs font - bold rounded - lg transition - all ${calcType === 'rectangular' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400'} `}>RETANGULAR</button>
                                <button type="button" onClick={() => setCalcType('cilindrico')} className={`flex - 1 py - 2 text - xs font - bold rounded - lg transition - all ${calcType === 'cilindrico' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400'} `}>CILÍNDRICO</button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {calcType === 'rectangular' ? (<>
                                    <div className="space-y-1"><Label className="text-xs ml-1 text-slate-500">Largura (cm)</Label><Input className="bg-slate-50 border-0 rounded-xl h-10" type="number" value={calcDimensions.largura} onChange={e => setCalcDimensions({ ...calcDimensions, largura: e.target.value })} /></div>
                                    <div className="space-y-1"><Label className="text-xs ml-1 text-slate-500">Comprimento (cm)</Label><Input className="bg-slate-50 border-0 rounded-xl h-10" type="number" value={calcDimensions.comprimento} onChange={e => setCalcDimensions({ ...calcDimensions, comprimento: e.target.value })} /></div>
                                </>
                                ) : (<div className="space-y-1 col-span-2"><Label className="text-xs ml-1 text-slate-500">Diâmetro (cm)</Label><Input className="bg-slate-50 border-0 rounded-xl h-10" type="number" value={calcDimensions.diametro} onChange={e => setCalcDimensions({ ...calcDimensions, diametro: e.target.value })} /></div>
                                )}
                                <div className="space-y-1 col-span-2"><Label className="text-xs ml-1 text-slate-500">Profundidade (cm)</Label><Input className="bg-slate-50 border-0 rounded-xl h-10" type="number" value={calcDimensions.profundidade} onChange={e => setCalcDimensions({ ...calcDimensions, profundidade: e.target.value })} /></div>
                                <div className="space-y-1 col-span-2 pt-2"><Label className="text-xs ml-1 font-bold text-emerald-600">Preço por Litro (R$/L)</Label><Input className="bg-emerald-50 border-emerald-100 rounded-xl h-10 text-emerald-700 font-bold" type="number" step="0.01" value={calcDimensions.preco_litro} onChange={e => setCalcDimensions({ ...calcDimensions, preco_litro: e.target.value })} /></div>
                            </div>
                            {calculatedVolume && (
                                <div className="p-4 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-2xl flex justify-between items-center text-white shadow-lg shadow-sky-200">
                                    <div><p className="text-xs opacity-80">Volume Estimado</p><p className="font-bold text-xl">{calculatedVolume.litros} L</p></div>
                                    <div className="text-right"><p className="text-xs opacity-80">Valor Sugerido</p><p className="font-bold text-2xl">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedVolume.total)}</p></div>
                                </div>
                            )}
                            <Button type="button" className="w-full bg-slate-900 text-white rounded-xl h-12 font-bold" onClick={handleAddCalculatedItem} disabled={!calculatedVolume || calculatedVolume.total <= 0}>Adicionar ao Pedido</Button>
                        </div>
                    )}
                </div>

                {/* ITEMS LIST */}
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                            <div className="col-span-12 md:col-span-6">
                                <Input value={item.descricao} onChange={e => updateItem(index, 'descricao', e.target.value)} className="bg-transparent border-0 h-auto p-0 font-medium text-slate-700 placeholder:text-slate-400 focus-visible:ring-0" placeholder="Descrição do item" />
                            </div>
                            <div className="col-span-3 md:col-span-2">
                                <div className="bg-white rounded-lg px-2 py-1 border border-slate-200 flex items-center">
                                    <span className="text-[10px] text-slate-400 mr-2">Qtd</span>
                                    <input type="number" min="1" value={item.qtd} onChange={e => updateItem(index, 'qtd', e.target.value)} className="w-full bg-transparent outline-none text-sm font-bold text-slate-700" />
                                </div>
                            </div>
                            <div className="col-span-4 md:col-span-3">
                                <div className="bg-white rounded-lg px-2 py-1 border border-slate-200 flex items-center">
                                    <span className="text-[10px] text-slate-400 mr-1">R$</span>
                                    <input type="number" step="0.01" value={item.valor_unitario} onChange={e => updateItem(index, 'valor_unitario', e.target.value)} className="w-full bg-transparent outline-none text-sm font-bold text-slate-700" />
                                </div>
                            </div>
                            <div className="col-span-5 md:col-span-1 flex justify-end">
                                <button className="p-2 text-slate-300 hover:text-red-500 transition-colors" onClick={() => removeItem(index)}><Trash2 className="h-5 w-5" /></button>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            Nenhum item adicionado ainda.
                        </div>
                    )}
                </div>

                {/* TOTALS and DISCOUNT */}
                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl shadow-slate-900/20 mt-4 overflow-hidden relative">
                    {/* Abstract Circles */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>Subtotal</span>
                            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal || 0)}</span>
                        </div>

                        {/* Discount Inputs */}
                        <div className="flex bg-white/10 rounded-xl p-1 gap-2">
                            <div className="flex-1 flex items-center px-3 gap-2">
                                <span className="text-xs text-slate-400">Desc %</span>
                                <input
                                    type="number"
                                    value={percentInput}
                                    onChange={e => handlePercentChange(e.target.value)}
                                    className="w-full bg-transparent border-0 text-white font-bold text-right focus:ring-0 placeholder:text-slate-600"
                                    placeholder="0"
                                />
                            </div>
                            <div className="w-px bg-white/10" />
                            <div className="flex-1 flex items-center px-3 gap-2">
                                <span className="text-xs text-slate-400">Desc R$</span>
                                <input
                                    type="number"
                                    value={currencyInput}
                                    onChange={e => handleCurrencyChange(e.target.value)}
                                    className="w-full bg-transparent border-0 text-white font-bold text-right focus:ring-0 placeholder:text-slate-600"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>

                        <div className="h-px bg-white/10" />

                        <div className="flex justify-between items-end">
                            <span className="text-lg font-medium text-slate-300">Total Final</span>
                            <span className="text-3xl font-bold text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total || 0)}</span>
                        </div>
                    </div>
                </div>

                {/* OBSERVATIONS */}
                <div className="space-y-3 pt-2">
                    <Label className="text-slate-600 font-bold ml-1">Observações</Label>
                    <textarea
                        placeholder="Informações adicionais..."
                        value={formData.observacoes}
                        onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                        onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight} px`;
                        }}
                        className="w-full bg-slate-50 min-h-[60px] resize-none border-0 rounded-2xl p-4 focus:ring-2 focus:ring-slate-200 transition-all text-slate-600 outline-none"
                        rows={2}
                    />
                </div>
            </div>

            {/* Signature & Evidence Cards... */}
            <div className="bg-white rounded-3xl p-4 md:p-8 shadow-xl shadow-slate-200/50 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <PenTool className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Assinatura</h2>
                </div>
                <div className="border-0 rounded-2xl overflow-hidden bg-slate-50"><SignaturePad onSignatureChange={handleSignatureChange} initialImage={initialSignatureUrl} /></div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                        <Camera className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Fotos do Serviço</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ANTES SECTION */}
                    <div className="space-y-3">
                        <Label className="font-bold text-slate-600 ml-1">ANTES (Evidências)</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {photos.antes.map((url, idx) => (
                                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm">
                                    <img src={url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setViewingPhoto(url)}
                                            className="bg-white/20 hover:bg-white/40 backdrop-blur-sm p-2 rounded-full text-white transition-colors"
                                            title="Visualizar"
                                        >
                                            <Eye className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => removePhoto('antes', idx)}
                                            className="bg-red-500/80 hover:bg-red-600 backdrop-blur-sm p-2 rounded-full text-white transition-colors"
                                            title="Remover"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl bg-slate-50 aspect-square relative flex flex-col items-center justify-center overflow-hidden transition-colors cursor-pointer">
                                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-1 text-slate-400"><Camera className="h-5 w-5" /></div>
                                <span className="text-[10px] font-bold text-slate-400">ADICIONAR</span>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'antes')} />
                            </div>
                        </div>
                    </div>

                    {/* DEPOIS SECTION */}
                    <div className="space-y-3">
                        <Label className="font-bold text-slate-600 ml-1">DEPOIS (Evidências)</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {photos.depois.map((url, idx) => (
                                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm">
                                    <img src={url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setViewingPhoto(url)}
                                            className="bg-white/20 hover:bg-white/40 backdrop-blur-sm p-2 rounded-full text-white transition-colors"
                                            title="Visualizar"
                                        >
                                            <Eye className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => removePhoto('depois', idx)}
                                            className="bg-red-500/80 hover:bg-red-600 backdrop-blur-sm p-2 rounded-full text-white transition-colors"
                                            title="Remover"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl bg-slate-50 aspect-square relative flex flex-col items-center justify-center overflow-hidden transition-colors cursor-pointer">
                                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-1 text-slate-400"><Camera className="h-5 w-5" /></div>
                                <span className="text-[10px] font-bold text-slate-400">ADICIONAR</span>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'depois')} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons (Footer) */}
            <div className="flex flex-col-reverse md:flex-row gap-3 pt-4 pb-24 md:pb-0 bg-transparent">
                <Button
                    variant="outline"
                    className="w-full md:w-auto h-11 text-sm font-medium border-slate-300 text-slate-600 rounded-xl"
                    onClick={() => navigate(-1)}
                    disabled={loading}
                >
                    Cancelar
                </Button>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto md:ml-auto">
                    <Button
                        variant="secondary"
                        className="w-full md:w-auto h-11 text-sm bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-200 font-bold rounded-xl"
                        onClick={() => handleSubmit({ forceType: 'ORCAMENTO', print: true })}
                        disabled={loading}
                    >
                        <FileText className="h-5 w-5 mr-2" />
                        Salvar Orçamento
                    </Button>

                    <Button
                        className="w-full md:w-auto h-11 text-sm font-bold shadow-lg shadow-emerald-500/20 bg-slate-900 text-white rounded-xl"
                        onClick={() => handleSubmit()}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-5 w-5" />
                                Salvar OS
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Image Viewer Dialog */}
            <Dialog open={!!viewingPhoto} onOpenChange={(open) => !open && setViewingPhoto(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
                    {viewingPhoto && (
                        <div className="relative">
                            <img
                                src={viewingPhoto}
                                alt="Visualização"
                                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                            />
                            <button
                                onClick={() => setViewingPhoto(null)}
                                className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
                            >
                                <Plus className="h-6 w-6 rotate-45 text-black" />
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div >
    )
}

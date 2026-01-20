import { useState, useEffect, useCallback, useRef } from 'react'
import XLSX from 'xlsx-js-style'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Phone, Mail, User as UserIcon, MapPin, FileText, Camera, Upload, Download, Eye, Image as ImageIcon, Mic, MicOff } from 'lucide-react'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { SearchAssistant, SmartFilter } from '@/services/searchAssistant'
import { useLicenseCheck } from '@/hooks/useLicenseCheck'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { ocrService } from '@/services/ocrService'
import { compressImage } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { searchCep } from '@/services/cepService'
import { searchAddress, AddressSuggestion } from '@/services/addressService'
import { searchCnpj, formatPhone, formatLogradouro } from '@/services/cnpjService'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { SignaturePad } from '@/components/ui/signature-pad'
import { useOfflineClients } from '@/hooks/useOfflineData'
import { SyncService } from '@/services/syncService'

import { LocalClient } from '@/lib/db'

export function Clients() {
    const { userData } = useAuth()
    const navigate = useNavigate()
    const { clients, loading } = useOfflineClients()
    const [searchTerm, setSearchTerm] = useState('')
    const [smartFilter, setSmartFilter] = useState<SmartFilter | null>(null)

    const { isListening, startListening, stopListening } = useVoiceRecognition({
        onResult: (transcript) => {
            const parsed = SearchAssistant.parseQuery(transcript)
            setSmartFilter(parsed)
            setSearchTerm(parsed.term || transcript)
        }
    })
    const [configs, setConfigs] = useState({
        view_all_clients: true,
        can_create_client: true,
        can_import_clients: true,
        can_delete_clients: true,
        can_edit_clients: true
    })

    useEffect(() => {
        if (userData?.empresa_id && userData.cargo === 'tecnico') {
            supabase.from('empresas')
                .select('configs')
                .eq('id', userData.empresa_id)
                .single()
                .then(({ data }) => {
                    if (data?.configs) {
                        setConfigs(c => ({ ...c, ...data.configs as any }))
                    }
                })
        }
    }, [userData])

    // Form States
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingClientId, setEditingClientId] = useState<string | null>(null)
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)
    const [upgradeMessage, setUpgradeMessage] = useState('')

    const { canAddClient, isTrialExpired, usage, limits } = useLicenseCheck()

    // Form Data matches DB columns exactly now
    const initialFormState = {
        nome_razao: '',
        cpf_cnpj: '',
        whatsapp: '',
        email: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        referencia: '',
        avatar_url: '',
        signature_url: ''
    }
    const [formData, setFormData] = useState(initialFormState)
    const [searchingCep, setSearchingCep] = useState(false)

    // Autocomplete de endereço
    const [addressQuery, setAddressQuery] = useState('')
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [searchingAddress, setSearchingAddress] = useState(false)
    const addressInputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)
    const [searchingCnpj, setSearchingCnpj] = useState(false)
    const [processingOcr, setProcessingOcr] = useState(false)
    const ocrInputRef = useRef<HTMLInputElement>(null)

    // Upload States
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [viewingImage, setViewingImage] = useState<string | null>(null)

    // Signature State
    const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null)
    const [currentSignatureUrl, setCurrentSignatureUrl] = useState<string | null>(null)
    const [servicedClientIds, setServicedClientIds] = useState<string[]>([])

    // Fetch clients serviced by the technician
    useEffect(() => {
        if (userData?.id && userData.cargo === 'tecnico') {
            supabase.from('ordens_servico')
                .select('cliente_id')
                .eq('tecnico_id', userData.id)
                .not('cliente_id', 'is', null)
                .then(({ data }) => {
                    if (data) {
                        const ids = data.map(os => os.cliente_id).filter(Boolean) as string[]
                        setServicedClientIds([...new Set(ids)])
                    }
                })
        }
    }, [userData])

    const resetForm = () => {
        setFormData(initialFormState)
        setAvatarFile(null)
        setAvatarPreview(null)
        setSignatureBlob(null)
        setCurrentSignatureUrl(null)
        setAddressQuery('')
        setAddressSuggestions([])
    }

    const openNewClientDialog = useCallback(() => {
        setEditingClientId(null)
        resetForm()
        setIsDialogOpen(true)
    }, [])

    const handleNewClientClick = useCallback(() => {
        if (!canAddClient) {
            if (isTrialExpired) {
                setUpgradeMessage("Seu período de teste expirou. Assine um plano para continuar adicionando clientes.")
            } else {
                setUpgradeMessage(`Você atingiu o limite de ${limits.clients} clientes do plano gratuito.`)
            }
            setShowUpgradeModal(true)
            return
        }
        openNewClientDialog()
    }, [canAddClient, isTrialExpired, limits.clients, openNewClientDialog])

    const handleImportClick = () => {
        if (userData?.cargo === 'tecnico' && !configs.can_import_clients) {
            alert('Você não tem permissão para importar clientes.')
            return
        }
        if (!canAddClient) {
            if (isTrialExpired) {
                setUpgradeMessage("Seu período de teste expirou.")
            } else {
                setUpgradeMessage(`Você atingiu o limite de clientes.`)
            }
            setShowUpgradeModal(true)
            return
        }
        navigate('/clients/import')
    }

    const { setFabAction } = useOutletContext<{ setFabAction: (action: (() => void) | null) => void }>() ?? { setFabAction: () => { } }

    useEffect(() => {
        setFabAction(handleNewClientClick)
        return () => setFabAction(null)
    }, [handleNewClientClick, setFabAction])

    useEffect(() => {
        if (isDialogOpen && !editingClientId) {
            resetForm()
        }
    }, [isDialogOpen, editingClientId])

    // Função de busca de endereço com debounce
    const handleAddressSearch = (query: string) => {
        setAddressQuery(query)
        setShowSuggestions(true)

        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        if (query.length < 3) {
            setAddressSuggestions([])
            return
        }

        debounceRef.current = setTimeout(async () => {
            setSearchingAddress(true)
            const results = await searchAddress(query)
            setAddressSuggestions(results)
            setSearchingAddress(false)
        }, 300)
    }

    // Função para selecionar uma sugestão
    const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
        // Se tem postcode mas não tem street, tenta buscar via CEP para pegar mais dados
        let logradouro = suggestion.street || ''
        let bairro = suggestion.neighbourhood || ''
        let cidade = suggestion.city || ''
        let uf = suggestion.state_code || ''

        // Se não veio street mas veio postcode, busca via CEP
        if (!suggestion.street && suggestion.postcode) {
            const cepResult = await searchCep(suggestion.postcode)
            if (cepResult) {
                logradouro = cepResult.street || ''
                bairro = cepResult.neighborhood || bairro
                cidade = cepResult.city || cidade
                uf = cepResult.state || uf
            }
        }

        // Se ainda não tem logradouro, tenta extrair do formatted
        if (!logradouro && suggestion.formatted) {
            const parts = suggestion.formatted.split(',')
            if (parts.length > 0) {
                logradouro = parts[0].trim()
            }
        }

        setFormData(prev => ({
            ...prev,
            logradouro,
            numero: suggestion.housenumber || '',
            bairro,
            cidade,
            uf,
            cep: suggestion.postcode?.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2') || ''
        }))
        setAddressQuery('')
        setShowSuggestions(false)
        setAddressSuggestions([])
    }

    // Filter by permission (if technician and view_all_clients is false)
    const availableClients = (clients || [])
        .filter(c => {
            if (userData?.cargo === 'tecnico' && !configs.view_all_clients) {
                return c.criado_por === userData.id || servicedClientIds.includes(c.id);
            }
            return true;
        })
        .filter(c => {
            const cityFilter = smartFilter?.city?.toLowerCase()
            if (!cityFilter) return true
            return (c.cidade || '').toLowerCase().includes(cityFilter)
        })

    const handleEdit = (client: LocalClient) => {
        if (userData?.cargo === 'tecnico' && !configs.can_edit_clients) {
            alert('Você não tem permissão para editar clientes.')
            return
        }
        setEditingClientId(client.id)

        // LocalClient stores address fields separately, so we typically don't need to parse string
        // But if we ever synced legacy data that only had 'endereco' string, we might.
        // For new app structure, we use the fields directly.

        setFormData({
            nome_razao: client.nome_razao || '',
            cpf_cnpj: client.cpf_cnpj || '',
            whatsapp: client.whatsapp || '',
            email: client.email || '',
            cep: client.cep || '',
            logradouro: client.logradouro || '',
            numero: client.numero || '',
            complemento: client.complemento || '',
            bairro: client.bairro || '',
            cidade: client.cidade || '',
            uf: client.uf || '',
            referencia: client.referencia || '',
            avatar_url: client.avatar_url || '',
            signature_url: client.signature_url || ''
        })
        setAvatarPreview(client.avatar_url || null)
        setCurrentSignatureUrl(client.signature_url || null)
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (userData?.cargo === 'tecnico' && !configs.can_delete_clients) {
            alert('Você não tem permissão para excluir clientes.')
            return
        }
        if (!confirm(`Tem certeza que deseja excluir o cliente ${name}?`)) return

        try {
            await SyncService.deleteClient(id)
            alert('Cliente excluído com sucesso.')
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message)
        }
    }

    const uploadFile = async (file: File | Blob, path: string) => {
        const fileExt = file instanceof File ? file.name.split('.').pop() : 'png'
        const fileName = `${path}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file)

        if (uploadError) {
            console.error('Erro detalhado do upload:', uploadError)
            alert(`Erro no upload: ${uploadError.message}`)
            throw uploadError
        }

        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        return data.publicUrl
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        if (!userData?.empresa_id) {
            alert('Erro: Empresa não identificada. Faça login novamente.')
            return
        }

        try {
            // Check for duplicates before expensive uploads
            if (!editingClientId) {
                const cleanPhone = formData.whatsapp.replace(/\D/g, '')
                const cleanLogradouro = formData.logradouro.trim().toLowerCase()
                const cleanNumero = formData.numero.trim()

                const duplicateAddressAndPhone = (clients || []).find(c => {
                    const cPhone = (c.whatsapp || '').replace(/\D/g, '')
                    const cLogradouro = (c.logradouro || '').trim().toLowerCase()
                    const cNumero = (c.numero || '').trim()
                    return cPhone === cleanPhone && cLogradouro === cleanLogradouro && cNumero === cleanNumero
                })

                if (duplicateAddressAndPhone) {
                    alert(`Este cliente já está cadastrado: ${duplicateAddressAndPhone.nome_razao}\n(Mesmo endereço e WhatsApp)`)
                    setIsSubmitting(false)
                    return
                }

                const duplicateAddressOnly = (clients || []).find(c => {
                    const cLogradouro = (c.logradouro || '').trim().toLowerCase()
                    const cNumero = (c.numero || '').trim()
                    return cLogradouro === cleanLogradouro && cNumero === cleanNumero
                })

                if (duplicateAddressOnly) {
                    const confirmSave = confirm(`Já existe um cliente cadastrado neste endereço (${duplicateAddressOnly.nome_razao}).\nDeseja cadastrar mesmo assim?`)
                    if (!confirmSave) {
                        setIsSubmitting(false)
                        return
                    }
                }
            }

            // Uploads
            let avatarUrl = formData.avatar_url
            let signatureUrl = formData.signature_url

            // Avatar Upload
            if (avatarFile) {
                if (navigator.onLine) {
                    try {
                        // Compress image to ensure it fits limits and is standard JPEG
                        const compressedBlob = await compressImage(avatarFile)
                        const fileName = `${Math.random()}.jpg` // Always JPG after compression

                        const { error: uploadError } = await supabase.storage
                            .from('avatars')
                            .upload(fileName, compressedBlob, {
                                contentType: 'image/jpeg',
                                upsert: false
                            })

                        if (uploadError) throw uploadError

                        const { data: { publicUrl } } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(fileName)
                        avatarUrl = publicUrl
                    } catch (err: any) {
                        console.error('Erro no upload de imagem:', err)
                        // Fallback: try uploading original if compression fails, or just throw
                        alert(`Erro ao processar imagem: ${err.message}. Tente uma imagem menor.`)
                        throw err
                    }
                } else {
                    console.warn("Offline image upload not supported yet.")
                }
            }

            // Signature Upload
            if (signatureBlob) {
                if (navigator.onLine) {
                    const fileName = `signatures/${Math.random()}.png`
                    const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(fileName, signatureBlob)

                    if (uploadError) throw uploadError

                    const { data: { publicUrl } } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(fileName)
                    signatureUrl = publicUrl
                }
            }

            await SyncService.saveClient({
                id: editingClientId || undefined,
                empresa_id: userData.empresa_id,
                ...formData,
                avatar_url: avatarUrl,
                signature_url: signatureUrl,
                ativo: true,
                criado_por: !editingClientId ? userData.id : undefined // Set creator for new clients
            })

            setIsDialogOpen(false)
            resetForm()

        } catch (error: any) {
            console.error('Erro ao salvar:', error)
            alert('Erro ao salvar cliente: ' + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const getClientAddress = (client: LocalClient) => {
        if (client.endereco) return client.endereco;
        return [
            client.logradouro,
            client.numero,
            client.bairro,
            client.cidade,
            client.uf
        ].filter(Boolean).join(', ');
    }

    const filteredClients = availableClients.filter(client => {
        const address = getClientAddress(client);
        return (
            client.nome_razao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.whatsapp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client as any).telefone?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })

    const handleDownloadExample = () => {
        const headers = ["Nome/Razao Social", "CPF/CNPJ", "Whatsapp", "Email", "CEP", "Logradouro", "Numero", "Complemento", "Bairro", "Cidade", "UF", "Referencia"]
        const exampleRow = ["João Exemplo", "123.456.789-00", "41999999999", "joao@email.com", "80000-000", "Rua das Flores", "123", "Apto 101", "Centro", "Curitiba", "PR", "Perto da Praça"]

        const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow])

        // Add styles to header row
        const cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]
        cols.forEach(col => {
            const cell = worksheet[`${col}1`]
            if (cell) {
                cell.s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "4F46E5" } }, // Indigo-600 like
                    alignment: { horizontal: "center" }
                }
            }
        })

        // Adjust column widths
        worksheet['!cols'] = [
            { wch: 30 }, // Nome
            { wch: 18 }, // CPF
            { wch: 15 }, // Whatsapp
            { wch: 25 }, // Email
            { wch: 12 }, // CEP
            { wch: 30 }, // Logradouro
            { wch: 10 }, // Numero
            { wch: 20 }, // Complemento
            { wch: 20 }, // Bairro
            { wch: 20 }, // Cidade
            { wch: 5 },  // UF
            { wch: 30 }, // Referencia
        ]

        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo Importação")
        XLSX.writeFile(workbook, "modelo_importacao_clientes.xlsx")
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0 mt-6 md:mt-0">
            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                description={upgradeMessage}
            />

            <div className="flex justify-end mb-4 gap-2 items-center flex-wrap">
                {(userData?.cargo === 'admin' || configs.can_import_clients) && (
                    <Button
                        variant="outline"
                        className="h-9 text-sm px-3 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
                        onClick={handleDownloadExample}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Baixar Modelo</span>
                        <span className="md:hidden">Modelo</span>
                    </Button>
                )}

                {(userData?.cargo === 'admin' || configs.can_import_clients) && (
                    <Button
                        className="h-9 text-sm px-3 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleImportClick}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Importar CSV</span>
                        <span className="md:hidden">Importar</span>
                    </Button>
                )}

                {(userData?.cargo === 'admin' || configs.can_create_client) && (
                    <Button className="h-9 text-sm px-3 shadow-sm" onClick={handleNewClientClick}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Novo Cliente</span>
                        <span className="md:hidden">Novo</span>
                    </Button>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="w-[95%] max-w-[600px] max-h-[85vh] overflow-y-auto rounded-xl">
                    <DialogHeader>
                        <DialogTitle>{editingClientId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                        <DialogDescription>Preencha os dados do cliente.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 pt-4 pb-48 md:pb-4" autoComplete="off">

                        {/* FOTO DA FACHADA / AVATAR */}
                        <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center bg-muted/20 relative min-h-[160px]">
                            {avatarPreview ? (
                                <>
                                    <img src={avatarPreview} alt="Fachada" className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-50" />
                                    <div className="z-10 flex gap-4">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setViewingImage(avatarPreview)
                                            }}
                                            className="bg-background/80 p-3 rounded-full shadow-sm hover:bg-background transition-colors"
                                            title="Visualizar Imagem"
                                        >
                                            <Eye className="h-6 w-6 text-foreground" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                // Trigger file input manually since we stop propagation
                                                const fileInput = e.currentTarget.parentElement?.parentElement?.querySelector('input[type="file"]') as HTMLInputElement
                                                fileInput?.click()
                                            }}
                                            className="bg-background/80 p-3 rounded-full shadow-sm hover:bg-background transition-colors"
                                            title="Alterar Imagem"
                                        >
                                            <ImageIcon className="h-6 w-6 text-foreground" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center text-muted-foreground pointer-events-none">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                                        <ImageIcon className="h-6 w-6" />
                                    </div>
                                    <span className="font-semibold text-sm">ADICIONAR FOTO DA FACHADA / AVATAR</span>
                                    <span className="text-xs">Toque para selecionar da galeria</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                        setAvatarFile(file)
                                        setAvatarPreview(URL.createObjectURL(file))
                                    }
                                }}
                            />
                        </div>

                        {/* Image Viewer Dialog */}
                        <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
                            <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
                                {viewingImage && (
                                    <div className="relative">
                                        <img
                                            src={viewingImage}
                                            alt="Visualização"
                                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                                        />
                                        <button
                                            onClick={() => setViewingImage(null)}
                                            className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
                                        >
                                            <Plus className="h-6 w-6 rotate-45 text-black" />
                                        </button>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>

                        {/* OCR / Import via Photo */}
                        {/* OCR / Import via Photo - Glassmorphism */}
                        <div
                            onClick={() => !processingOcr && ocrInputRef.current?.click()}
                            className={`relative overflow-hidden rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 shadow-lg p-6 mb-8 group transition-all hover:shadow-xl hover:bg-white/50 cursor-pointer ${processingOcr ? 'opacity-70 pointer-events-none' : ''}`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-purple-500/5 to-blue-500/10 pointer-events-none" />

                            <div className="relative flex items-center gap-6">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    {processingOcr ? (
                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <Camera className="h-6 w-6" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800 text-lg leading-tight">Escanear Ficha Manual</h3>
                                    <p className="text-sm text-slate-500">
                                        {processingOcr ? 'Processando imagem...' : 'Toque aqui para usar a IA e preencher os dados automaticamente'}
                                    </p>
                                </div>

                                <input
                                    type="file"
                                    ref={ocrInputRef}
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return

                                        setProcessingOcr(true)
                                        try {
                                            const compressedFile = await compressImage(file, 1024, 0.7)
                                            const data = await ocrService.processHandwriting(compressedFile)

                                            if (data) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    nome_razao: data.nome || prev.nome_razao,
                                                    whatsapp: data.telefone ? formatPhone(data.telefone) : prev.whatsapp,
                                                    cep: data.cep?.replace(/(\d{5})(\d)/, '$1-$2') || prev.cep,
                                                    logradouro: data.logradouro || prev.logradouro,
                                                    numero: data.numero || prev.numero,
                                                    complemento: data.complemento || prev.complemento,
                                                    bairro: data.bairro || prev.bairro,
                                                    cidade: data.cidade || prev.cidade,
                                                    uf: data.uf || prev.uf,
                                                }))

                                                // Trigger CEP search if CEP is new and valid
                                                if (data.cep && data.cep !== formData.cep) {
                                                    const cepClean = data.cep.replace(/\D/g, '')
                                                    if (cepClean.length === 8) {
                                                        searchCep(cepClean) // Fire and forget update
                                                    }
                                                }

                                                alert('Ficha processada com sucesso! Verifique os dados.')
                                            }
                                        } catch (error: any) {
                                            console.error(error)
                                            alert(`Erro ao processar imagem: ${error.message || error}`)
                                        } finally {
                                            setProcessingOcr(false)
                                            if (ocrInputRef.current) ocrInputRef.current.value = ''
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Informações Básicas</h3>

                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo / Razão Social</Label>
                                <Input
                                    id="name"
                                    required
                                    className="h-12 text-lg"
                                    placeholder="Ex: João da Silva"
                                    value={formData.nome_razao}
                                    onChange={e => setFormData({ ...formData, nome_razao: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="document">CPF / CNPJ</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="document"
                                            className="h-12 text-lg flex-1"
                                            placeholder="000.000.000-00"
                                            value={formData.cpf_cnpj}
                                            onChange={e => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-12 px-4 text-emerald-600 border-emerald-200 hover:bg-emerald-50 whitespace-nowrap"
                                            disabled={searchingCnpj || formData.cpf_cnpj.replace(/\D/g, '').length !== 14}
                                            onClick={async () => {
                                                setSearchingCnpj(true)
                                                const result = await searchCnpj(formData.cpf_cnpj)
                                                setSearchingCnpj(false)
                                                if (result) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        nome_razao: result.razao_social || prev.nome_razao,
                                                        logradouro: formatLogradouro(result.descricao_tipo_de_logradouro, result.logradouro) || prev.logradouro,
                                                        numero: result.numero || prev.numero,
                                                        bairro: result.bairro || prev.bairro,
                                                        cidade: result.municipio || prev.cidade,
                                                        uf: result.uf || prev.uf,
                                                        cep: result.cep?.replace(/(\d{5})(\d)/, '$1-$2') || prev.cep,
                                                        whatsapp: formatPhone(result.ddd_telefone_1) || prev.whatsapp
                                                    }))
                                                    alert(`CNPJ encontrado! Dados de "${result.razao_social}" preenchidos.`)
                                                } else {
                                                    alert('CNPJ não encontrado ou inválido.')
                                                }
                                            }}
                                        >
                                            {searchingCnpj ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                                            ) : (
                                                <Search className="h-4 w-4" />
                                            )}
                                            <span className="ml-1">Buscar</span>
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-400">Para CNPJ, clique em "Buscar" para preencher automaticamente</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">WhatsApp</Label>
                                    <Input
                                        id="phone"
                                        className="h-12 text-lg"
                                        placeholder="(11) 99999-9999"
                                        value={formData.whatsapp}
                                        onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Endereço de Atendimento</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cep">CEP</Label>
                                    <div className="relative">
                                        <Input
                                            id="cep"
                                            className="h-12 text-lg"
                                            placeholder="00000-000"
                                            maxLength={9}
                                            value={formData.cep}
                                            onChange={async (e) => {
                                                const formatted = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9)
                                                setFormData({ ...formData, cep: formatted })

                                                // Busca automática quando CEP completo
                                                if (formatted.replace(/\D/g, '').length === 8) {
                                                    setSearchingCep(true)
                                                    const result = await searchCep(formatted)
                                                    setSearchingCep(false)
                                                    if (result) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            logradouro: result.street || prev.logradouro,
                                                            bairro: result.neighborhood || prev.bairro,
                                                            cidade: result.city || prev.cidade,
                                                            uf: result.state || prev.uf
                                                        }))
                                                    }
                                                }
                                            }}
                                        />
                                        {searchingCep && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400">Digite o CEP ou preencha o endereço manualmente</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="numero">Número</Label>
                                    <Input
                                        id="numero"
                                        className="h-12 text-lg"
                                        placeholder="123"
                                        value={formData.numero}
                                        onChange={e => setFormData({ ...formData, numero: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Logradouro com autocomplete */}
                            <div className="space-y-2 relative">
                                <Label htmlFor="logradouro">Logradouro (Rua/Av.)</Label>
                                <Input
                                    id="logradouro"
                                    className="h-12 text-lg"
                                    placeholder="Digite a rua ou avenida..."
                                    value={formData.logradouro || addressQuery}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setFormData({ ...formData, logradouro: value })
                                        handleAddressSearch(value)
                                    }}
                                    onFocus={() => {
                                        if (!formData.logradouro) setShowSuggestions(true)
                                    }}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                />
                                {searchingAddress && (
                                    <div className="absolute right-3 top-[calc(50%+4px)] -translate-y-1/2">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                                    </div>
                                )}

                                {/* Dropdown de sugestões */}
                                {showSuggestions && addressSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                        {addressSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors flex items-start gap-3 border-b border-slate-50 last:border-b-0"
                                                onClick={() => handleSelectSuggestion(suggestion)}
                                            >
                                                <MapPin className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-700 truncate">
                                                        {suggestion.street
                                                            ? `${suggestion.street}${suggestion.housenumber ? `, ${suggestion.housenumber}` : ''}`
                                                            : suggestion.formatted?.split(',')[0] || 'Endereço'
                                                        }
                                                    </p>
                                                    <p className="text-xs text-slate-400 truncate">
                                                        {suggestion.neighbourhood ? `${suggestion.neighbourhood}, ` : ''}{suggestion.city}/{suggestion.state_code}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bairro">Bairro</Label>
                                    <Input
                                        id="bairro"
                                        className="h-12 text-lg"
                                        placeholder="Bairro"
                                        value={formData.bairro}
                                        onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cidade">Cidade</Label>
                                    <Input
                                        id="cidade"
                                        className="h-12 text-lg"
                                        placeholder="Cidade"
                                        value={formData.cidade}
                                        onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="uf">UF</Label>
                                    <Input
                                        id="uf"
                                        className="h-12 text-lg"
                                        placeholder="SP"
                                        maxLength={2}
                                        value={formData.uf}
                                        onChange={e => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="complemento">Complemento</Label>
                                    <Input
                                        id="complemento"
                                        className="h-12 text-lg"
                                        placeholder="Ex: Apto 10"
                                        value={formData.complemento}
                                        onChange={e => setFormData({ ...formData, complemento: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reference">Ponto de Referência</Label>
                                <Input
                                    id="reference"
                                    className="h-12 text-lg"
                                    placeholder="Ex: Próximo à padaria..."
                                    value={formData.referencia}
                                    onChange={e => setFormData({ ...formData, referencia: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail (Opcional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    className="h-12 text-lg"
                                    placeholder="cliente@email.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-14 text-lg font-semibold mt-4 shadow-md" disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : (editingClientId ? 'Atualizar Cliente' : 'Cadastrar Cliente')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>


            <div className="relative group max-w-2xl mx-auto mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                <Input
                    placeholder="Buscar por nome ou telefone..."
                    className="pl-12 pr-14 h-14 text-lg shadow-2xl shadow-blue-900/5 border-0 bg-white/80 backdrop-blur-xl rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setSmartFilter(null)
                    }}
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl transition-all",
                        isListening ? "bg-red-50 text-red-500 animate-pulse" : "text-muted-foreground hover:bg-slate-50"
                    )}
                    onClick={(e) => {
                        e.preventDefault()
                        isListening ? stopListening() : startListening()
                    }}
                >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
            </div>

            {
                loading ? (
                    <div className="text-center py-10">Carregando clientes...</div>
                ) : filteredClients.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        Nenhum cliente encontrado.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredClients.map((client) => (
                            <div key={client.id} className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-md hover:shadow-lg transition-all active:scale-[0.98] min-w-0">
                                <div className="flex items-start gap-3 md:gap-4">
                                    <div className="h-12 w-12 md:h-14 md:w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 border border-border">
                                        {client.avatar_url ? (
                                            <img src={client.avatar_url} alt={client.nome_razao} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-primary/10">
                                                <UserIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-base md:text-lg truncate">{client.nome_razao}</h3>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 shrink-0 text-green-500" />
                                                <span className="truncate">{formatPhone(client.whatsapp) || 'Sem telefone'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
                                                <span className="truncate max-w-full">
                                                    {getClientAddress(client)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 mt-4 absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Actions moved or kept here? The original code had them in a separate div below or floating? 
                                        Original code had them in a div `flex flex-wrap items-center gap-2 mt-4` inside the card flex flow.
                                        Let's stick to the original structure I viewed.
                                    */}
                                    </div>
                                </div>

                                {/* Actions Row */}
                                <div className="flex items-center gap-2 mt-4 ml-1">
                                    {client.whatsapp && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-10 w-10 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                onClick={() => window.open(`tel:${client.whatsapp?.replace(/\D/g, '')}`, '_self')}
                                                title="Ligar"
                                            >
                                                <Phone className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-10 w-10 rounded-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                onClick={() => window.open(`https://wa.me/55${client.whatsapp?.replace(/\D/g, '')}`, '_blank')}
                                                title="WhatsApp"
                                            >
                                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                            </Button>
                                        </>
                                    )}
                                    {getClientAddress(client) && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 rounded-full border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getClientAddress(client))}`, '_blank')}
                                            title="Navegar"
                                        >
                                            <MapPin className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 rounded-full border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                        onClick={() => navigate(`/service-orders/new?client_id=${client.id}`)}
                                        title="Nova OS"
                                    >
                                        <FileText className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="mt-4 flex items-center gap-2 pt-4 border-t border-border">
                                    <Button variant="outline" className="flex-1 h-9 text-xs font-medium" onClick={() => handleEdit(client)}>
                                        <Pencil className="mr-2 h-3.5 w-3.5" />
                                        Editar
                                    </Button>
                                    <Button variant="destructive" className="flex-1 h-9 text-xs font-medium" onClick={() => handleDelete(client.id, client.nome_razao)}>
                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                        Excluir
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    )
}

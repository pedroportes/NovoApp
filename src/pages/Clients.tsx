import { useState, useEffect, useCallback, useRef } from 'react'
import XLSX from 'xlsx-js-style'
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Phone, Mail, User as UserIcon, MapPin, FileText, Camera, Upload, Download, Eye, Image as ImageIcon, Mic, MicOff, Building2, MessageSquare, ClipboardPaste, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { SearchAssistant, SmartFilter } from '@/services/searchAssistant'
import { useLicenseCheck } from '@/hooks/useLicenseCheck'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { ocrService } from '@/services/ocrService'
import { compressImage } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useBrand } from '@/contexts/BrandContext'
import { searchCep } from '@/services/cepService'
import { searchAddress, AddressSuggestion } from '@/services/addressService'
import { searchCnpj, formatPhone, formatLogradouro } from '@/services/cnpjService'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    const { brands, selectedBrandId } = useBrand()
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


    const maskPhoneInput = (val: string) => {
        let clean = val.replace(/\D/g, '').slice(0, 11)
        if (clean.length === 0) return ''
        if (clean.length <= 2) return `(${clean}`
        if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`
        if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`
    }

    const normalizePhoneWithDDD = (val: string) => {
        if (!val) return ''
        let clean = val.replace(/\D/g, '')
        // Se o usuário digitou sem DDD (8 ou 9 dígitos), auto-preenche DDD 41 (Curitiba e Região)
        if (clean.length === 8 || clean.length === 9) {
            clean = '41' + clean
        }
        return maskPhoneInput(clean)
    }

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
        signature_url: '',
        marca_id: ''
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
    const [showTextImport, setShowTextImport] = useState(false)
    const [rawWhatsappText, setRawWhatsappText] = useState('')
    const ocrInputRef = useRef<HTMLInputElement>(null)

    // Processa Imagem (Ficha física ou Print do WhatsApp)
    const handleProcessImage = async (file: Blob) => {
        setProcessingOcr(true)
        try {
            const compressedFile = await compressImage(file as File, 1024, 0.7)
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

                if (data.cep) {
                    const cepClean = data.cep.replace(/\D/g, '')
                    if (cepClean.length === 8) {
                        searchCep(cepClean)
                    }
                }

                toast.success('Dados extraídos com sucesso pela IA!')
            }
        } catch (error: any) {
            console.error(error)
            toast.error(`Erro ao processar imagem: ${error.message || error}`)
        } finally {
            setProcessingOcr(false)
            if (ocrInputRef.current) ocrInputRef.current.value = ''
        }
    }

    // Processa Texto do WhatsApp copiado
    const handleProcessText = async (textToProcess?: string) => {
        const text = textToProcess || rawWhatsappText
        if (!text.trim()) {
            toast.error('Cole o texto da conversa do WhatsApp primeiro.')
            return
        }

        setProcessingOcr(true)
        try {
            const data = await ocrService.processText(text)

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

                if (data.cep) {
                    const cepClean = data.cep.replace(/\D/g, '')
                    if (cepClean.length === 8) {
                        searchCep(cepClean)
                    }
                }

                toast.success('Conversa do WhatsApp analisada com sucesso pela IA!')
                setShowTextImport(false)
                setRawWhatsappText('')
            }
        } catch (error: any) {
            console.error(error)
            toast.error(`Erro ao analisar texto: ${error.message || error}`)
        } finally {
            setProcessingOcr(false)
        }
    }

    // Suporte a Colar Print da Área de Transferência (Ctrl+V)
    useEffect(() => {
        if (!isDialogOpen) return

        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items
            if (!items) return

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile()
                    if (file) {
                        e.preventDefault()
                        handleProcessImage(file)
                        break
                    }
                }
            }
        }

        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [isDialogOpen])

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
        setFormData({
            ...initialFormState,
            marca_id: selectedBrandId && selectedBrandId !== 'all' ? selectedBrandId : (brands[0]?.id || '')
        })
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

    const [searchParams, setSearchParams] = useSearchParams()

    useEffect(() => {
        if (searchParams.get('new') === 'true' && canAddClient !== undefined) {
            // Wait for license check to be ready
            if (canAddClient) {
                // Remove the param so it doesn't re-open on refresh
                const newParams = new URLSearchParams(searchParams)
                newParams.delete('new')
                setSearchParams(newParams, { replace: true })

                handleNewClientClick()
            } else if (isTrialExpired || usage.clients >= Number(limits.clients)) {
                // If they can't add, we still clear the param so they don't get stuck
                const newParams = new URLSearchParams(searchParams)
                newParams.delete('new')
                setSearchParams(newParams, { replace: true })
            }
        }
    }, [searchParams, canAddClient, handleNewClientClick, setSearchParams, isTrialExpired, usage, limits])

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
            if (selectedBrandId && selectedBrandId !== 'all') {
                if (brands.length > 0 && selectedBrandId === brands[0].id) {
                    return !c.marca_id || c.marca_id === selectedBrandId;
                }
                return c.marca_id === selectedBrandId;
            }
            return true;
        })
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

    // Processa os parâmetros ?edit=CLIENT_ID e ?search=QUERY da URL
    useEffect(() => {
        const editId = searchParams.get('edit')
        const searchQ = searchParams.get('search')

        if (searchQ) {
            setSearchTerm(searchQ)
        }

        if (editId && clients && clients.length > 0) {
            const target = clients.find(c => c.id === editId)
            if (target) {
                handleEdit(target)
                // Limpa o param da URL para não reabrir em refresh acidental
                const nextParams = new URLSearchParams(searchParams)
                nextParams.delete('edit')
                setSearchParams(nextParams, { replace: true })
            }
        }
    }, [searchParams, clients])

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
            signature_url: client.signature_url || '',
            marca_id: client.marca_id || (brands[0]?.id || '')
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

            // Normalize whatsapp with DDD
            let finalWhatsapp = formData.whatsapp ? normalizePhoneWithDDD(formData.whatsapp) : ''
            if (finalWhatsapp) {
                const digits = finalWhatsapp.replace(/\D/g, '')
                if (digits.length < 10) {
                    alert('O número de WhatsApp precisa conter o DDD (ex: (41) 99999-9999).')
                    setIsSubmitting(false)
                    return
                }
            }

            await SyncService.saveClient({
                id: editingClientId || undefined,
                empresa_id: userData.empresa_id,
                ...formData,
                whatsapp: finalWhatsapp,
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

    const [visibleCount, setVisibleCount] = useState(60)

    useEffect(() => {
        setVisibleCount(60)
    }, [searchTerm, selectedBrandId])

    // Ordena do mais recém-criado (topo) para o mais antigo (fim)
    const sortedClients = [...filteredClients].sort((a, b) => {
        const getTime = (val: any) => {
            if (!val) return 0;
            const d = new Date(val).getTime();
            return isNaN(d) ? 0 : d;
        };
        const tA = getTime(a.created_at) || getTime((a as any).criado_em) || getTime(a.updated_at);
        const tB = getTime(b.created_at) || getTime((b as any).criado_em) || getTime(b.updated_at);
        return tB - tA;
    });

    const displayedClients = sortedClients.slice(0, visibleCount)

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

                        {/* SELETOR DE DESENTUPIDORA (MARCA) */}
                        {brands.length > 1 && (
                            <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                                <Label htmlFor="marca_id" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Building2 className="h-4 w-4 text-emerald-600" />
                                    Desentupidora Responsável (Filial)
                                </Label>
                                <Select
                                    value={formData.marca_id || (selectedBrandId !== 'all' ? selectedBrandId : brands[0]?.id)}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, marca_id: val }))}
                                >
                                    <SelectTrigger className="h-12 bg-white text-sm font-semibold border-slate-200 rounded-xl shadow-sm">
                                        <SelectValue placeholder="Selecione a desentupidora" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white z-50">
                                        {brands.map((b) => (
                                            <SelectItem key={b.id} value={b.id} className="cursor-pointer py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <span 
                                                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" 
                                                        style={{ backgroundColor: b.cor_tema || '#10b981' }} 
                                                    />
                                                    <span className="font-bold text-slate-800">{b.nome}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-slate-400">
                                    Define qual desentupidora é a dona deste cliente para relatórios e filtros.
                                </p>
                            </div>
                        )}

                        {/* IA Auto-Fill: Ficha Física ou Print do WhatsApp */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-blue-500/10 border border-emerald-500/20 shadow-md p-5 mb-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
                                    {processingOcr ? (
                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <Sparkles className="h-6 w-6 text-white" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 text-base leading-tight">
                                            Preenchimento com IA
                                        </h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                            Ficha ou Print do WhatsApp
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        {processingOcr
                                            ? 'A Inteligência Artificial está analisando os dados...'
                                            : 'Envie um print da conversa do WhatsApp ou foto da ficha de papel para preencher tudo sozinho.'}
                                    </p>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-emerald-100/60">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={processingOcr}
                                    onClick={() => ocrInputRef.current?.click()}
                                    className="bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold text-xs h-9 gap-1.5 shadow-xs cursor-pointer"
                                >
                                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Tirar Foto / Escolher Print</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={processingOcr}
                                    onClick={async () => {
                                        try {
                                            const clipboardItems = await navigator.clipboard.read()
                                            for (const item of clipboardItems) {
                                                const imageType = item.types.find(t => t.startsWith('image/'))
                                                if (imageType) {
                                                    const blob = await item.getType(imageType)
                                                    handleProcessImage(blob)
                                                    return
                                                }
                                            }
                                            toast.info('Nenhum print copiado. Pressione Win+Shift+S no WhatsApp e tente de novo.')
                                        } catch (err) {
                                            ocrInputRef.current?.click()
                                        }
                                    }}
                                    className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-semibold text-xs h-9 gap-1.5 shadow-xs cursor-pointer"
                                    title="Cole o print que você tirou com Win+Shift+S ou copiou"
                                >
                                    <ClipboardPaste className="w-3.5 h-3.5 text-slate-600" />
                                    <span>Colar Print (Ctrl+V)</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={processingOcr}
                                    onClick={() => setShowTextImport(!showTextImport)}
                                    className="text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs h-9 gap-1.5 cursor-pointer ml-auto"
                                >
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{showTextImport ? 'Fechar Texto' : 'Colar Texto do WhatsApp'}</span>
                                </Button>
                            </div>

                            {/* Campo de Colar Texto do WhatsApp */}
                            {showTextImport && (
                                <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                        <span>Copie e cole a mensagem do WhatsApp aqui:</span>
                                        <button
                                            type="button"
                                            className="text-[11px] text-emerald-600 hover:underline cursor-pointer"
                                            onClick={async () => {
                                                try {
                                                    const text = await navigator.clipboard.readText()
                                                    if (text) {
                                                        setRawWhatsappText(text)
                                                        handleProcessText(text)
                                                    }
                                                } catch (err) {
                                                    toast.info('Cole com Ctrl+V no campo abaixo.')
                                                }
                                            }}
                                        >
                                            Colar da Área de Transferência
                                        </button>
                                    </label>
                                    <textarea
                                        value={rawWhatsappText}
                                        onChange={(e) => setRawWhatsappText(e.target.value)}
                                        placeholder="Ex: Olá, meu nome é Maria Silva, preciso de desentupimento na Rua XV de Novembro, 1234, Centro. Meu whats é 41 99999-9999"
                                        rows={3}
                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={processingOcr || !rawWhatsappText.trim()}
                                        onClick={() => handleProcessText()}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-lg shadow-sm cursor-pointer"
                                    >
                                        Extrair Dados com IA
                                    </Button>
                                </div>
                            )}

                            {/* Input oculto sem capture para aceitar câmera, galeria ou arquivos */}
                            <input
                                type="file"
                                ref={ocrInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleProcessImage(file)
                                }}
                            />
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
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="phone">WhatsApp (com DDD obrigatório)</Label>
                                        <span className="text-[11px] text-emerald-600 font-semibold">Ex: (41) 98450-1037</span>
                                    </div>
                                    <Input
                                        id="phone"
                                        className="h-12 text-lg"
                                        placeholder="(41) 99999-9999"
                                        value={formData.whatsapp}
                                        onChange={e => {
                                            const formatted = maskPhoneInput(e.target.value)
                                            setFormData({ ...formData, whatsapp: formatted })
                                        }}
                                        onBlur={() => {
                                            if (formData.whatsapp) {
                                                const withDdd = normalizePhoneWithDDD(formData.whatsapp)
                                                setFormData(prev => ({ ...prev, whatsapp: withDdd }))
                                            }
                                        }}
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

                            {/* FOTO DA FACHADA / AVATAR (MOVIDA PARA O FINAL) */}
                            <div className="space-y-2 pt-2">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Foto da Fachada / Local (Opcional)
                                </Label>
                                <div className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center bg-muted/20 relative min-h-[140px] hover:bg-muted/40 transition-colors cursor-pointer">
                                    {avatarPreview ? (
                                        <>
                                            <img src={avatarPreview} alt="Fachada" className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-60" />
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
                                                    <Eye className="h-5 w-5 text-foreground" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        const fileInput = e.currentTarget.parentElement?.parentElement?.querySelector('input[type="file"]') as HTMLInputElement
                                                        fileInput?.click()
                                                    }}
                                                    className="bg-background/80 p-3 rounded-full shadow-sm hover:bg-background transition-colors"
                                                    title="Alterar Imagem"
                                                >
                                                    <ImageIcon className="h-5 w-5 text-foreground" />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center text-muted-foreground pointer-events-none">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-1.5">
                                                <ImageIcon className="h-5 w-5" />
                                            </div>
                                            <span className="font-semibold text-xs">ADICIONAR FOTO DA FACHADA / AVATAR</span>
                                            <span className="text-[11px] text-slate-400">Toque para selecionar da galeria</span>
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

            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 max-w-2xl mx-auto -mt-5 mb-6 px-2">
                <span>Total: <strong className="text-slate-800 font-bold">{filteredClients.length}</strong> clientes</span>
                {filteredClients.length > visibleCount && (
                    <span className="text-slate-400 font-normal">Mostrando primeiros {displayedClients.length}</span>
                )}
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
                        {displayedClients.map((client) => (
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
                                        <h3 className="font-bold text-base md:text-lg truncate leading-tight">{client.nome_razao}</h3>
                                        {(() => {
                                            const brand = brands.find(b => b.id === client.marca_id) || (brands.length > 0 ? brands[0] : null)
                                            if (!brand) return null
                                            return (
                                                <div className="mt-1 mb-1.5 flex items-center">
                                                    <span 
                                                        className="text-[10px] px-2.5 py-0.5 rounded-full font-bold truncate max-w-full inline-block"
                                                        style={{ 
                                                            backgroundColor: `${brand.cor_tema || '#10b981'}18`,
                                                            color: brand.cor_tema || '#10b981'
                                                        }}
                                                    >
                                                        {brand.nome}
                                                    </span>
                                                </div>
                                            )
                                        })()}
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

            {visibleCount < filteredClients.length && (
                <div className="flex flex-col items-center justify-center gap-2 mt-8 pb-10">
                    <Button
                        variant="outline"
                        className="h-12 px-8 rounded-2xl border-slate-300 bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all hover:scale-105"
                        onClick={() => setVisibleCount(prev => prev + 60)}
                    >
                        Carregar mais clientes ({filteredClients.length - visibleCount} restantes)
                    </Button>
                    <p className="text-xs text-slate-400">
                        Exibindo {displayedClients.length} de {filteredClients.length} clientes cadastrados
                    </p>
                </div>
            )}
        </div >
    )
}

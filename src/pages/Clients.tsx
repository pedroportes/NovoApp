import { useState, useEffect, useCallback, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Phone, Mail, User as UserIcon, MapPin, FileText, Camera } from 'lucide-react'
import { ocrService } from '@/services/ocrService'
import { compressImage } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { searchCep } from '@/services/cepService'
import { searchAddress, AddressSuggestion } from '@/services/addressService'
import { searchCnpj, formatPhone, formatLogradouro } from '@/services/cnpjService'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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

interface Client {
    id: string
    nome_razao: string
    cpf_cnpj?: string
    whatsapp?: string
    email?: string
    endereco?: string
    referencia?: string
    avatar_url?: string
    signature_url?: string
    empresa_id: string
    cidade?: string
    uf?: string
}

export function Clients() {
    const { userData } = useAuth()
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Form States
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingClientId, setEditingClientId] = useState<string | null>(null)

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
        referencia: ''
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

    // Signature State
    const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null)
    const [currentSignatureUrl, setCurrentSignatureUrl] = useState<string | null>(null)

    useEffect(() => {
        if (userData?.empresa_id) {
            fetchClients()
        }
    }, [userData?.empresa_id])

    const openNewClientDialog = useCallback(() => {
        setEditingClientId(null)
        resetForm()
        setIsDialogOpen(true)
    }, [])

    const { setFabAction } = useOutletContext<{ setFabAction: (action: (() => void) | null) => void }>() ?? { setFabAction: () => { } }

    useEffect(() => {
        setFabAction(openNewClientDialog)
        return () => setFabAction(null)
    }, [openNewClientDialog, setFabAction])

    useEffect(() => {
        if (isDialogOpen && !editingClientId) {
            resetForm()
        }
    }, [isDialogOpen, editingClientId])

    const resetForm = () => {
        setFormData(initialFormState)
        setAvatarFile(null)
        setAvatarPreview(null)
        setSignatureBlob(null)
        setCurrentSignatureUrl(null)
        setAddressQuery('')
        setAddressSuggestions([])
    }

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

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('empresa_id', userData!.empresa_id)
                .order('nome_razao')

            if (error) throw error
            setClients(data as Client[])
        } catch (error) {
            console.error('Erro ao buscar clientes:', error)
        } finally {
            setLoading(false)
        }
    }


    const handleEdit = (client: Client) => {
        setEditingClientId(client.id)
        // Parse endereco if it exists (format: Logradouro, Numero - Bairro, Cidade/UF)
        const enderecoParts = (client.endereco || '').split(' - ')
        const logradouroNumero = enderecoParts[0]?.split(', ') || []
        const bairroCidade = enderecoParts[1]?.split(', ') || []

        setFormData({
            nome_razao: client.nome_razao || '',
            cpf_cnpj: client.cpf_cnpj || '',
            whatsapp: client.whatsapp || '',
            email: client.email || '',
            cep: '',
            logradouro: logradouroNumero[0] || '',
            numero: logradouroNumero[1] || '',
            complemento: '',
            bairro: bairroCidade[0] || '',
            cidade: bairroCidade[1]?.split('/')[0] || '',
            uf: bairroCidade[1]?.split('/')[1] || '',
            referencia: client.referencia || ''
        })
        setAvatarPreview(client.avatar_url || null)
        setCurrentSignatureUrl(client.signature_url || null)
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o cliente ${name}?`)) return

        try {
            const { error } = await (supabase
                .from('clientes') as any)
                .delete()
                .eq('id', id)
                .eq('empresa_id', userData!.empresa_id)

            if (error) throw error

            alert('Cliente excluído com sucesso.')
            fetchClients()
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
            // Uploads
            let newAvatarUrl = avatarPreview
            let newSignatureUrl = currentSignatureUrl

            if (avatarFile) {
                // Compress before upload
                const compressedBlob = await compressImage(avatarFile)
                newAvatarUrl = await uploadFile(compressedBlob, `client-avatar`)
            }

            if (signatureBlob) {
                newSignatureUrl = await uploadFile(signatureBlob, `client-sig`)
            }

            // Monta endereço completo a partir dos campos separados
            const enderecoCompleto = [
                formData.logradouro,
                formData.numero,
                formData.complemento ? `(${formData.complemento})` : '',
                '-',
                formData.bairro,
                formData.cidade ? `${formData.cidade}/${formData.uf}` : ''
            ].filter(Boolean).join(', ').replace(', -,', ' -')

            const payload = {
                nome_razao: formData.nome_razao,
                cpf_cnpj: formData.cpf_cnpj,
                whatsapp: formData.whatsapp,
                email: formData.email,
                endereco: enderecoCompleto,
                referencia: formData.referencia,
                avatar_url: newAvatarUrl,
                signature_url: newSignatureUrl,
                empresa_id: userData.empresa_id
            }

            let error;

            if (editingClientId) {
                // UPDATE
                const { error: updateError } = await (supabase
                    .from('clientes') as any)
                    .update(payload)
                    .eq('id', editingClientId)
                    .eq('empresa_id', userData.empresa_id)
                error = updateError
            } else {
                // CREATE
                const { error: insertError } = await (supabase
                    .from('clientes') as any)
                    .insert([payload])
                error = insertError
            }

            if (error) throw error

            alert(editingClientId ? 'Cliente atualizado!' : 'Cliente cadastrado com sucesso!')
            setIsDialogOpen(false)
            fetchClients()

        } catch (error: any) {
            console.error(error)
            alert('Erro: ' + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const filteredClients = clients.filter(client =>
        client.nome_razao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.whatsapp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.endereco?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client as any).telefone?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex justify-end mb-4">

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="hidden md:flex h-14 text-base md:w-auto w-full shadow-lg" onClick={openNewClientDialog}>
                            <Plus className="mr-2 h-5 w-5" />
                            Novo Cliente
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95%] max-w-[600px] h-[90vh] overflow-y-auto rounded-xl">
                        <DialogHeader>
                            <DialogTitle>{editingClientId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                            <DialogDescription>Preencha os dados do cliente.</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-6 py-4" autoComplete="off">

                            {/* FOTO DA FACHADA / AVATAR */}
                            <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center bg-muted/20 relative min-h-[160px]">
                                {avatarPreview ? (
                                    <>
                                        <img src={avatarPreview} alt="Fachada" className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-50" />
                                        <div className="z-10 bg-background/80 p-2 rounded-full shadow-sm">
                                            <Pencil className="h-6 w-6 text-foreground" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center text-muted-foreground">
                                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                                            <div className="h-6 w-6 border-2 border-current rounded-sm" /> {/* Icon placeholder like Image */}
                                        </div>
                                        <span className="font-semibold text-sm">ADICIONAR FOTO DA FACHADA / AVATAR</span>
                                        <span className="text-xs">Toque para selecionar</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            setAvatarFile(file)
                                            setAvatarPreview(URL.createObjectURL(file))
                                        }
                                    }}
                                />
                            </div>

                            {/* OCR / Import via Photo */}
                            {/* OCR / Import via Photo - Glassmorphism */}
                            <div className="relative overflow-hidden rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 shadow-lg p-6 mb-8 group transition-all hover:shadow-xl hover:bg-white/50">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-purple-500/5 to-blue-500/10 pointer-events-none" />

                                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                            <Camera className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg leading-tight">Escanear Ficha Manual</h3>
                                            <p className="text-sm text-slate-500">Use a IA para preencher os dados automaticamente</p>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-auto">
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
                                        <Button
                                            type="button"
                                            onClick={() => ocrInputRef.current?.click()}
                                            disabled={processingOcr}
                                            className="w-full md:w-auto h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {processingOcr ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                    <span>Processando...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <Camera className="h-4 w-4" />
                                                    <span>Escanear Ficha Manual</span>
                                                </div>
                                            )}
                                        </Button>
                                    </div>
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
                                            if (formData.logradouro) {
                                                // Se já tem logradouro preenchido, permite edição direta
                                                setFormData({ ...formData, logradouro: value })
                                            } else {
                                                // Se não tem, ativa autocomplete
                                                handleAddressSearch(value)
                                            }
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
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nome ou telefone..."
                    className="pl-10 h-14 text-lg shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-10">Carregando clientes...</div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    Nenhum cliente encontrado.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredClients.map((client) => (
                        <div key={client.id} className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
                            <div className="flex items-start gap-4">
                                <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 border border-border">
                                    {client.avatar_url ? (
                                        <img src={client.avatar_url} alt={client.nome_razao} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-primary/10">
                                            <UserIcon className="h-6 w-6 text-primary" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg truncate">{client.nome_razao}</h3>
                                    {client.whatsapp && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                            <Phone className="h-3 w-3" /> {client.whatsapp}
                                        </p>
                                    )}
                                    {client.endereco && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate">
                                            <MapPin className="h-3 w-3" /> {client.endereco}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {client.whatsapp && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 md:h-12 md:w-12 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                            onClick={() => window.open(`tel:${client.whatsapp?.replace(/\D/g, '')}`, '_self')}
                                            title="Ligar"
                                        >
                                            <Phone className="h-4 w-4 md:h-5 md:w-5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 md:h-12 md:w-12 rounded-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                            onClick={() => window.open(`https://wa.me/55${client.whatsapp?.replace(/\D/g, '')}`, '_blank')}
                                            title="WhatsApp"
                                        >
                                            <svg viewBox="0 0 24 24" className="h-4 w-4 md:h-5 md:w-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                        </Button>
                                    </>
                                )}
                                {client.endereco && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 md:h-12 md:w-12 rounded-full border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${client.endereco} - ${client.cidade || ''} ${client.uf || ''}`)}`, '_blank')}
                                        title="Navegar"
                                    >
                                        <MapPin className="h-4 w-4 md:h-5 md:w-5" />
                                    </Button>
                                )}
                            </div>

                            <div className="mt-4 flex items-center gap-3 pt-4 border-t border-border">
                                <Button variant="outline" className="flex-1 h-12 text-base font-medium" onClick={() => handleEdit(client)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                </Button>
                                <Button variant="destructive" className="flex-1 h-12 text-base font-medium" onClick={() => handleDelete(client.id, client.nome_razao)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

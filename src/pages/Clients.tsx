import { useState, useEffect, useCallback, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Phone, Mail, User as UserIcon, MapPin, FileText } from 'lucide-react'
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
                                                <span className="ml-1 hidden sm:inline">Buscar</span>
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
                                            className="h-12 text-lg bg-muted/50"
                                            placeholder="Preenchido automaticamente"
                                            value={formData.bairro}
                                            onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                                            readOnly
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cidade">Cidade/UF</Label>
                                        <Input
                                            id="cidade"
                                            className="h-12 text-lg bg-muted/50"
                                            placeholder="Preenchido automaticamente"
                                            value={formData.cidade ? `${formData.cidade}/${formData.uf}` : ''}
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="complemento">Complemento</Label>
                                    <Input
                                        id="complemento"
                                        className="h-12 text-lg"
                                        placeholder="Apto, Bloco, Casa, etc."
                                        value={formData.complemento}
                                        onChange={e => setFormData({ ...formData, complemento: e.target.value })}
                                    />
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

                            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-border">
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

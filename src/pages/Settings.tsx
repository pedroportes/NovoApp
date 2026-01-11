import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Building2, Save, Upload, Loader2, Palette, Download, Smartphone, Pencil, Car, PenTool } from 'lucide-react'
import { compressImage } from '@/lib/utils'
import { useOutletContext } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { SignaturePad } from '@/components/SignaturePad'

export function Settings() {
    const { userData } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    // Role Check
    const isTecnico = userData?.cargo?.toLowerCase() === 'tecnico' || userData?.cargo?.toLowerCase() === 'técnico'

    // PWA Install hook
    const { isInstallable, isInstalled, isLocalhost, install } = usePWAInstall()

    // Technician Profile States
    const [techFormData, setTechFormData] = useState({
        nome_completo: '',
        telefone: '',
        password: '',
        placa: '',
        email: ''
    })
    const [techAvatar, setTechAvatar] = useState<string | null>(null)
    const [techAvatarFile, setTechAvatarFile] = useState<File | null>(null)
    const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null)
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
    const [companySignatureBlob, setCompanySignatureBlob] = useState<Blob | null>(null)
    const [companySignaturePreview, setCompanySignaturePreview] = useState<string | null>(null)

    // Admin Config States
    const [configs, setConfigs] = useState({
        view_all_clients: true,
        can_create_client: true,
        can_import_clients: true,
        can_delete_clients: true,
        can_edit_clients: true
    })

    const [formData, setFormData] = useState({
        nome: '',
        razao_social: '',
        cnpj: '',
        telefone: '',
        email_contato: '',
        site: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: ''
    })

    const { setFabAction } = useOutletContext<{ setFabAction: (action: (() => void) | null) => void }>() ?? { setFabAction: () => { } }

    // --- Effects & Loaders ---

    // Load Tech Data
    const fetchTechData = useCallback(async () => {
        if (!userData?.id) return

        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', userData.id)
                .single()

            if (data) {
                setTechFormData({
                    nome_completo: data.nome_completo || '',
                    telefone: data.telefone || '',
                    password: '',
                    placa: data.placa_carro || '',
                    email: data.email || '' // Ensure email is loaded
                })
                setTechAvatar(data.avatar || null)
                setSignatureUrl(data.signature_url || null)
            }
        } catch (error) {
            console.error('Erro ao buscar dados do técnico:', error)
        } finally {
            setLoading(false)
        }
    }, [userData?.id])

    useEffect(() => {
        if (isTecnico && userData) {
            fetchTechData()
        }
    }, [isTecnico, userData, fetchTechData])

    // Load Admin Data
    const fetchCompanyData = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('empresas')
                .select('*')
                .eq('id', userData?.empresa_id ?? '')
                .single()

            if (error) {
                if (error.code !== 'PGRST116') { // Ignore 'JSON object not returned' if simply not found
                    throw error
                }
                return
            }

            if (data) {
                const company = data as any
                if (company.configs) {
                    setConfigs(prev => ({ ...prev, ...company.configs }))
                }

                setFormData({
                    nome: company.nome || '',
                    razao_social: company.razao_social || '',
                    cnpj: company.cnpj || '',
                    telefone: company.telefone || '',
                    email_contato: company.email_contato || '',
                    site: company.site || '',
                    cep: company.cep || '',
                    endereco: company.endereco || '',
                    numero: company.numero || '',
                    complemento: company.complemento || '',
                    bairro: company.bairro || '',
                    cidade: company.cidade || '',
                    estado: company.estado || ''
                })
                if (company.logo_url) {
                    setLogoPreview(company.logo_url)
                }
                if (company.assinatura_url) {
                    setCompanySignaturePreview(company.assinatura_url)
                }
            }
        } catch (error) {
            console.error('Erro ao buscar dados:', error)
        } finally {
            setLoading(false)
        }
    }, [userData])

    useEffect(() => {
        if (userData?.empresa_id && !isTecnico) {
            fetchCompanyData()
        } else if (!isTecnico) {
            setLoading(false) // Fallback if no company ID for some reason but not tech
        }
    }, [userData?.empresa_id, isTecnico, fetchCompanyData])


    // --- Handlers ---

    // Admin Submit
    const handleSubmit = useCallback(async () => {
        setSaving(true)
        try {
            let logoUrl = logoPreview

            if (logoFile) {
                const compressedFile = await compressImage(logoFile, 500, 0.8)
                const fileExt = logoFile.name.split('.').pop()
                const fileName = `company_logo_${userData!.empresa_id}_${Date.now()}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, compressedFile)

                if (uploadError) throw uploadError

                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName)

                logoUrl = urlData.publicUrl
            }

            let signatureUrlToSave = companySignaturePreview

            if (companySignatureBlob) {
                // Upload Blob directly
                const fileName = `company_signature_${userData!.empresa_id}_${Date.now()}.png`

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, companySignatureBlob, {
                        contentType: 'image/png'
                    })

                if (uploadError) throw uploadError

                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName)

                signatureUrlToSave = urlData.publicUrl
            }

            const { error } = await (supabase
                .from('empresas') as any)
                .update({
                    ...formData,
                    configs: configs,
                    logo_url: logoUrl,
                    assinatura_url: signatureUrlToSave
                })
                .eq('id', userData!.empresa_id)

            if (error) throw error

            alert('Configurações salvas com sucesso!')
        } catch (error: any) {
            console.error('Erro ao salvar:', error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }, [formData, configs, logoFile, logoPreview, userData, companySignatureBlob, companySignaturePreview])

    // Technician Submit
    const handleTechSubmit = useCallback(async () => {
        setSaving(true)
        try {
            let avatarUrl = techAvatar
            let finalSignatureUrl = signatureUrl

            // 1. Upload Avatar
            if (techAvatarFile) {
                const compressedFile = await compressImage(techAvatarFile, 400, 0.8)
                const fileExt = techAvatarFile.name.split('.').pop()
                const fileName = `tech_avatar_${userData?.id}_${Date.now()}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, compressedFile, { upsert: true })

                if (uploadError) throw uploadError

                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName)

                avatarUrl = urlData.publicUrl
            }

            // 2. Upload Signature
            if (signatureBlob) {
                const fileName = `signatures/sig_${userData?.id}_${Date.now()}.png`
                const { error: uploadError } = await supabase.storage
                    .from('avatars') // Reusing avatars bucket, but storing in signatures folder
                    .upload(fileName, signatureBlob, { upsert: true, contentType: 'image/png' })

                if (uploadError) throw uploadError

                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName)

                finalSignatureUrl = urlData.publicUrl
            }

            // 3. Update User Record
            const { error } = await supabase
                .from('usuarios')
                .update({
                    nome_completo: techFormData.nome_completo,
                    telefone: techFormData.telefone,
                    avatar: avatarUrl, // Was avatar_url
                    placa_carro: techFormData.placa, // Was placa, but maps to placa_carro
                    signature_url: finalSignatureUrl // Was assinatura_url
                })
                .eq('id', userData!.id)

            if (error) throw error

            // 4. Update Password if provided
            if (techFormData.password) {
                const { error: pwdError } = await supabase.auth.updateUser({ password: techFormData.password })
                if (pwdError) throw pwdError
            }

            alert('Perfil atualizado com sucesso!')
            window.location.reload()

        } catch (error: any) {
            console.error(error)
            alert('Erro ao atualizar perfil: ' + error.message)
        } finally {
            setSaving(false)
        }
    }, [techFormData, techAvatar, techAvatarFile, signatureUrl, userData, signatureBlob])

    // Set FAB Action
    useEffect(() => {
        const handler = isTecnico ? handleTechSubmit : handleSubmit
        setFabAction(handler)
        return () => setFabAction(null)
    }, [handleSubmit, handleTechSubmit, setFabAction, isTecnico])


    // Admin Helper Handlers
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setLogoFile(file)
            setLogoPreview(URL.createObjectURL(file))
        }
    }

    const handleCepBlur = async () => {
        const cep = formData.cep.replace(/\D/g, '')
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
                const data = await response.json()
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        endereco: data.logradouro,
                        bairro: data.bairro,
                        cidade: data.localidade,
                        estado: data.uf
                    }))
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error)
            }
        }
    }


    if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando configurações...</div>

    return (
        <div className="space-y-6 pb-32 md:pb-0 mt-6 md:mt-0">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isTecnico ? 'Meu Perfil' : 'Configurações da Empresa'}</h1>
                    <p className="text-muted-foreground">{isTecnico ? 'Gerencie seus dados pessoais' : 'Gerencie os dados da sua desentupidora'}</p>
                </div>
                <Button onClick={isTecnico ? handleTechSubmit : handleSubmit} disabled={saving} className="hidden md:flex shadow-lg hover:shadow-xl transition-all">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isTecnico ? (
                    // TELA DE TÉCNICO
                    <div className="space-y-6 md:col-span-2 lg:col-span-2">
                        <div className="bg-card p-4 rounded-2xl border border-border/50 shadow-sm space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Smartphone className="h-5 w-5" />
                                </div>
                                Dados Pessoais
                            </h2>

                            <div className="flex flex-col items-center gap-4 py-2">
                                <div className="relative group cursor-pointer">
                                    <div className="w-24 h-24 rounded-full border-4 border-background shadow-xl flex items-center justify-center overflow-hidden bg-muted">
                                        {techAvatar ? (
                                            <img src={techAvatar} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        ) : (
                                            <span className="text-muted-foreground text-2xl font-bold opacity-30">
                                                {techFormData.nome_completo?.[0] || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <label htmlFor="tech-avatar" className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-colors">
                                        <Pencil className="h-3 w-3" />
                                        <input
                                            id="tech-avatar"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    setTechAvatarFile(e.target.files[0])
                                                    setTechAvatar(URL.createObjectURL(e.target.files[0]))
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground">Toque para alterar a foto</p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Nome Completo</Label>
                                    <Input
                                        value={techFormData.nome_completo}
                                        onChange={e => setTechFormData({ ...techFormData, nome_completo: e.target.value })}
                                        className="h-10 bg-muted/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Celular / WhatsApp</Label>
                                    <Input
                                        value={techFormData.telefone}
                                        onChange={e => setTechFormData({ ...techFormData, telefone: e.target.value })}
                                        className="h-10 bg-muted/50"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Car className="w-4 h-4" />
                                        Placa do Veículo (Opcional)
                                    </Label>
                                    <Input
                                        value={techFormData.placa}
                                        onChange={e => setTechFormData({ ...techFormData, placa: e.target.value.toUpperCase() })}
                                        className="h-10 bg-muted/50"
                                        placeholder="ABC-1234"
                                        maxLength={8}
                                        autoComplete="off"
                                        name="placa_veiculo_field" // Unique name to prevent autofill
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>E-mail de Acesso</Label>
                                    <Input
                                        value={userData?.email || ''} // Use userData or form data
                                        className="h-10 bg-muted/50"
                                        readOnly
                                        disabled
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nova Senha (Opcional)</Label>
                                    <Input
                                        type="password"
                                        value={techFormData.password}
                                        onChange={e => setTechFormData({ ...techFormData, password: e.target.value })}
                                        className="h-10 bg-muted/50"
                                        placeholder="Digite para alterar"
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-2 pt-2">
                                    <Label className="flex items-center gap-2">
                                        <PenTool className="w-4 h-4" />
                                        Sua Assinatura
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Use o espaço abaixo para desenhar sua assinatura. Ela será usada em ordens de serviço.
                                    </p>
                                    <SignaturePad
                                        onSave={setSignatureBlob}
                                        initialUrl={signatureUrl}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // TELA DE ADMIN (Mantida Original)
                    <>
                        {/* Logo e Dados Básicos */}
                        <div className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                Identidade Visual
                            </h2>

                            <div className="flex flex-col items-center gap-4">
                                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/10 relative group">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-muted-foreground text-sm text-center px-2">Sem Logo</span>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Upload className="text-white h-8 w-8" />
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Clique para alterar o logo</p>
                            </div>

                            {/* Assinatura da Empresa */}
                            <div className="flex flex-col items-center gap-4 border-t pt-4 w-full">
                                <Label className="text-lg font-semibold">Assinatura Digital da Empresa</Label>
                                <div className="w-full max-w-lg">
                                    <SignaturePad
                                        onSave={setCompanySignatureBlob}
                                        initialUrl={companySignaturePreview}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground text-center">
                                    Assine na caixa acima. Para salvar, clique em "Travar Assinatura" <br />
                                    e depois no botão "Salvar Alterações" no final da página.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nome Fantasia</Label>
                                    <Input
                                        value={formData.nome}
                                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                        placeholder="Nome da sua empresa"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Razão Social</Label>
                                    <Input
                                        value={formData.razao_social}
                                        onChange={e => setFormData({ ...formData, razao_social: e.target.value })}
                                        placeholder="Razão Social Ltda"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>CNPJ</Label>
                                        <Input
                                            value={formData.cnpj}
                                            onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                            placeholder="00.000.000/0001-00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Telefone / WhatsApp</Label>
                                        <Input
                                            value={formData.telefone}
                                            onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>E-mail de Contato</Label>
                                    <Input
                                        value={formData.email_contato}
                                        onChange={e => setFormData({ ...formData, email_contato: e.target.value })}
                                        placeholder="contato@empresa.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Site / Redes Sociais</Label>
                                    <Input
                                        value={formData.site}
                                        onChange={e => setFormData({ ...formData, site: e.target.value })}
                                        placeholder="instagram.com/suaempresa"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Endereço */}
                        <div className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm h-fit">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                Endereço e Localização
                            </h2>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>CEP</Label>
                                    <Input
                                        value={formData.cep}
                                        onChange={e => setFormData({ ...formData, cep: e.target.value })}
                                        onBlur={handleCepBlur}
                                        placeholder="00000-000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Endereço</Label>
                                    <Input
                                        value={formData.endereco}
                                        onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                                        placeholder="Rua, Avenida..."
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2 col-span-1">
                                        <Label>Número</Label>
                                        <Input
                                            value={formData.numero}
                                            onChange={e => setFormData({ ...formData, numero: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Complemento</Label>
                                        <Input
                                            value={formData.complemento}
                                            onChange={e => setFormData({ ...formData, complemento: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Bairro</Label>
                                    <Input
                                        value={formData.bairro}
                                        onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Cidade</Label>
                                        <Input
                                            value={formData.cidade}
                                            onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Estado (UF)</Label>
                                        <Input
                                            value={formData.estado}
                                            onChange={e => setFormData({ ...formData, estado: e.target.value })}
                                            maxLength={2}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Technician Permissions Section */}
                        <div className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm h-fit md:col-span-2">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-primary" />
                                Permissões dos Técnicos (App)
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Defina o que os técnicos podem ver e fazer no aplicativo.
                            </p>

                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                                    <Label htmlFor="view-all" className="flex flex-col space-y-1">
                                        <span>Ver Todos os Clientes</span>
                                        <span className="font-normal text-xs text-muted-foreground">Se desligado, vê apenas os que ele cadastrou ou atendeu</span>
                                    </Label>
                                    <Switch
                                        id="view-all"
                                        checked={configs.view_all_clients}
                                        onCheckedChange={(c) => setConfigs(prev => ({ ...prev, view_all_clients: c }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                                    <Label htmlFor="create-client" className="flex flex-col space-y-1">
                                        <span>Cadastrar Clientes</span>
                                        <span className="font-normal text-xs text-muted-foreground">Botão "Novo Cliente"</span>
                                    </Label>
                                    <Switch
                                        id="create-client"
                                        checked={configs.can_create_client}
                                        onCheckedChange={(c) => setConfigs(prev => ({ ...prev, can_create_client: c }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                                    <Label htmlFor="import-csv" className="flex flex-col space-y-1">
                                        <span>Importar CSV</span>
                                        <span className="font-normal text-xs text-muted-foreground">Botão "Importar CSV"</span>
                                    </Label>
                                    <Switch
                                        id="import-csv"
                                        checked={configs.can_import_clients}
                                        onCheckedChange={(c) => setConfigs(prev => ({ ...prev, can_import_clients: c }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                                    <Label htmlFor="edit-client" className="flex flex-col space-y-1">
                                        <span>Editar Clientes</span>
                                        <span className="font-normal text-xs text-muted-foreground">Botão "Editar"</span>
                                    </Label>
                                    <Switch
                                        id="edit-client"
                                        checked={configs.can_edit_clients}
                                        onCheckedChange={(c) => setConfigs(prev => ({ ...prev, can_edit_clients: c }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                                    <Label htmlFor="delete-client" className="flex flex-col space-y-1">
                                        <span>Excluir Clientes</span>
                                        <span className="font-normal text-xs text-muted-foreground">Botão "Excluir"</span>
                                    </Label>
                                    <Switch
                                        id="delete-client"
                                        checked={configs.can_delete_clients}
                                        onCheckedChange={(c) => setConfigs(prev => ({ ...prev, can_delete_clients: c }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}


                {/* Appearance Section - VISIBLE TO BOTH */}
                < div className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm h-fit md:col-span-2 lg:col-span-1" >
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        Aparência
                    </h2>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Label>Tema do Sistema</Label>
                            <p className="text-sm text-muted-foreground mb-2">
                                Escolha a aparência que melhor se adapta ao seu estilo de trabalho.
                            </p>
                            <div className="w-full">
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                </div >

                {/* Install App Section - VISIBLE TO BOTH */}
                < div className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm h-fit md:col-span-2 lg:col-span-1" >
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-primary" />
                        Instalar App
                    </h2>
                    <div className="space-y-4">
                        {isInstalled ? (
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                <Smartphone className="h-5 w-5 text-emerald-600" />
                                <p className="font-medium text-emerald-800 dark:text-emerald-200">App Instalado!</p>
                            </div>
                        ) : (
                            <Button
                                onClick={() => {
                                    if (isInstallable) {
                                        install();
                                    } else {
                                        // Fallback: mostra instruções
                                        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                                        const message = isIOS
                                            ? 'No Safari, toque em Compartilhar ↑ e depois em "Adicionar à Tela de Início"'
                                            : 'No Chrome, toque no menu ⋮ e depois em "Adicionar à tela inicial"';
                                        alert(message);
                                    }
                                }}
                                className="w-full h-12 text-base bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                            >
                                <Download className="mr-2 h-5 w-5" />
                                Instalar
                            </Button>
                        )}
                    </div>
                </div >
            </div >

            <div className="md:hidden">
                <Button onClick={isTecnico ? handleTechSubmit : handleSubmit} disabled={saving} className="w-full h-12 text-lg mb-4">
                    {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Salvar Alterações
                </Button>
            </div>
        </div >
    )
}

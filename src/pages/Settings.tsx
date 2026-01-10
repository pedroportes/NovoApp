import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Building2, Save, Upload, Loader2, Palette, Download, Smartphone } from 'lucide-react'
import { compressImage } from '@/lib/utils'
import { useOutletContext } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export function Settings() {
    const { userData } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    // PWA Install hook
    const { isInstallable, isInstalled, isLocalhost, install } = usePWAInstall()

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

            const { error } = await (supabase
                .from('empresas') as any)
                .update({
                    ...formData,
                    configs: configs, // Save configs
                    logo_url: logoUrl
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
    }, [formData, logoFile, logoPreview, userData])

    useEffect(() => {
        // FAB Action for Settings is just Save
        setFabAction(handleSubmit)
        return () => setFabAction(null)
    }, [handleSubmit, setFabAction])

    useEffect(() => {
        if (userData?.empresa_id) {
            fetchCompanyData()
        }
    }, [userData?.empresa_id])

    const fetchCompanyData = async () => {
        try {
            const { data, error } = await supabase
                .from('empresas')
                .select('*')
                .eq('id', userData!.empresa_id)
                .single()

            if (error) throw error

            if (data) {
                const company = data as any
                // Load configs if they exist, otherwise keep defaults
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
            }
        } catch (error) {
            console.error('Erro ao buscar dados:', error)
        } finally {
            setLoading(false)
        }
    }

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


    if (loading) return <div className="p-8 text-center">Carregando...</div>

    return (
        <div className="space-y-6 pb-20 md:pb-0 mt-6 md:mt-0">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Configurações da Empresa</h1>
                    <p className="text-muted-foreground">Gerencie os dados da sua desentupidora</p>
                </div>
                <Button onClick={handleSubmit} disabled={saving} className="hidden md:flex">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
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
                                <span className="font-normal text-xs text-muted-foreground">Se desligado, vê apenas os que ele cadastrou</span>
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
                </div >

                {/* Appearance Section */}
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

                {/* Install App Section */}
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
                <Button onClick={handleSubmit} disabled={saving} className="w-full h-12 text-lg">
                    {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Salvar Alterações
                </Button>
            </div>
        </div >
    )
}

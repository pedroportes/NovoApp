import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Phone, Mail, User as UserIcon } from 'lucide-react'
import { compressImage } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
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

interface Technician {
    id: string
    nome_completo: string
    email: string
    telefone?: string
    percentual_comissao?: number
    salario_base?: number
    pix_key?: string
    avatar?: string
    signature_url?: string
    placa_carro?: string
}

export function Technicians() {
    const { userData } = useAuth()
    const [techs, setTechs] = useState<Technician[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Form States
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingTechId, setEditingTechId] = useState<string | null>(null)

    // Form Data
    const initialFormState = {
        name: '',
        email: '',
        password: '',
        phone: '',
        commission_rate: '0',
        base_salary: '0',
        pix_key: '',
        placa_carro: ''
    }
    const [formData, setFormData] = useState(initialFormState)

    // Upload States
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

    // Signature State (Blob from Canvas)
    const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null)
    const [currentSignatureUrl, setCurrentSignatureUrl] = useState<string | null>(null)

    useEffect(() => {
        if (userData?.empresa_id) {
            fetchTechs()
        }
    }, [userData?.empresa_id])

    const openNewTechDialog = useCallback(() => {
        setEditingTechId(null)
        resetForm()
        setIsDialogOpen(true)
    }, [])

    const { setFabAction } = useOutletContext<{ setFabAction: (action: (() => void) | null) => void }>() ?? { setFabAction: () => { } }

    useEffect(() => {
        setFabAction(openNewTechDialog)
        return () => setFabAction(null)
    }, [openNewTechDialog, setFabAction])

    useEffect(() => {
        if (isDialogOpen && !editingTechId) {
            resetForm()
        }
    }, [isDialogOpen, editingTechId])

    const resetForm = () => {
        setFormData(initialFormState)
        setAvatarFile(null)
        setAvatarPreview(null)
        setSignatureBlob(null)
        setCurrentSignatureUrl(null)
    }

    const fetchTechs = async () => {
        if (!userData?.empresa_id) return

        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('empresa_id', userData.empresa_id)
                .in('cargo', ['tecnico', 'admin'])

            if (error) throw error
            setTechs(data as Technician[])
        } catch (error) {
            console.error('Erro ao buscar técnicos:', error)
        } finally {
            setLoading(false)
        }
    }


    const handleEdit = (tech: Technician) => {
        setEditingTechId(tech.id)
        setFormData({
            name: tech.nome_completo || '',
            email: tech.email || '',
            password: '',
            phone: tech.telefone || '',
            commission_rate: tech.percentual_comissao?.toString() || '0',
            base_salary: tech.salario_base?.toString() || '0',
            pix_key: tech.pix_key || '',
            placa_carro: tech.placa_carro || ''
        })
        setAvatarPreview(tech.avatar || null)
        setCurrentSignatureUrl(tech.signature_url || null)
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o técnico ${name}?`)) return

        try {
            const { data, error } = await (supabase.rpc as any)('delete_technician', {
                target_user_id: id
            })

            if (error) throw error
            if (data && !data.success) throw new Error(data.error)

            alert('Técnico excluído com sucesso.')
            fetchTechs()
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message)
        }
    }

    // Helper de Upload
    const uploadFile = async (file: File | Blob, path: string) => {
        const fileExt = (file instanceof File ? file.name.split('.').pop() : 'png') || 'png'
        const fileName = `${path}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file)

        if (uploadError) {
            console.error(uploadError)
            if (uploadError) {
                console.error('Erro detalhado do upload:', uploadError)
                alert(`Erro no upload: ${uploadError.message}`)
                throw uploadError
            }
        }

        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        return data.publicUrl
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const commRate = parseFloat(formData.commission_rate) || 0
            const salary = parseFloat(formData.base_salary) || 0

            // Uploads
            let newAvatarUrl = avatarPreview
            let newSignatureUrl = currentSignatureUrl

            // 1. Upload Avatar
            if (avatarFile) {
                const compressedBlob = await compressImage(avatarFile)
                newAvatarUrl = await uploadFile(compressedBlob, `tech-avatar`)
            }

            // 2. Upload Signature (If changed)
            if (signatureBlob) {
                newSignatureUrl = await uploadFile(signatureBlob, `tech-sig`)
            }

            if (editingTechId) {
                // UPDATE EXISTENTE
                const { error: updateError } = await supabase
                    .from('usuarios')
                    .update({
                        nome_completo: formData.name,
                        telefone: formData.phone,
                        percentual_comissao: commRate,
                        salario_base: salary,
                        pix_key: formData.pix_key,
                        avatar: newAvatarUrl,
                        signature_url: newSignatureUrl,
                        placa_carro: formData.placa_carro
                    })
                    .eq('id', editingTechId)

                if (updateError) throw updateError

                // Atualizar senha se fornecida
                if (formData.password) {
                    const { error: pwdError } = await supabase.auth.admin.updateUserById(
                        editingTechId,
                        { password: formData.password }
                    )
                    if (pwdError) console.warn('Erro ao atualizar senha:', pwdError)
                }

                alert('Técnico atualizado!')
            } else {
                // CRIAR NOVO - Usar signup simples
                const { data: signupData, error: signupError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.name
                        }
                    }
                })

                if (signupError) throw signupError
                if (!signupData.user) throw new Error('Erro ao criar usuário')

                // Aguardar trigger criar perfil base
                await new Promise(resolve => setTimeout(resolve, 1000))

                // Atualizar perfil com dados completos
                const { error: profileError } = await supabase
                    .from('usuarios')
                    .update({
                        empresa_id: userData!.empresa_id,
                        cargo: 'tecnico',
                        nome_completo: formData.name,
                        telefone: formData.phone,
                        percentual_comissao: commRate,
                        salario_base: salary,
                        pix_key: formData.pix_key,
                        avatar: newAvatarUrl,
                        signature_url: newSignatureUrl,
                        placa_carro: formData.placa_carro,
                        status: true
                    })
                    .eq('id', signupData.user.id)

                if (profileError) throw profileError

                alert('Técnico criado com sucesso!')
            }

            setIsDialogOpen(false)
            fetchTechs()

        } catch (error: any) {
            alert('Erro: ' + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const filteredTechs = techs.filter(tech =>
        tech.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tech.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex justify-end mb-4">

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    {userData?.cargo?.toLowerCase() === 'admin' && (
                        <DialogTrigger asChild>
                            <Button className="hidden md:flex h-14 text-base md:w-auto w-full shadow-lg" onClick={openNewTechDialog}>
                                <Plus className="mr-2 h-5 w-5" />
                                Novo Técnico
                            </Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="w-[95%] max-w-[600px] h-[90vh] overflow-y-auto rounded-xl">
                        <DialogHeader>
                            <DialogTitle>{editingTechId ? 'Editar Técnico' : 'Novo Técnico'}</DialogTitle>
                            <DialogDescription>
                                Preencha os dados e assine na tela.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6 py-4" autoComplete="off">
                            <input autoComplete="false" name="hidden" type="text" style={{ display: 'none' }} />

                            {/* FOTO (Avatar) - Mantido input file escondido */}
                            <div className="flex flex-col items-center gap-4 mb-4">
                                <div className="relative">
                                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                                        ) : (
                                            <UserIcon className="h-10 w-10 text-muted-foreground opacity-50" />
                                        )}
                                    </div>
                                    <Label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer shadow-md hover:bg-primary/90">
                                        <Pencil className="h-4 w-4" />
                                        <Input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    setAvatarFile(file)
                                                    setAvatarPreview(URL.createObjectURL(file))
                                                }
                                            }}
                                        />
                                    </Label>
                                </div>
                                <p className="text-sm text-muted-foreground">Foto de Perfil</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input
                                        id="name"
                                        required
                                        className="h-12 text-lg"
                                        placeholder="Ex: João da Silva"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Celular (WhatsApp)</Label>
                                    <Input
                                        id="phone"
                                        className="h-12 text-lg"
                                        placeholder="(11) 99999-9999"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="placa">Placa do Carro (Opcional)</Label>
                                <Input
                                    id="placa"
                                    className="h-12 text-lg"
                                    value={formData.placa_carro}
                                    onChange={(e) => setFormData({ ...formData, placa_carro: e.target.value })}
                                    placeholder="ABC-1234"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail de Acesso</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required={!editingTechId}
                                        disabled={!!editingTechId}
                                        className="h-12"
                                        placeholder="joao@empresa.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">{editingTechId ? 'Nova Senha (Opcional)' : 'Senha Inicial'}</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        required={!editingTechId}
                                        className="h-12"
                                        placeholder={editingTechId ? "Em branco para manter" : "Min. 6 caracteres"}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-medium mb-3 text-muted-foreground">Dados Financeiros</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="salary">Salário Base (R$)</Label>
                                        <Input
                                            id="salary"
                                            type="number"
                                            step="0.01"
                                            className="h-12"
                                            value={formData.base_salary}
                                            onChange={e => setFormData({ ...formData, base_salary: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="commission">Comissão (%)</Label>
                                        <Input
                                            id="commission"
                                            type="number"
                                            step="0.1"
                                            className="h-12"
                                            value={formData.commission_rate}
                                            onChange={e => setFormData({ ...formData, commission_rate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pix">Chave PIX</Label>
                                        <Input
                                            id="pix"
                                            className="h-12"
                                            value={formData.pix_key}
                                            onChange={e => setFormData({ ...formData, pix_key: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ASSINATURA NA TELA */}
                            <div className="space-y-2 pt-2">
                                <Label className="text-base font-semibold">Assinatura Digital (Desenhe na tela)</Label>
                                <p className="text-xs text-muted-foreground mb-2">Use o dedo ou mouse para assinar abaixo.</p>

                                <SignaturePad
                                    onSignatureChange={setSignatureBlob}
                                    initialImage={currentSignatureUrl}
                                />
                            </div>

                            <Button type="submit" className="w-full h-14 text-lg font-semibold mt-4 shadow-md" disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : (editingTechId ? 'Atualizar Técnico' : 'Cadastrar Técnico')}
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
                <div className="text-center py-10">Carregando equipe...</div>
            ) : filteredTechs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    Nenhum técnico encontrado. Cadastre o primeiro!
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTechs.map((tech) => (
                        <div key={tech.id} className="group relative flex flex-col justify-between rounded-[24px] bg-white/80 backdrop-blur-md border border-white/20 p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded-full bg-gray-50 flex-shrink-0 border border-gray-100 flex items-center justify-center overflow-hidden">
                                        {tech.avatar ? (
                                            <img src={tech.avatar} alt={tech.nome_completo} className="h-full w-full object-cover" />
                                        ) : (
                                            <UserIcon className="h-8 w-8 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg truncate text-gray-900">{tech.nome_completo || 'Sem Nome'}</h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                                            <Mail className="h-3 w-3" /> {tech.email}
                                        </p>
                                        {tech.telefone && (
                                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 truncate">
                                                <Phone className="h-3 w-3" /> {tech.telefone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Mostra se tem assinatura cadastrada */}
                            {tech.signature_url && (
                                <div className="mt-4 p-2 bg-gray-50/50 rounded-lg border border-dashed border-gray-200 flex flex-col items-center">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Assinatura Digital</p>
                                    <img src={tech.signature_url} className="h-8 object-contain opacity-60" alt="Assinatura" />
                                </div>
                            )}

                            {userData?.cargo === 'admin' && (
                                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-gray-100">
                                    <Button variant="outline" className="flex-1 h-10 text-sm font-medium rounded-xl border-gray-200 hover:bg-gray-50 hover:text-primary transition-colors" onClick={() => handleEdit(tech)}>
                                        <Pencil className="mr-2 h-3 w-3" />
                                        Editar
                                    </Button>
                                    <Button variant="destructive" className="flex-1 h-10 text-sm font-medium rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-100 shadow-none transition-colors" onClick={() => handleDelete(tech.id, tech.nome_completo)}>
                                        <Trash2 className="mr-2 h-3 w-3" />
                                        Excluir
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

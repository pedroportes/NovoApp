import { useState, useEffect } from 'react'
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
    nome: string
    email: string
    telefone?: string
    commission_rate?: number
    base_salary?: number
    pix_key?: string
    avatar?: string
    signature_url?: string
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
        pix_key: ''
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

    const { setFabAction } = useOutletContext<{ setFabAction: (action: (() => void) | null) => void }>()

    useEffect(() => {
        setFabAction(() => openNewTechDialog)
    }, [])

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
                .eq('cargo', 'tecnico')

            if (error) throw error
            setTechs(data as Technician[])
        } catch (error) {
            console.error('Erro ao buscar técnicos:', error)
        } finally {
            setLoading(false)
        }
    }

    const openNewTechDialog = () => {
        setEditingTechId(null)
        resetForm()
        setIsDialogOpen(true)
    }

    const handleEdit = (tech: Technician) => {
        setEditingTechId(tech.id)
        setFormData({
            name: tech.nome || '',
            email: tech.email || '',
            password: '',
            phone: tech.telefone || '',
            commission_rate: tech.commission_rate?.toString() || '0',
            base_salary: tech.base_salary?.toString() || '0',
            pix_key: tech.pix_key || ''
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

            let response: { data: any; error: any };

            if (editingTechId) {
                // UPDATE
                response = await (supabase.rpc as any)('update_technician', {
                    target_user_id: editingTechId,
                    new_name: formData.name,
                    new_phone: formData.phone,
                    new_commission_rate: commRate,
                    new_base_salary: salary,
                    new_pix_key: formData.pix_key,
                    new_password: formData.password,
                    new_avatar_url: newAvatarUrl,
                    new_signature_url: newSignatureUrl
                })
            } else {
                // CREATE
                response = await (supabase.rpc as any)('create_technician_user', {
                    new_email: formData.email,
                    new_password: formData.password,
                    new_name: formData.name,
                    new_phone: formData.phone,
                    new_commission_rate: commRate,
                    new_base_salary: salary,
                    new_pix_key: formData.pix_key,
                    new_avatar_url: newAvatarUrl,
                    new_signature_url: newSignatureUrl
                })
            }

            const { data, error } = response

            if (error) throw error
            if (data && !data.success) throw new Error(data.error)

            alert(editingTechId ? 'Técnico atualizado!' : 'Técnico criado com sucesso!')
            setIsDialogOpen(false)
            fetchTechs()

        } catch (error: any) {
            alert('Erro: ' + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const filteredTechs = techs.filter(tech =>
        tech.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tech.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex justify-end mb-4">

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="hidden md:flex h-14 text-base md:w-auto w-full shadow-lg" onClick={openNewTechDialog}>
                            <Plus className="mr-2 h-5 w-5" />
                            Novo Técnico
                        </Button>
                    </DialogTrigger>
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
                    placeholder="Buscar por nome ou e-mail..."
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTechs.map((tech) => (
                        <div key={tech.id} className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded-full bg-muted overflow-hidden flex-shrink-0 border border-border">
                                        {tech.avatar ? (
                                            <img src={tech.avatar} alt={tech.nome} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-primary/10">
                                                <UserIcon className="h-8 w-8 text-primary" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-xl truncate">{tech.nome || 'Sem Nome'}</h3>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                                            <Mail className="h-3 w-3" /> {tech.email}
                                        </p>
                                        {tech.telefone && (
                                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate">
                                                <Phone className="h-3 w-3" /> {tech.telefone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Mostra se tem assinatura cadastrada */}
                            {tech.signature_url && (
                                <div className="mt-2 p-2 bg-muted/20 rounded border border-dashed border-border flex flex-col items-center">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Assinatura Cadastrada</p>
                                    <img src={tech.signature_url} className="h-8 object-contain opacity-70" alt="Assinatura" />
                                </div>
                            )}

                            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-border">
                                <Button variant="outline" className="flex-1 h-12 text-base font-medium" onClick={() => handleEdit(tech)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                </Button>
                                <Button variant="destructive" className="flex-1 h-12 text-base font-medium" onClick={() => handleDelete(tech.id, tech.nome)}>
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

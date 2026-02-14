import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    ArrowLeft, Building2, Users, FileText, DollarSign,
    Trash2, KeyRound, Save, Pencil, X, UserX, UserCheck,
    AlertTriangle, Shield, Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface CompanyInfo {
    id: string
    nome: string
    cnpj: string | null
    telefone: string | null
    email: string | null
    endereco: string | null
    created_at: string
    plano: string | null
    status_assinatura: string | null
}

interface UserInfo {
    id: string
    nome_completo: string | null
    email: string | null
    cargo: string | null
    status: boolean | null
    created_at: string
}

export function CompanyDetails() {
    const { empresaId } = useParams<{ empresaId: string }>()
    const navigate = useNavigate()

    const [company, setCompany] = useState<CompanyInfo | null>(null)
    const [users, setUsers] = useState<UserInfo[]>([])
    const [stats, setStats] = useState({ ordens: 0, clientes: 0, receita: 0 })
    const [loading, setLoading] = useState(true)

    // Edit state
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({ nome: '', cnpj: '', telefone: '', email: '', endereco: '' })

    // Delete state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmName, setDeleteConfirmName] = useState('')
    const [deleting, setDeleting] = useState(false)

    // Password reset state  
    const [resetUserId, setResetUserId] = useState<string | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [resettingPassword, setResettingPassword] = useState(false)

    const loadCompanyData = useCallback(async (id: string) => {
        setLoading(true)

        const [companyRes, usersRes, ordensRes, clientesRes, financeiroRes] = await Promise.all([
            supabase.from('empresas').select('*').eq('id', id).single(),
            supabase.from('usuarios').select('id, nome_completo, email, cargo, status, created_at').eq('empresa_id', id),
            supabase.from('ordens_servico').select('*', { count: 'exact', head: true }).eq('empresa_id', id),
            supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('empresa_id', id),
            supabase.from('financeiro_fluxo').select('valor').eq('empresa_id', id).eq('tipo', 'receita')
        ])

        if (companyRes.data) {
            const emp = companyRes.data as any
            const info: CompanyInfo = {
                id: emp.id,
                nome: emp.nome || 'Sem nome',
                cnpj: emp.cnpj,
                telefone: emp.telefone,
                email: emp.email || emp.email_contato,
                endereco: emp.endereco,
                created_at: emp.created_at || new Date().toISOString(),
                plano: emp.subscription_price_id,
                status_assinatura: emp.subscription_status
            }
            setCompany(info)
            setEditForm({
                nome: info.nome,
                cnpj: info.cnpj || '',
                telefone: info.telefone || '',
                email: info.email || '',
                endereco: info.endereco || ''
            })
        }

        if (usersRes.data) setUsers(usersRes.data as UserInfo[])

        const totalReceita = financeiroRes.data
            ? financeiroRes.data.reduce((sum, f) => sum + (Number(f.valor) || 0), 0)
            : 0

        setStats({
            ordens: ordensRes.count || 0,
            clientes: clientesRes.count || 0,
            receita: totalReceita
        })

        setLoading(false)
    }, [])

    useEffect(() => {
        if (empresaId) loadCompanyData(empresaId)
    }, [empresaId, loadCompanyData])

    // =============== SAVE EDIT ===============
    async function handleSaveEdit() {
        if (!empresaId) return
        const { error } = await supabase
            .from('empresas')
            .update({
                nome: editForm.nome,
                cnpj: editForm.cnpj || null,
                telefone: editForm.telefone || null,
                email: editForm.email || null,
                endereco: editForm.endereco || null
            })
            .eq('id', empresaId)

        if (error) {
            toast.error('Erro ao salvar: ' + error.message)
            return
        }

        toast.success('Empresa atualizada')
        setIsEditing(false)
        loadCompanyData(empresaId)
    }

    // =============== DELETE COMPANY ===============
    async function handleDeleteCompany() {
        if (!empresaId || !company) return
        if (deleteConfirmName.trim().toLowerCase() !== company.nome.trim().toLowerCase()) {
            toast.error('Nome não confere. Digite exatamente o nome da empresa.')
            return
        }

        setDeleting(true)
        try {
            const { data, error } = await (supabase.rpc as any)('sa_delete_company', {
                target_empresa_id: empresaId
            })

            if (error) {
                toast.error('Erro ao excluir: ' + error.message)
                setDeleting(false)
                return
            }

            const result = data as Record<string, number | boolean | string>
            const totalDeleted = Object.entries(result)
                .filter(([k]) => !['success', 'empresa_nome', 'empresa_id'].includes(k))
                .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0)

            toast.success(`Empresa "${company.nome}" excluída. ${totalDeleted} registros removidos.`)
            navigate('/super-admin')
        } catch (err: any) {
            toast.error('Erro: ' + (err.message || 'Desconhecido'))
        } finally {
            setDeleting(false)
        }
    }

    // =============== RESET PASSWORD ===============
    async function handleResetPassword() {
        if (!resetUserId || !newPassword) return
        if (newPassword.length < 6) {
            toast.error('Senha deve ter pelo menos 6 caracteres')
            return
        }

        setResettingPassword(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sa-admin-actions`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify({
                        action: 'reset-password',
                        user_id: resetUserId,
                        new_password: newPassword
                    })
                }
            )

            const result = await response.json()
            if (!response.ok || result.error) {
                toast.error(result.error || 'Erro ao resetar senha')
            } else {
                toast.success('Senha alterada com sucesso!')
                setResetUserId(null)
                setNewPassword('')
            }
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
        } finally {
            setResettingPassword(false)
        }
    }

    // =============== TOGGLE USER STATUS ===============
    async function handleToggleUserStatus(userId: string, currentStatus: boolean | null) {
        const newStatus = !(currentStatus ?? true)
        const { error } = await supabase
            .from('usuarios')
            .update({ status: newStatus })
            .eq('id', userId)

        if (error) {
            toast.error('Erro ao alterar status: ' + error.message)
            return
        }

        toast.success(newStatus ? 'Usuário ativado' : 'Usuário desativado')
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
    }

    // =============== TOGGLE CARGO ===============
    async function handleToggleCargo(userId: string, currentCargo: string | null) {
        const newCargo = currentCargo === 'admin' ? 'tecnico' : 'admin'
        const { error } = await supabase
            .from('usuarios')
            .update({ cargo: newCargo })
            .eq('id', userId)

        if (error) {
            toast.error('Erro ao alterar cargo: ' + error.message)
            return
        }

        toast.success(`Cargo alterado para ${newCargo}`)
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, cargo: newCargo } : u))
    }

    // =============== REMOVE USER ===============
    async function handleRemoveUser(userId: string, userName: string | null) {
        if (!confirm(`Tem certeza que deseja remover "${userName || 'usuário'}" desta empresa? Isso irá desvinculá-lo.`)) return

        const { error } = await supabase
            .from('usuarios')
            .update({ empresa_id: null, status: false })
            .eq('id', userId)

        if (error) {
            toast.error('Erro: ' + error.message)
            return
        }

        toast.success('Usuário removido da empresa')
        setUsers(prev => prev.filter(u => u.id !== userId))
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
        )
    }

    if (!company) {
        return <p className="text-center text-muted-foreground py-8">Empresa não encontrada</p>
    }

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{company.nome}</h1>
                    <p className="text-sm text-muted-foreground">
                        {company.cnpj || 'Sem CNPJ'} · Criada em {new Date(company.created_at).toLocaleDateString('pt-BR')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {company.status_assinatura === 'active' ? (
                        <Badge className="bg-emerald-500">Ativa</Badge>
                    ) : (
                        <Badge variant="secondary">{company.status_assinatura || 'Sem plano'}</Badge>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (isEditing) {
                                setIsEditing(false)
                                if (company) {
                                    setEditForm({
                                        nome: company.nome,
                                        cnpj: company.cnpj || '',
                                        telefone: company.telefone || '',
                                        email: company.email || '',
                                        endereco: company.endereco || ''
                                    })
                                }
                            } else {
                                setIsEditing(true)
                            }
                        }}
                    >
                        {isEditing ? <X className="h-4 w-4 mr-1" /> : <Pencil className="h-4 w-4 mr-1" />}
                        {isEditing ? 'Cancelar' : 'Editar'}
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteModal(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                    </Button>
                </div>
            </div>

            {/* STATS CARDS */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Usuários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{users.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{stats.clientes}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Ordens de Serviço</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{stats.ordens}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.receita)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* COMPANY INFO - Editable */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Informações da Empresa</CardTitle>
                    {isEditing && (
                        <Button size="sm" onClick={handleSaveEdit}>
                            <Save className="h-4 w-4 mr-1" />
                            Salvar
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    {isEditing ? (
                        <>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Nome</label>
                                <Input value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">CNPJ</label>
                                <Input value={editForm.cnpj} onChange={e => setEditForm(f => ({ ...f, cnpj: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Telefone</label>
                                <Input value={editForm.telefone} onChange={e => setEditForm(f => ({ ...f, telefone: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Email</label>
                                <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Endereço</label>
                                <Input value={editForm.endereco} onChange={e => setEditForm(f => ({ ...f, endereco: e.target.value }))} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{company.email || '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Telefone</p>
                                <p className="font-medium">{company.telefone || '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Endereço</p>
                                <p className="font-medium">{company.endereco || '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Plano</p>
                                <p className="font-medium">{company.plano || '—'}</p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* USERS LIST */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-500" />
                        Usuários ({users.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {users.map(user => (
                            <div key={user.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium">{user.nome_completo || 'Sem nome'}</p>
                                        {user.status === false && (
                                            <Badge variant="destructive" className="text-xs">Inativo</Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Cargo toggle */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggleCargo(user.id, user.cargo)}
                                        title={`Alterar para ${user.cargo === 'admin' ? 'técnico' : 'admin'}`}
                                    >
                                        <Badge variant={user.cargo === 'admin' ? 'default' : 'secondary'}>
                                            {user.cargo || 'tecnico'}
                                        </Badge>
                                    </Button>

                                    {/* Status toggle */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleToggleUserStatus(user.id, user.status)}
                                        title={user.status !== false ? 'Desativar' : 'Ativar'}
                                    >
                                        {user.status !== false ? (
                                            <UserCheck className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <UserX className="h-4 w-4 text-red-500" />
                                        )}
                                    </Button>

                                    {/* Reset password */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setResetUserId(user.id); setNewPassword('') }}
                                        title="Resetar senha"
                                    >
                                        <KeyRound className="h-4 w-4 text-blue-500" />
                                    </Button>

                                    {/* Remove from company */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveUser(user.id, user.nome_completo)}
                                        title="Remover da empresa"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-400" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {users.length === 0 && (
                            <p className="text-muted-foreground">Nenhum usuário</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ======== MODAL: RESET PASSWORD ======== */}
            {resetUserId && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-xl border shadow-2xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-blue-500" />
                            <h3 className="text-lg font-bold">Resetar Senha</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Usuário: <strong>{users.find(u => u.id === resetUserId)?.email}</strong>
                        </p>
                        <Input
                            type="password"
                            placeholder="Nova senha (mínimo 6 caracteres)"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => { setResetUserId(null); setNewPassword('') }}>
                                Cancelar
                            </Button>
                            <Button onClick={handleResetPassword} disabled={resettingPassword || newPassword.length < 6}>
                                {resettingPassword && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======== MODAL: DELETE COMPANY ======== */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-xl border shadow-2xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="h-6 w-6" />
                            <h3 className="text-lg font-bold">Excluir Empresa</h3>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2">
                            <p className="text-sm font-semibold text-red-500">⚠️ Esta ação é IRREVERSÍVEL!</p>
                            <p className="text-sm text-muted-foreground">
                                Serão excluídos permanentemente:
                            </p>
                            <ul className="text-sm text-muted-foreground list-disc ml-4 space-y-1">
                                <li><strong>{users.length}</strong> usuário(s)</li>
                                <li><strong>{stats.clientes}</strong> cliente(s)</li>
                                <li><strong>{stats.ordens}</strong> ordem(ns) de serviço</li>
                                <li>Todas as notas fiscais, finanças, chat, configurações e serviços</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm">
                                Para confirmar, digite o nome da empresa: <strong className="text-red-500">{company.nome}</strong>
                            </p>
                            <Input
                                placeholder="Digite o nome exato da empresa"
                                value={deleteConfirmName}
                                onChange={e => setDeleteConfirmName(e.target.value)}
                                className="border-red-500/30 focus:border-red-500"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeleteConfirmName('') }}>
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteCompany}
                                disabled={deleting || deleteConfirmName.trim().toLowerCase() !== company.nome.trim().toLowerCase()}
                            >
                                {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                Excluir Permanentemente
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Users, Search, ChevronRight, Shield, Trash2, Loader2, Filter, KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface CompanyRow {
    id: string
    nome: string
    cnpj: string | null
    telefone: string | null
    created_at: string
    plano: string | null
    status_assinatura: string | null
    user_count: number
}

type FilterStatus = 'all' | 'active' | 'canceled' | 'free' | 'no_users'

export function SuperAdminDashboard() {
    const [companies, setCompanies] = useState<CompanyRow[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<FilterStatus>('all')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showPerfilModal, setShowPerfilModal] = useState(false)
    const [newAdminPassword, setNewAdminPassword] = useState('')
    const [updatingPassword, setUpdatingPassword] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        loadCompanies()
    }, [])

    async function loadCompanies() {
        setLoading(true)

        const { data: empresas, error } = await supabase
            .from('empresas')
            .select('*')
            .order('created_at', { ascending: false })

        if (error || !empresas) {
            setLoading(false)
            return
        }

        const companiesWithCount: CompanyRow[] = []

        for (const empresa of empresas) {
            const emp = empresa as any
            const { count } = await supabase
                .from('usuarios')
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', emp.id)

            companiesWithCount.push({
                id: emp.id,
                nome: emp.nome || 'Sem nome',
                cnpj: emp.cnpj || null,
                telefone: emp.telefone || null,
                created_at: emp.created_at || new Date().toISOString(),
                plano: emp.subscription_price_id || null,
                status_assinatura: emp.subscription_status || null,
                user_count: count || 0
            })
        }

        setCompanies(companiesWithCount)
        setLoading(false)
    }

    async function handleQuickDelete(e: React.MouseEvent, company: CompanyRow) {
        e.stopPropagation()

        const confirmed = confirm(
            `⚠️ EXCLUIR "${company.nome}"?\n\n` +
            `Isso removerá PERMANENTEMENTE:\n` +
            `• ${company.user_count} usuário(s)\n` +
            `• Todos os clientes, OS, finanças e dados\n\n` +
            `Esta ação NÃO pode ser desfeita!`
        )

        if (!confirmed) return

        const confirmName = prompt(`Para confirmar, digite o nome da empresa: "${company.nome}"`)
        if (confirmName?.trim().toLowerCase() !== company.nome.trim().toLowerCase()) {
            toast.error('Nome não confere. Exclusão cancelada.')
            return
        }

        setDeletingId(company.id)
        try {
            const { data, error } = await (supabase.rpc as any)('sa_delete_company', {
                target_empresa_id: company.id
            })

            if (error) {
                toast.error('Erro: ' + error.message)
                return
            }

            toast.success(`"${company.nome}" excluída com sucesso!`)
            setCompanies(prev => prev.filter(c => c.id !== company.id))
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
        } finally {
            setDeletingId(null)
        }
    }

    async function handleUpdateAdminPassword() {
        if (!newAdminPassword || newAdminPassword.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres')
            return
        }

        setUpdatingPassword(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: newAdminPassword
            })

            if (error) throw error

            toast.success('Senha atualizada com sucesso!')
            setShowPerfilModal(false)
            setNewAdminPassword('')
        } catch (err: any) {
            toast.error('Erro ao atualizar senha: ' + err.message)
        } finally {
            setUpdatingPassword(false)
        }
    }

    const filtered = companies
        .filter(c =>
            c.nome.toLowerCase().includes(search.toLowerCase()) ||
            (c.cnpj && c.cnpj.includes(search))
        )
        .filter(c => {
            if (filter === 'all') return true
            if (filter === 'active') return c.status_assinatura === 'active'
            if (filter === 'canceled') return c.status_assinatura === 'canceled'
            if (filter === 'free') return !c.status_assinatura || c.status_assinatura === 'free'
            if (filter === 'no_users') return c.user_count === 0
            return true
        })

    const filterOptions: { value: FilterStatus; label: string; count: number }[] = [
        { value: 'all', label: 'Todas', count: companies.length },
        { value: 'active', label: 'Ativas', count: companies.filter(c => c.status_assinatura === 'active').length },
        { value: 'free', label: 'Sem plano', count: companies.filter(c => !c.status_assinatura || c.status_assinatura === 'free').length },
        { value: 'canceled', label: 'Canceladas', count: companies.filter(c => c.status_assinatura === 'canceled').length },
        { value: 'no_users', label: 'Sem usuários', count: companies.filter(c => c.user_count === 0).length },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-amber-500" />
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Super Admin</h1>
                    <p className="text-sm text-muted-foreground">Painel de gerenciamento de todas as empresas</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPerfilModal(true)}>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Alterar Minha Senha
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{companies.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{companies.reduce((sum, c) => sum + c.user_count, 0)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
                        <Badge variant="default" className="bg-emerald-500">Ativas</Badge>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">
                            {companies.filter(c => c.status_assinatura === 'active').length}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Search + Filters */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar empresa por nome ou CNPJ..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    {filterOptions.map(opt => (
                        <Button
                            key={opt.value}
                            variant={filter === opt.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter(opt.value)}
                            className="text-xs"
                        >
                            {opt.label} ({opt.count})
                        </Button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(company => (
                        <Card
                            key={company.id}
                            className="cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => navigate(`/super-admin/empresa/${company.id}`)}
                        >
                            <CardContent className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 shrink-0">
                                        <Building2 className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{company.nome}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {company.cnpj || 'Sem CNPJ'} · {company.user_count} usuário(s)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {company.status_assinatura === 'active' ? (
                                        <Badge className="bg-emerald-500">Ativa</Badge>
                                    ) : (
                                        <Badge variant="secondary">{company.status_assinatura || 'Sem plano'}</Badge>
                                    )}

                                    {/* Quick delete */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={(e) => handleQuickDelete(e, company)}
                                        disabled={deletingId === company.id}
                                        title="Excluir empresa"
                                    >
                                        {deletingId === company.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>

                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {filtered.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">Nenhuma empresa encontrada</p>
                    )}
                </div>
            )}
            {/* ======== MODAL: PERFIL / SENHA ======== */}
            {showPerfilModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-card rounded-xl border shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-bold">Gerenciar Perfil (Super Admin)</h3>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nova Senha Forte</label>
                            <Input
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                value={newAdminPassword}
                                onChange={e => setNewAdminPassword(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Dica: Use letras, números e símbolos para maior segurança.
                            </p>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <Button variant="outline" onClick={() => { setShowPerfilModal(false); setNewAdminPassword('') }}>
                                Cancelar
                            </Button>
                            <Button onClick={handleUpdateAdminPassword} disabled={updatingPassword || newAdminPassword.length < 6}>
                                {updatingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Atualizar Senha
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

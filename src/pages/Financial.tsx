import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FinancialClosing } from './FinancialClosing'
import { ArrowUpCircle, ArrowDownCircle, DollarSign, Truck, ClipboardList, Plus, Car } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface FluxoItem {
    id: string
    tipo: 'ENTRADA' | 'SAIDA' | 'COMISSAO' | 'ADIANTAMENTO' | 'BONUS' | 'FECHAMENTO'
    valor: number
    descricao: string
    status: string
    data_lancamento: string
    forma_pagamento?: string
    categoria?: string
    responsavel?: string
}

export function Financial() {
    const { userData } = useAuth()
    const [fluxo, setFluxo] = useState<FluxoItem[]>([])
    const [recentActivities, setRecentActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState<'ALL' | 'ENTRADA' | 'SAIDA'>('ALL')
    const [activeTab, setActiveTab] = useState<'fluxo' | 'comissoes'>('fluxo')

    // Expense Dialog State
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
    const [vehicles, setVehicles] = useState<any[]>([])
    const [loadingVehicles, setLoadingVehicles] = useState(false)
    const [newExpense, setNewExpense] = useState({
        descricao: '',
        valor: '',
        categoria: '',
        data_gasto: new Date().toISOString().split('T')[0],
        placa_carro: '',
        novo_veiculo_placa: '',
        novo_veiculo_modelo: ''
    })

    // Redireciona técnico para sua própria tela financeira
    const isTecnico = userData?.cargo?.toLowerCase() === 'tecnico' || userData?.cargo?.toLowerCase() === 'técnico'
    if (isTecnico) {
        return <Navigate to="/tecnico/financeiro" replace />
    }

    useEffect(() => {
        if (userData?.empresa_id) {
            fetchFluxo()
        }
    }, [userData?.empresa_id])

    const fetchFluxo = async () => {
        try {
            const [fluxoResponse, expensesResponse, recentOSResponse] = await Promise.all([
                supabase
                    .from('financeiro_fluxo')
                    .select('*')
                    .eq('empresa_id', userData!.empresa_id)
                    .order('data_lancamento', { ascending: false }),
                supabase
                    .from('despesas_tecnicos')
                    .select('*, tecnico:tecnico_id(nome_completo)')
                    .eq('empresa_id', userData!.empresa_id)
                    .eq('status_aprovacao', 'aprovado')
                    .neq('status', 'pago'), // Don't double count paid expenses (already in FECHAMENTO)
                supabase
                    .from('ordens_servico')
                    .select(`
                        id, 
                        cliente_nome, 
                        status, 
                        valor_total, 
                        created_at,
                        deslocamento_iniciado_em,
                        previsao_chegada,
                        tecnico:tecnico_id (nome_completo)
                    `)
                    .eq('empresa_id', userData!.empresa_id)
                    .order('updated_at', { ascending: false })
                    .limit(5)
            ])

            if (fluxoResponse.error) throw fluxoResponse.error
            if (expensesResponse.error) throw expensesResponse.error
            if (recentOSResponse.error) console.error('Erro fetching OS', recentOSResponse.error)

            setRecentActivities(recentOSResponse.data || [])

            // Format expenses to match FluxoItem
            const expensesAsFluxo: FluxoItem[] = (expensesResponse.data || []).map((exp: any) => ({
                id: exp.id,
                tipo: 'SAIDA',
                valor: Number(exp.valor),
                descricao: `(A Pagar) ${exp.descricao}`,
                status: 'APROVADO',
                data_lancamento: exp.created_at,
                categoria: exp.categoria,
                responsavel: exp.tecnico?.nome_completo || 'Admin'
            }))

            // Merge and sort
            const combined = [...(fluxoResponse.data || []), ...expensesAsFluxo].sort((a, b) =>
                new Date(b.data_lancamento).getTime() - new Date(a.data_lancamento).getTime()
            )

            setFluxo(combined)
        } catch (error) {
            console.error('Erro ao buscar fluxo:', error)
        } finally {
            setLoading(false)
        }
    }

    const calculateTotals = () => {
        return fluxo.reduce((acc, item) => {
            const valor = Number(item.valor)
            if (item.tipo === 'ENTRADA') {
                acc.receitas += valor
                acc.saldo += valor
            } else {
                // SAIDA, COMISSAO, ADIANTAMENTO, BONUS, FECHAMENTO
                // Note: SAIDA includes the projected expenses we just added
                acc.despesas += valor
                acc.saldo -= valor
            }
            return acc
        }, { receitas: 0, despesas: 0, saldo: 0 })
    }

    const totals = calculateTotals()

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    const filteredFluxo = fluxo.filter(item => {
        if (filterType === 'ALL') return true
        if (filterType === 'ENTRADA') return item.tipo === 'ENTRADA'
        return item.tipo !== 'ENTRADA'
    })

    const fetchVehicles = async () => {
        if (!userData?.empresa_id) return
        setLoadingVehicles(true)
        const { data, error } = await supabase
            .from('veiculos')
            .select('*')
            .eq('empresa_id', userData.empresa_id)
            .order('placa')

        if (error) console.error('Erro ao buscar veículos:', error)
        else setVehicles(data || [])
        setLoadingVehicles(false)
    }

    const handleOpenExpenseDialog = () => {
        setNewExpense({
            descricao: '',
            valor: '',
            categoria: '',
            data_gasto: new Date().toISOString().split('T')[0],
            placa_carro: '',
            novo_veiculo_placa: '',
            novo_veiculo_modelo: ''
        })
        fetchVehicles()
        setIsExpenseDialogOpen(true)
    }

    const handleSaveExpense = async () => {
        if (!userData?.empresa_id) return
        if (!newExpense.descricao || !newExpense.valor || !newExpense.categoria) {
            toast.error('Preencha os campos obrigatórios')
            return
        }

        let placaFinal = newExpense.placa_carro

        // Handle New Vehicle Creation
        if (newExpense.placa_carro === 'new') {
            if (!newExpense.novo_veiculo_placa || !newExpense.novo_veiculo_modelo) {
                toast.error('Preencha os dados do novo veículo')
                return
            }

            const { error: vehicleError } = await supabase.from('veiculos').insert({
                empresa_id: userData.empresa_id,
                placa: newExpense.novo_veiculo_placa.toUpperCase(),
                modelo: newExpense.novo_veiculo_modelo,
                ano: new Date().getFullYear() // Default to current year
            })

            if (vehicleError) {
                // Se o erro for de duplicidade (carro já existe), apenas prosseguimos
                if (vehicleError.code === '23505') {
                    // Carro já existe, tudo bem.
                    toast.info('Veículo já constava na base de dados, utilizando o existente.')
                    placaFinal = newExpense.novo_veiculo_placa.toUpperCase()
                } else {
                    toast.error('Erro ao cadastrar veículo: ' + vehicleError.message)
                    return
                }
            } else {
                placaFinal = newExpense.novo_veiculo_placa.toUpperCase()
            }
        }

        // Save Expense
        const { error } = await supabase.from('despesas_tecnicos').insert({
            empresa_id: userData.empresa_id,
            tecnico_id: null, // Admin expense
            descricao: newExpense.descricao,
            valor: parseFloat(newExpense.valor.replace(',', '.')), // Basic parsing
            categoria: newExpense.categoria,
            data_gasto: newExpense.data_gasto,
            placa_carro: placaFinal || null,
            status: 'pago', // Admin expenses are usually paid directly
            status_aprovacao: 'aprovado',
            origem_pagamento: 'empresa_caixa',
            tipo_despesa: newExpense.categoria === 'manutencao_veiculo' ? 'manutencao' : 'outros'
        })

        if (error) {
            toast.error('Erro ao salvar despesa: ' + error.message)
            console.error(error)
        } else {
            // Also add to financeiro_fluxo as a SAIDA since it's paid immediately
            const { error: fluxoError } = await supabase.from('financeiro_fluxo').insert({
                empresa_id: userData.empresa_id,
                tipo: 'SAIDA',
                valor: parseFloat(newExpense.valor.replace(',', '.')),
                descricao: newExpense.descricao,
                status: 'pago',
                data_lancamento: newExpense.data_gasto,
                categoria: newExpense.categoria
            })

            if (fluxoError) {
                console.error('Erro ao registrar no fluxo:', fluxoError)
                toast.warning('Despesa salva, mas houve erro ao registrar no fluxo de caixa.')
            } else {
                toast.success('Despesa registrada com sucesso!')
            }

            setIsExpenseDialogOpen(false)
            fetchFluxo() // Refresh list
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-8 mt-6 md:mt-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão Financeira</h1>
                    <p className="text-slate-500">Acompanhe o fluxo de caixa, comissões e despesas.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleOpenExpenseDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Despesa
                    </Button>
                </div>
            </div>

            {/* Manual Tabs */}
            <div className="space-y-6">
                <div className="flex space-x-1 rounded-xl bg-slate-200 p-1 w-full md:w-[400px]">
                    <button
                        onClick={() => setActiveTab('fluxo')}
                        className={cn(
                            "w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all text-center",
                            activeTab === 'fluxo'
                                ? "bg-white text-emerald-700 shadow"
                                : "text-slate-600 hover:bg-white/[0.12] hover:text-emerald-600"
                        )}
                    >
                        Fluxo de Caixa
                    </button>
                    <button
                        onClick={() => setActiveTab('comissoes')}
                        className={cn(
                            "w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all text-center",
                            activeTab === 'comissoes'
                                ? "bg-white text-emerald-700 shadow"
                                : "text-slate-600 hover:bg-white/[0.12] hover:text-emerald-600"
                        )}
                    >
                        Comissões e Fechamento
                    </button>
                </div>

                {activeTab === 'fluxo' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Totals Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-emerald-700 uppercase tracking-wider">Receitas</CardTitle>
                                    <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-emerald-900">{formatCurrency(totals.receitas)}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-red-50 border-red-100 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-red-700 uppercase tracking-wider">Despesas</CardTitle>
                                    <ArrowDownCircle className="h-5 w-5 text-red-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-red-900">{formatCurrency(totals.despesas)}</div>
                                </CardContent>
                            </Card>
                            <Card className={cn("border shadow-sm", totals.saldo >= 0 ? "bg-white border-slate-200" : "bg-red-50/50 border-red-100")}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-700 uppercase tracking-wider">Saldo Total</CardTitle>
                                    <DollarSign className={cn("h-5 w-5", totals.saldo >= 0 ? "text-slate-900" : "text-red-600")} />
                                </CardHeader>
                                <CardContent>
                                    <div className={cn("text-3xl font-bold", totals.saldo >= 0 ? "text-slate-900" : "text-red-700")}>
                                        {formatCurrency(totals.saldo)}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts & Lists Grid */}
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Recent Activities (OS) */}
                            <Card className="border-slate-200 shadow-sm h-full">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Truck className="h-5 w-5 text-emerald-500" />
                                            Atividades Recentes
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {recentActivities.length === 0 ? (
                                            <p className="text-center text-slate-400 py-4">Nenhuma atividade recente.</p>
                                        ) : (
                                            recentActivities.map((os) => (
                                                <div key={os.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-3">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-10 h-10 shrink-0 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                                                            <ClipboardList className="h-5 w-5" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-bold text-slate-800 truncate">{os.cliente_nome || 'Cliente sem nome'}</p>
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap overflow-hidden">
                                                                <span className="shrink-0">OS #{os.id.slice(0, 6)}</span>
                                                                {os.tecnico?.nome_completo && (
                                                                    <>
                                                                        <span className="shrink-0">•</span>
                                                                        <span className="truncate">{os.tecnico.nome_completo.split(' ')[0]}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{formatCurrency(os.valor_total || 0)}</p>
                                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium uppercase whitespace-nowrap ${os.status?.toLowerCase() === 'concluido' ? 'bg-emerald-100 text-emerald-600' :
                                                            os.deslocamento_iniciado_em ? 'bg-blue-100 text-blue-600' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                            {os.status?.toLowerCase() === 'concluido' ? 'Concluído' :
                                                                os.deslocamento_iniciado_em ? 'Deslocamento' :
                                                                    os.status || 'Pendente'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Transaction List */}
                            <Card className="border-slate-200 shadow-sm h-full">
                                <CardHeader className="pb-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                                            <DollarSign className="h-5 w-5 text-emerald-500" />
                                            Transações Recentes
                                        </CardTitle>
                                        <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                                            <Button
                                                variant={filterType === 'ALL' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setFilterType('ALL')}
                                                className={cn("h-7 text-[10px] md:text-xs px-2 md:px-3", filterType === 'ALL' ? "bg-slate-800 text-white" : "")}
                                            >
                                                Todas
                                            </Button>
                                            <Button
                                                variant={filterType === 'ENTRADA' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setFilterType('ENTRADA')}
                                                className={cn("h-7 text-[10px] md:text-xs px-2 md:px-3", filterType === 'ENTRADA' ? "bg-emerald-600 text-white" : "text-emerald-600 border-emerald-200 bg-emerald-50")}
                                            >
                                                Entradas
                                            </Button>
                                            <Button
                                                variant={filterType === 'SAIDA' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setFilterType('SAIDA')}
                                                className={cn("h-7 text-[10px] md:text-xs px-2 md:px-3", filterType === 'SAIDA' ? "bg-red-600 text-white" : "text-red-600 border-red-200 bg-red-50")}
                                            >
                                                Saídas
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                                <tr>
                                                    <th className="p-2 md:p-3">Descrição</th>
                                                    <th className="p-2 md:p-3 text-right">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {loading ? (
                                                    <tr><td colSpan={2} className="p-4 text-center text-slate-500">Carregando...</td></tr>
                                                ) : filteredFluxo.length === 0 ? (
                                                    <tr><td colSpan={2} className="p-4 text-center text-slate-500">Nenhuma transação.</td></tr>
                                                ) : (
                                                    filteredFluxo.slice(0, 5).map((item) => (
                                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="p-2 md:p-3 font-medium text-slate-700 min-w-0">
                                                                <div className="line-clamp-1 text-xs md:text-sm">{item.descricao}</div>
                                                                <div className="text-[9px] md:text-[10px] text-slate-400 font-normal flex items-center gap-1">
                                                                    <span>{new Date(item.data_lancamento).toLocaleDateString()}</span>
                                                                    {item.responsavel && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className="text-emerald-600 font-medium truncate max-w-[60px] md:max-w-[100px]">{item.responsavel.split(' ')[0]}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className={cn("p-2 md:p-3 text-right font-bold whitespace-nowrap text-xs md:text-sm", item.tipo === 'ENTRADA' ? "text-emerald-700" : "text-red-700")}>
                                                                {item.tipo === 'ENTRADA' ? '+' : '-'} {formatCurrency(item.valor)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}


                {activeTab === 'comissoes' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <FinancialClosing />
                    </div>
                )}


                <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                    <DialogContent className="sm:max-w-[500px] bg-white">
                        <DialogHeader>
                            <DialogTitle>Registrar Nova Despesa</DialogTitle>
                            <DialogDescription>
                                Lance uma despesa da empresa. Para manutenção, selecione ou cadastre o veículo.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Data</Label>
                                    <Input
                                        type="date"
                                        value={newExpense.data_gasto}
                                        onChange={e => setNewExpense({ ...newExpense, data_gasto: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Valor (R$)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={newExpense.valor}
                                        onChange={e => setNewExpense({ ...newExpense, valor: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input
                                    placeholder="Ex: Conta de Luz, Troca de Óleo..."
                                    value={newExpense.descricao}
                                    onChange={e => setNewExpense({ ...newExpense, descricao: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select
                                    value={newExpense.categoria}
                                    onValueChange={val => setNewExpense({ ...newExpense, categoria: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="aluguel">Aluguel</SelectItem>
                                        <SelectItem value="energia">Energia Elétrica</SelectItem>
                                        <SelectItem value="agua">Água / Saneamento</SelectItem>
                                        <SelectItem value="internet">Internet / Telefone</SelectItem>
                                        <SelectItem value="material">Material / Peças</SelectItem>
                                        <SelectItem value="combustivel">Combustível</SelectItem>
                                        <SelectItem value="manutencao_veiculo">Manutenção de Veículo</SelectItem>
                                        <SelectItem value="marketing">Marketing / Anúncios</SelectItem>
                                        <SelectItem value="outros">Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Vehicle Section */}
                            {(newExpense.categoria === 'manutencao_veiculo' || newExpense.categoria === 'combustivel') && (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 animate-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Car className="h-4 w-4 text-slate-500" />
                                            Selecione o Veículo
                                        </Label>
                                        <Select
                                            value={newExpense.placa_carro}
                                            onValueChange={val => setNewExpense({ ...newExpense, placa_carro: val })}
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Escolha o carro..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {loadingVehicles ? (
                                                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                                ) : (
                                                    vehicles.map(v => (
                                                        <SelectItem key={v.id} value={v.placa}>
                                                            {v.modelo} - {v.placa}
                                                        </SelectItem>
                                                    ))
                                                )}
                                                <SelectItem value="new" className="text-emerald-600 font-bold focus:text-emerald-700 bg-emerald-50">
                                                    + Cadastrar Novo Veículo
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* New Vehicle Form */}
                                    {newExpense.placa_carro === 'new' && (
                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                                            <div className="space-y-2">
                                                <Label>Placa</Label>
                                                <Input
                                                    placeholder="ABC-1234"
                                                    className="uppercase"
                                                    maxLength={8}
                                                    value={newExpense.novo_veiculo_placa}
                                                    onChange={e => setNewExpense({ ...newExpense, novo_veiculo_placa: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Modelo</Label>
                                                <Input
                                                    placeholder="Ex: Fiat Uno"
                                                    value={newExpense.novo_veiculo_modelo}
                                                    onChange={e => setNewExpense({ ...newExpense, novo_veiculo_modelo: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveExpense} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                Salvar Despesa
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div >
        </div >
    )
}

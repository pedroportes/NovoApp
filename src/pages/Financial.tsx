import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FinancialClosing } from './FinancialClosing'
import { ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react'
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
}

export function Financial() {
    const { userData } = useAuth()
    const [fluxo, setFluxo] = useState<FluxoItem[]>([])
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState<'ALL' | 'ENTRADA' | 'SAIDA'>('ALL')
    const [activeTab, setActiveTab] = useState<'fluxo' | 'comissoes'>('fluxo')

    useEffect(() => {
        if (userData?.empresa_id) {
            fetchFluxo()
        }
    }, [userData?.empresa_id])

    const fetchFluxo = async () => {
        try {
            const [fluxoResponse, expensesResponse] = await Promise.all([
                supabase
                    .from('financeiro_fluxo')
                    .select('*')
                    .eq('empresa_id', userData!.empresa_id)
                    .order('data_lancamento', { ascending: false }),
                supabase
                    .from('despesas_tecnicos')
                    .select('*')
                    .eq('empresa_id', userData!.empresa_id)
                    .eq('status_aprovacao', 'aprovado')
                    .neq('status', 'pago') // Don't double count paid expenses (already in FECHAMENTO)
            ])

            if (fluxoResponse.error) throw fluxoResponse.error
            if (expensesResponse.error) throw expensesResponse.error

            // Format expenses to match FluxoItem
            const expensesAsFluxo: FluxoItem[] = (expensesResponse.data || []).map((exp: any) => ({
                id: exp.id,
                tipo: 'SAIDA',
                valor: Number(exp.valor),
                descricao: `(A Pagar) ${exp.descricao}`,
                status: 'APROVADO',
                data_lancamento: exp.created_at,
                categoria: exp.categoria
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

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão Financeira</h1>
                    <p className="text-slate-500">Acompanhe o fluxo de caixa e comissões.</p>
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

                        {/* Transaction List */}
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle>Transações Recentes</CardTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={filterType === 'ALL' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setFilterType('ALL')}
                                            className={filterType === 'ALL' ? "bg-slate-800 text-white hover:bg-slate-700" : ""}
                                        >
                                            Todas
                                        </Button>
                                        <Button
                                            variant={filterType === 'ENTRADA' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setFilterType('ENTRADA')}
                                            className={filterType === 'ENTRADA' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"}
                                        >
                                            Entradas
                                        </Button>
                                        <Button
                                            variant={filterType === 'SAIDA' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setFilterType('SAIDA')}
                                            className={filterType === 'SAIDA' ? "bg-red-600 hover:bg-red-700 text-white" : "text-red-600 border-red-200 bg-red-50 hover:bg-red-100"}
                                        >
                                            Saídas
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-medium">
                                            <tr>
                                                <th className="p-4">Descrição</th>
                                                <th className="p-4">Tipo</th>
                                                <th className="p-4">Data</th>
                                                <th className="p-4 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {loading ? (
                                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Carregando fluxo...</td></tr>
                                            ) : filteredFluxo.length === 0 ? (
                                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhuma transação encontrada.</td></tr>
                                            ) : (
                                                filteredFluxo.map((item) => (
                                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-medium text-slate-700">
                                                            {item.descricao || 'Sem descrição'}
                                                            <div className="text-xs text-slate-400 font-normal">{item.categoria}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={cn(
                                                                "px-2 py-1 rounded-full text-xs font-bold uppercase",
                                                                item.tipo === 'ENTRADA' ? "bg-emerald-100 text-emerald-700" :
                                                                    item.tipo === 'FECHAMENTO' ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-700"
                                                            )}>
                                                                {item.tipo}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-slate-500">
                                                            {new Date(item.data_lancamento).toLocaleDateString('pt-BR')}
                                                        </td>
                                                        <td className={cn("p-4 text-right font-bold", item.tipo === 'ENTRADA' ? "text-emerald-700" : "text-red-700")}>
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
                )}

                {activeTab === 'comissoes' && (
                    <div className="min-h-screen">
                        {/* We render FinancialClosing but might need to adjust its padding/container. 
                            Since FinancialClosing has its own container classes (min-h-screen, p-8), 
                            it might look double-padded. Ideally we'd strip its container.
                            For now, it works.
                        */}
                        <FinancialClosing />
                    </div>
                )}
            </div>
        </div>
    )
}

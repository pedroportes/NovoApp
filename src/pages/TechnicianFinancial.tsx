import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { financialService, TechnicianBalance } from '@/services/financialService'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp, Receipt, Wallet, Clock, CheckCircle, Loader2, FileText, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TechnicianFinancial() {
    const { userData } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [balance, setBalance] = useState<TechnicianBalance | null>(null)
    const [pendingExpensesCount, setPendingExpensesCount] = useState(0)
    const [approvedExpensesCount, setApprovedExpensesCount] = useState(0)

    useEffect(() => {
        if (userData?.id) {
            loadData()
        }
    }, [userData?.id])

    const loadData = async () => {
        setLoading(true)
        try {
            const [balanceData, pendingData, approvedData] = await Promise.all([
                financialService.getTechnicianBalance(userData!.id),
                financialService.getPendingExpenses(userData!.id),
                financialService.getApprovedExpenses(userData!.id)
            ])
            setBalance(balanceData)
            setPendingExpensesCount(pendingData.length)
            setApprovedExpensesCount(approvedData.length)
        } catch (error) {
            console.error('Erro ao carregar dados financeiros:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    // Display Balance Logic: Only considers Commission - Advances for the main card "Debt/Credit" view
    const displayBalance = (balance?.totalCommission || 0) + (balance?.totalBonus || 0) - (balance?.totalAdvances || 0)

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 p-4 md:p-8 space-y-6 pb-32 mt-6 md:mt-0">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="rounded-full"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-emerald-950">Meu Financeiro</h1>
                    <p className="text-sm text-emerald-700/80">Acompanhe suas comissões e gastos</p>
                </div>
            </div>

            {/* Main Balance Card - ALWAYS EMERALD/TEAL BACKGROUND */}
            <div className={cn(
                "relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transition-all duration-500",
                "bg-gradient-to-br from-emerald-600 to-teal-500 shadow-emerald-200"
            )}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-bold uppercase tracking-wider text-emerald-100">
                            {displayBalance >= 0 ? "Saldo a Receber" : "Saldo Devedor (A Devolver)"}
                        </p>
                    </div>

                    {/* RED TEXT ONLY for the amount if negative */}
                    <h2 className={cn(
                        "text-4xl font-black mt-1 mb-4",
                        displayBalance < 0 ? "text-red-300 drop-shadow-md" : "text-white"
                    )}>
                        {formatCurrency(displayBalance)}
                    </h2>

                    {/* Breakdown inside card */}
                    <div className="flex gap-3 mb-4">
                        <div className="bg-white/10 rounded-xl p-2 px-3 backdrop-blur-sm flex-1 border border-white/10">
                            <p className="text-[10px] uppercase font-bold mb-0.5 text-emerald-100">+ Comissões</p>
                            <p className="font-bold text-white text-lg">{formatCurrency((balance?.totalCommission || 0) + (balance?.totalBonus || 0))}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-2 px-3 backdrop-blur-sm flex-1 border border-white/10">
                            <p className="text-[10px] uppercase font-bold mb-0.5 text-emerald-100">- Adiantamentos</p>
                            <p className="font-bold text-white text-lg">- {formatCurrency(balance?.totalAdvances || 0)}</p>
                        </div>
                    </div>

                    <p className="text-xs font-medium flex items-center gap-1 text-emerald-100">
                        {displayBalance >= 0
                            ? "💡 Este valor refere-se a comissões menos adiantamentos"
                            : "⚠️ Seus adiantamentos superam as comissões atuais"
                        }
                    </p>
                </div>
            </div>

            {/* Warn about separate reimbursements if any */}
            {(balance?.totalReimbursements || 0) > 0 && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-r shadow-sm flex justify-between items-center mb-6">
                    <div>
                        <p className="font-bold text-sm">Você tem também R$ {formatCurrency(balance?.totalReimbursements || 0)} em Reembolsos</p>
                        <p className="text-xs">Estes valores geralmente são pagos separadamente.</p>
                    </div>
                    <Wallet className="h-5 w-5 text-blue-500" />
                </div>
            )}

            {/* Botões de Ação Rápida */}
            <div className="grid grid-cols-2 gap-3">
                <Button
                    onClick={() => navigate('/expenses')}
                    className="h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-amber-100"
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Nova Despesa
                </Button>
                <Button
                    onClick={() => navigate('/tecnico/extrato')}
                    variant="outline"
                    className="h-14 rounded-2xl border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold"
                >
                    <FileText className="mr-2 h-5 w-5" />
                    Meu Extrato
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-white/70 backdrop-blur border-emerald-100">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                            </div>
                            <span className="text-xs font-medium text-slate-600">Comissões</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-700">{formatCurrency(balance?.totalCommission || 0)}</p>
                        <p className="text-xs text-slate-400 mt-1">{balance?.osCount || 0} serviços</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur border-blue-100">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Wallet className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-xs font-medium text-slate-600">Reembolsos</span>
                        </div>
                        <p className="text-xl font-bold text-blue-700">{formatCurrency(balance?.totalReimbursements || 0)}</p>
                        <p className="text-xs text-slate-400 mt-1">Aprovados</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur border-amber-100">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Receipt className="h-4 w-4 text-amber-600" />
                            </div>
                            <span className="text-xs font-medium text-slate-600">Adiantamentos</span>
                        </div>
                        <p className="text-xl font-bold text-amber-700">- {formatCurrency(balance?.totalAdvances || 0)}</p>
                        <p className="text-xs text-slate-400 mt-1">Descontado</p>
                    </CardContent>
                </Card>

                <Card
                    className="bg-white/70 backdrop-blur border-amber-100 cursor-pointer hover:bg-white/90 transition-colors"
                    onClick={() => navigate('/expenses')}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Clock className="h-4 w-4 text-amber-600" />
                            </div>
                            <span className="text-xs font-medium text-slate-600">Meus Gastos</span>
                        </div>
                        <p className="text-xl font-bold text-amber-700">{pendingExpensesCount}</p>
                        <p className="text-xs text-slate-400 mt-1">Aguardando aprovação →</p>
                    </CardContent>
                </Card>
            </div>

            {/* LISTA DE ADIANTAMENTOS (NOVO) */}
            {balance && balance.advancesDetails && balance.advancesDetails.length > 0 && (
                <Card className="bg-amber-50/80 backdrop-blur border-amber-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                            <Receipt className="h-5 w-5 text-amber-600" />
                            Meus Adiantamentos
                        </CardTitle>
                        <p className="text-xs text-amber-700/70">Valores já recebidos que estão sendo descontados</p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {balance.advancesDetails.map((adv: any) => (
                                <div key={adv.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-amber-100 shadow-sm">
                                    <div className="space-y-1">
                                        <p className="font-medium text-slate-800">{adv.descricao || 'Adiantamento'}</p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(adv.created_at || adv.data_lancamento).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-amber-600">- {formatCurrency(adv.valor || 0)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Detalhes das Comissões */}
            {balance && balance.osDetails && balance.osDetails.length > 0 && (
                <Card className="bg-white/80 backdrop-blur shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                            Serviços com Comissão
                        </CardTitle>
                        <p className="text-xs text-slate-500">Finalizados e aguardando pagamento</p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {balance.osDetails.map((os) => (
                                <div key={os.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="font-medium text-slate-800">{os.cliente_nome || 'Cliente'}</p>
                                        <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                            {os.descricao_servico || 'Serviço'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-600">{formatCurrency(os.commissionValue || 0)}</p>
                                        <p className="text-xs text-slate-400">de {formatCurrency(os.valor_total || 0)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Legenda/Explicação */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h3 className="font-medium text-blue-800 mb-2">💡 Resumo do Cálculo</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li><span className="font-bold text-emerald-600">+ Comissões</span> (Serviços realizados)</li>
                    <li><span className="font-bold text-blue-600">Reembolsos</span> (Exibidos separadamente para pagamento direto)</li>
                    <li><span className="font-bold text-amber-600">- Adiantamentos</span> (Já recebidos)</li>
                    <li className="pt-2 border-t border-blue-200 mt-2 font-bold">
                        = {displayBalance >= 0 ? "Saldo a Receber" : "Saldo Devedor"}
                    </li>
                </ul>
            </div>
        </div>
    )
}

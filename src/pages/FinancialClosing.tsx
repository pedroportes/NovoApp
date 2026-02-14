import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { financialService, TechnicianBalance } from '@/services/financialService'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, CheckCircle2, DollarSign, TrendingUp, TrendingDown, Receipt, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function FinancialClosing() {
    const { userData } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [technicians, setTechnicians] = useState<any[]>([])
    const [selectedTech, setSelectedTech] = useState<string | null>(null)
    const [balance, setBalance] = useState<TechnicianBalance | null>(null)
    const [pendingExpenses, setPendingExpenses] = useState<any[]>([])
    const [approvedExpenses, setApprovedExpenses] = useState<any[]>([])

    // Advance Dialog State
    const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false)
    const [advanceValue, setAdvanceValue] = useState('')
    const [advanceNote, setAdvanceNote] = useState('')
    const [advanceSubmitting, setAdvanceSubmitting] = useState(false)

    // Load technicians on mount
    useEffect(() => {
        if (userData?.empresa_id) {
            fetchTechnicians()
        }
    }, [userData?.empresa_id])

    // Load balance when technician is selected
    useEffect(() => {
        if (selectedTech) {
            loadBalance(selectedTech)
        } else {
            setBalance(null)
            setPendingExpenses([])
            setApprovedExpenses([])
        }
    }, [selectedTech])

    const fetchTechnicians = async () => {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('empresa_id', userData!.empresa_id)
                .eq('cargo', 'tecnico')
                .order('nome_completo')

            if (error) throw error


            let filtered = data || []
            // If logged in as Technician, ONLY show self
            if (userData?.cargo?.toLowerCase() === 'tecnico') {
                filtered = filtered.filter(t => t.id === userData.id)
            }

            setTechnicians(filtered)
            if (filtered.length > 0) {
                // Auto-select if there's only one (user logic) or just strict rule
                if (userData?.cargo?.toLowerCase() === 'tecnico') {
                    setSelectedTech(filtered[0].id)
                }
            }
        } catch (error) {
            console.error('Error fetching technicians:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadBalance = async (techId: string) => {
        setLoading(true)
        try {
            const [balanceData, pendingData, approvedData] = await Promise.all([
                financialService.getTechnicianBalance(techId),
                financialService.getPendingExpenses(techId),
                financialService.getApprovedExpenses(techId)
            ])
            setBalance(balanceData)
            setPendingExpenses(pendingData)
            setApprovedExpenses(approvedData)
        } catch (error) {
            console.error('Error loading balance:', error)
            alert('Erro ao carregar saldo do técnico')
        } finally {
            setLoading(false)
        }
    }

    const handleApproveDecline = async (id: string, status: 'aprovado' | 'rejeitado') => {
        try {
            await financialService.approveRejectExpense(id, status)
            // Reload to update list and balance
            if (selectedTech) await loadBalance(selectedTech)
        } catch (error) {
            console.error('Error updating expense:', error)
            alert('Erro ao atualizar despesa')
        }
    }

    const handleAuthorize = async (id: string, method: 'balance' | 'direct') => {
        try {
            await financialService.authorizeExpense(id, method)
            if (selectedTech) await loadBalance(selectedTech)
        } catch (error) {
            console.error('Error authorizing expense:', error)
            alert('Erro ao autorizar despesa')
        }
    }

    const handleCloseMonth = async () => {
        if (!balance || !selectedTech || !userData?.empresa_id) return
        if (!confirm(`Confirma o fechamento do mês para ${balance.technicianName}?\nValor: ${formatCurrency(balance.finalBalance)}\nIsso marcará ${balance.osCount} OSs como pagas.`)) return

        setSubmitting(true)
        try {
            await financialService.closeMonth(balance, userData!.empresa_id)
            alert('Mês fechado com sucesso!')
            if (selectedTech) await loadBalance(selectedTech) // Reload to show zeroed balance
        } catch (error) {
            console.error('Error closing month:', error)
            alert('Erro ao realizar fechamento')
        } finally {
            setSubmitting(false)
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    const handleGiveAdvance = async () => {
        if (!selectedTech || !advanceValue) {
            toast.error('Informe o valor do adiantamento')
            return
        }

        const valor = parseFloat(advanceValue.replace(',', '.'))
        if (isNaN(valor) || valor <= 0) {
            toast.error('Valor inválido')
            return
        }

        setAdvanceSubmitting(true)
        try {
            const { error } = await supabase.from('financeiro_fluxo').insert({
                empresa_id: userData!.empresa_id,
                tecnico_id: selectedTech,
                tipo: 'ADIANTAMENTO',
                valor: valor,
                descricao: advanceNote || `Adiantamento para ${balance?.technicianName || 'técnico'}`,
                status: 'PENDENTE',
                data_lancamento: new Date().toISOString().split('T')[0]
            })

            if (error) throw error

            toast.success('Adiantamento registrado com sucesso!')
            setIsAdvanceDialogOpen(false)
            setAdvanceValue('')
            setAdvanceNote('')
            if (selectedTech) await loadBalance(selectedTech) // Refresh balance
        } catch (error) {
            console.error('Erro ao registrar adiantamento:', error)
            toast.error('Erro ao registrar adiantamento')
        } finally {
            setAdvanceSubmitting(false)
        }
    }

    if (loading && !technicians.length) return <div className="p-8 text-center text-emerald-600">Carregando financeiro...</div>

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-emerald-100/50 p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-emerald-950 tracking-tight">Fechamento Financeiro</h1>
                    <p className="text-emerald-700/80">Gerencie comissões, adiantamentos e pagamentos.</p>
                </div>
                {selectedTech && balance && (
                    <div className="flex items-center gap-4 animate-in slide-in-from-right-4 duration-700">
                        <div className="text-right hidden md:block">
                            <p className="text-lg font-bold text-emerald-950">{balance.technicianName}</p>
                            <div className="flex items-center justify-end gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-xs font-medium text-emerald-600">Técnico Ativo</p>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full border-4 border-emerald-100 shadow-xl overflow-hidden bg-white flex items-center justify-center">
                                {balance.technicianAvatar ? (
                                    <img src={balance.technicianAvatar} alt={balance.technicianName} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-emerald-600">{balance.technicianName.charAt(0)}</span>
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Technician Selector - Stories Style */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {technicians.map(tech => (
                    <button
                        key={tech.id}
                        onClick={() => setSelectedTech(tech.id)}
                        className="group flex flex-col items-center gap-2 min-w-[80px] snap-center transition-all"
                    >
                        <div className={cn(
                            "w-16 h-16 rounded-full border-2 p-1 transition-all duration-300 relative",
                            selectedTech === tech.id
                                ? "border-emerald-500 scale-110 shadow-lg shadow-emerald-200"
                                : "border-transparent group-hover:border-emerald-200"
                        )}>
                            <div className={cn(
                                "w-full h-full rounded-full overflow-hidden border border-slate-100 flex items-center justify-center bg-white",
                                selectedTech === tech.id ? "ring-2 ring-emerald-100" : ""
                            )}>
                                {tech.avatar ? (
                                    <img src={tech.avatar} alt={tech.nome_completo} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xl font-bold text-slate-400 group-hover:text-emerald-500">{(tech.nome_completo || 'T').charAt(0)}</span>
                                )}
                            </div>
                            {selectedTech === tech.id && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                            )}
                        </div>
                        <span className={cn(
                            "text-xs font-medium truncate max-w-[80px] transition-colors",
                            selectedTech === tech.id ? "text-emerald-800 font-bold" : "text-slate-500 group-hover:text-emerald-600"
                        )}>
                            {(tech.nome_completo || 'Técnico').split(' ')[0]}
                        </span>
                    </button>
                ))}
            </div>

            {selectedTech && balance ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Main Balance Card - Glassmorphism Premium */}
                    <div className="relative overflow-hidden rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-2xl shadow-emerald-100/50 p-4 md:p-10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

                        <div className="relative z-10 grid gap-8 md:grid-cols-3">
                            {/* Saldo a Pagar */}
                            <div className="md:col-span-1 space-y-2">
                                <span className="text-sm font-bold uppercase tracking-wider text-emerald-800/60">Saldo a Pagar</span>
                                <div className="flex items-baseline gap-1">
                                    <h2 className="text-4xl md:text-6xl font-black text-emerald-900 drop-shadow-sm">
                                        {formatCurrency(balance.finalBalance)}
                                    </h2>
                                </div>
                                <p className="text-xs text-emerald-700 font-medium bg-emerald-100/50 py-1 px-3 rounded-full w-fit">
                                    Disponível para saque
                                </p>
                            </div>

                            {/* Summary Details */}
                            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                <div className="bg-white/50 rounded-2xl p-4 border border-white/60 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                            <TrendingUp className="h-5 w-5" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-600">Comissões</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(balance.totalCommission)}</p>
                                    <p className="text-xs text-slate-500 mt-1">{balance.osCount} Ordens de Serviço</p>
                                </div>

                                <div className="bg-white/50 rounded-2xl p-4 border border-white/60 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                            <Receipt className="h-5 w-5" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-600">Reembolsos</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(balance.totalReimbursements)}</p>
                                    <p className="text-xs text-slate-500 mt-1">Despesas Aprovadas</p>
                                </div>

                                <div className="bg-white/50 rounded-2xl p-4 border border-white/60 shadow-sm col-span-2 md:col-span-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                            <TrendingDown className="h-5 w-5" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-600">Adiantamentos</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(balance.totalAdvances)}</p>
                                    <p className="text-xs text-slate-500 mt-1">Descontado do total</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="mt-8 pt-8 border-t border-emerald-900/5 flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-sm text-slate-500 italic">
                                * Ao zerar o mês, todas as OSs listadas serão marcadas como pagas.
                            </p>
                            <div className="grid grid-cols-1 md:flex md:flex-row gap-3 w-full md:w-auto">
                                <Button
                                    onClick={() => setIsAdvanceDialogOpen(true)}
                                    variant="outline"
                                    className="h-14 px-6 rounded-xl font-bold border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 transition-all w-full md:w-auto"
                                >
                                    <Banknote className="mr-2 h-5 w-5" />
                                    Dar Adiantamento
                                </Button>
                                <Button
                                    onClick={handleCloseMonth}
                                    disabled={submitting || balance.finalBalance <= 0}
                                    className={cn(
                                        "h-14 px-8 rounded-xl text-lg font-bold shadow-xl shadow-emerald-300/30 transition-all w-full md:w-auto",
                                        balance.finalBalance > 0
                                            ? "bg-gradient-to-r from-emerald-600 to-teal-500 hover:scale-105"
                                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    )}
                                >
                                    {submitting ? 'Processando...' : (
                                        <>
                                            <CheckCircle2 className="mr-2 h-6 w-6" />
                                            Zerar Mês e Pagar
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Section */}
                    {/* Approved Expenses (Awaiting Reimbursement) */}
                    {approvedExpenses.length > 0 && (
                        <div className="space-y-4 mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                                    <Receipt className="h-5 w-5" />
                                    💰 Despesas Aprovadas - Escolha Como Reembolsar
                                </h3>
                                <p className="text-sm text-slate-500 mt-1 bg-blue-50 p-2 rounded-lg">
                                    Estas despesas foram pagas do bolso do técnico. Escolha como devolver:
                                    <br />
                                    • <strong>PIX/Dinheiro:</strong> Você devolve diretamente ao técnico (não entra no saldo)
                                    <br />
                                    • <strong>Adicionar ao Saldo:</strong> O valor entra no próximo pagamento junto com as comissões
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {approvedExpenses.map(exp => (
                                    <div key={exp.id} className="bg-white rounded-xl p-4 border border-blue-200 shadow-lg shadow-blue-100/50 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-800">{exp.descricao}</h4>
                                                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                                    {formatCurrency(exp.valor)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 mb-2 flex gap-2">
                                                <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span className="uppercase">{exp.categoria}</span>
                                            </div>
                                            {exp.comprovante_url && (
                                                <a
                                                    href={exp.comprovante_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-3"
                                                >
                                                    📎 Ver Comprovante
                                                </a>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs text-slate-400 text-center font-medium">Como você vai reembolsar?</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                                    onClick={() => handleAuthorize(exp.id, 'direct')}
                                                >
                                                    💳 PIX
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                                                    onClick={() => handleAuthorize(exp.id, 'direct')}
                                                >
                                                    💵 Dinheiro
                                                </Button>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 text-xs"
                                                onClick={() => handleAuthorize(exp.id, 'balance')}
                                            >
                                                📊 Adicionar ao Saldo
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending Expenses Section - Separated by Payment Type */}
                    {pendingExpenses.length > 0 && (
                        <div className="space-y-4 mb-6">
                            <h3 className="text-xl font-bold text-amber-600 flex items-center gap-2">
                                <Receipt className="h-5 w-5" />
                                Despesas Pendentes de Aprovação
                            </h3>

                            <div className="grid gap-6 md:grid-cols-2">
                                {/* COLUNA ESQUERDA - Gastos com Cartão/Dinheiro da Empresa */}
                                <div className="space-y-3">
                                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                        <h4 className="font-bold text-emerald-700 flex items-center gap-2">
                                            💳 Pago com Cartão/Dinheiro da Empresa
                                        </h4>
                                        <p className="text-xs text-emerald-600 mt-1">
                                            O técnico usou o cartão corporativo ou dinheiro adiantado.
                                            Apenas aprove para registrar o gasto.
                                        </p>
                                    </div>
                                    {pendingExpenses.filter(exp => exp.origem_pagamento !== 'proprio').map(exp => (
                                        <div key={exp.id} className="bg-white rounded-xl p-4 border border-emerald-200 shadow-md flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-slate-800">{exp.descricao}</h4>
                                                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                                        {formatCurrency(exp.valor)}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 mb-2 flex flex-wrap gap-2">
                                                    <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span className="uppercase">{exp.categoria}</span>
                                                </div>
                                                {exp.comprovante_url && (
                                                    <a href={exp.comprovante_url} target="_blank" rel="noopener noreferrer"
                                                        className="text-xs text-emerald-600 hover:underline flex items-center gap-1 mb-3">
                                                        📎 Ver Comprovante
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex gap-2 mt-auto">
                                                <Button size="sm" variant="outline"
                                                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => handleApproveDecline(exp.id, 'rejeitado')}>
                                                    ❌ Rejeitar
                                                </Button>
                                                <Button size="sm"
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    onClick={() => handleApproveDecline(exp.id, 'aprovado')}>
                                                    ✅ Aprovar
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {pendingExpenses.filter(exp => exp.origem_pagamento !== 'proprio').length === 0 && (
                                        <div className="text-center text-slate-400 py-4 text-sm">
                                            Nenhuma despesa com cartão da empresa
                                        </div>
                                    )}
                                </div>

                                {/* COLUNA DIREITA - Gastos do Bolso do Técnico (Reembolso) */}
                                <div className="space-y-3">
                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                        <h4 className="font-bold text-blue-700 flex items-center gap-2">
                                            💰 Pago do Bolso do Técnico
                                        </h4>
                                        <p className="text-xs text-blue-600 mt-1">
                                            O técnico pagou com seu próprio dinheiro/cartão.
                                            Após aprovar, escolha como devolver: PIX, Dinheiro ou Saldo.
                                        </p>
                                    </div>
                                    {pendingExpenses.filter(exp => exp.origem_pagamento === 'proprio').map(exp => (
                                        <div key={exp.id} className="bg-white rounded-xl p-4 border border-blue-200 shadow-md flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-slate-800">{exp.descricao}</h4>
                                                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                                        {formatCurrency(exp.valor)}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 mb-2 flex flex-wrap gap-2">
                                                    <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span className="uppercase">{exp.categoria}</span>
                                                </div>
                                                {exp.comprovante_url && (
                                                    <a href={exp.comprovante_url} target="_blank" rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-3">
                                                        📎 Ver Comprovante
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex gap-2 mt-auto">
                                                <Button size="sm" variant="outline"
                                                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => handleApproveDecline(exp.id, 'rejeitado')}>
                                                    ❌ Rejeitar
                                                </Button>
                                                <Button size="sm"
                                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={() => handleApproveDecline(exp.id, 'aprovado')}>
                                                    ✅ Aprovar
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {pendingExpenses.filter(exp => exp.origem_pagamento === 'proprio').length === 0 && (
                                        <div className="text-center text-slate-400 py-4 text-sm">
                                            Nenhuma despesa para reembolso
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {balance.osIds.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                                <Receipt className="h-5 w-5" />
                                Detalhamento de Serviços
                            </h3>

                            {/* Mobile View: Cards */}
                            <div className="md:hidden space-y-3">
                                {balance.osDetails && balance.osDetails.length > 0 ? (
                                    balance.osDetails.map((os) => (
                                        <div key={os.id} className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col gap-2">
                                            <div className="flex justify-between items-start">
                                                <span className="font-bold text-emerald-900 text-sm">{os.cliente_nome || 'Cliente não identificado'}</span>
                                                <span className="text-xs text-slate-500 font-medium">{new Date(os.created_at || new Date()).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <div className="text-sm text-slate-600 border-l-2 border-emerald-200 pl-2 my-1">
                                                {os.descricao_servico || 'Serviço padrão'}
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-emerald-50">
                                                <div className="text-xs text-slate-400">Total: {formatCurrency(os.valor_total)}</div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] uppercase text-emerald-600 font-bold tracking-wider">Comissão</span>
                                                    <span className="text-base font-black text-emerald-600">{formatCurrency(os.commissionValue)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-400 text-sm">Nenhum serviço este mês.</div>
                                )}
                            </div>

                            {/* Desktop View: Table */}
                            <div className="hidden md:block bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm overflow-hidden">
                                <div className="max-h-96 overflow-y-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-emerald-900/5 text-emerald-900 sticky top-0 backdrop-blur-sm">
                                            <tr>
                                                <th className="p-4 font-bold">Data</th>
                                                <th className="p-4 font-bold">Cliente</th>
                                                <th className="p-4 font-bold">Serviço/Detalhes</th>
                                                <th className="p-4 font-bold">Valor OS</th>
                                                <th className="p-4 font-bold text-right">Comissão</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-emerald-900/5">
                                            {balance.osDetails && balance.osDetails.length > 0 ? (
                                                balance.osDetails.map((os) => (
                                                    <tr key={os.id} className="hover:bg-emerald-50/50 transition-colors">
                                                        <td className="p-4 text-slate-600">{new Date(os.created_at || new Date()).toLocaleDateString('pt-BR')}</td>
                                                        <td className="p-4 font-medium text-emerald-900">{os.cliente_nome || 'Cliente não identificado'}</td>
                                                        <td className="p-4 text-slate-600 max-w-xs truncate">
                                                            <span className="font-medium text-slate-900 block">{os.descricao_servico || 'Serviço padrão'}</span>
                                                            <span className="text-xs text-slate-400">Responsável: {balance.technicianName}</span>
                                                        </td>
                                                        <td className="p-4 text-slate-600">{formatCurrency(os.valor_total)}</td>
                                                        <td className="p-4 text-right font-bold text-emerald-600">{formatCurrency(os.commissionValue)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                        Nenhum detalhe disponível.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {balance.expenseDetails && balance.expenseDetails.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                                <TrendingDown className="h-5 w-5 text-red-500" />
                                Detalhamento de Despesas (Reembolso)
                            </h3>

                            {/* Mobile View: Cards */}
                            <div className="md:hidden space-y-3">
                                {balance.expenseDetails.map((exp) => (
                                    <div key={exp.id} className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-red-100 shadow-sm flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide">
                                                {exp.categoria || 'Geral'}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium ml-2">{new Date(exp.created_at || new Date()).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <div className="font-medium text-slate-800 text-sm">
                                            {exp.descricao || 'Sem descrição'}
                                        </div>
                                        <div className="border-t border-red-50 pt-2 flex justify-end">
                                            <span className="text-base font-bold text-red-600">{formatCurrency(Number(exp.valor))}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop View: Table */}
                            <div className="hidden md:block bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm overflow-hidden">
                                <div className="max-h-96 overflow-y-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-red-900/5 text-red-900 sticky top-0 backdrop-blur-sm">
                                            <tr>
                                                <th className="p-4 font-bold">Data</th>
                                                <th className="p-4 font-bold">Descrição</th>
                                                <th className="p-4 font-bold">Categoria</th>
                                                <th className="p-4 font-bold text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-red-900/5">
                                            {balance.expenseDetails.map((exp) => (
                                                <tr key={exp.id} className="hover:bg-red-50/50 transition-colors">
                                                    <td className="p-4 text-slate-600">{new Date(exp.created_at || new Date()).toLocaleDateString('pt-BR')}</td>
                                                    <td className="p-4 font-medium text-slate-900">{exp.descricao || 'Sem descrição'}</td>
                                                    <td className="p-4 text-slate-600">
                                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs">
                                                            {exp.categoria || 'Geral'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-red-600">{formatCurrency(Number(exp.valor))}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <DollarSign className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Selecione um técnico para visualizar o fechamento</p>
                </div>
            )}

            {/* Advance Dialog */}
            <Dialog open={isAdvanceDialogOpen} onOpenChange={setIsAdvanceDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Banknote className="h-6 w-6 text-amber-600" />
                            Dar Adiantamento
                        </DialogTitle>
                        <DialogDescription>
                            Registrar um adiantamento para <strong>{balance?.technicianName || 'o técnico selecionado'}</strong>.
                            Este valor será descontado no próximo fechamento.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="advanceValue">Valor (R$)</Label>
                            <Input
                                id="advanceValue"
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                className="h-14 text-2xl font-bold text-center bg-amber-50 border-amber-200 focus:ring-amber-500"
                                value={advanceValue}
                                onChange={(e) => setAdvanceValue(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="advanceNote">Observação (opcional)</Label>
                            <Input
                                id="advanceNote"
                                placeholder="Ex: Adiantamento semanal"
                                className="bg-slate-50"
                                value={advanceNote}
                                onChange={(e) => setAdvanceNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsAdvanceDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={handleGiveAdvance}
                            disabled={advanceSubmitting || !advanceValue}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {advanceSubmitting ? 'Registrando...' : 'Confirmar Adiantamento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

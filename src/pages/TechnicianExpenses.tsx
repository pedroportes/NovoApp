import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Receipt, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Expense {
    id: string
    descricao: string
    valor: number
    status: 'pendente' | 'aprovado' | 'rejeitado'
    data_despesa?: string
    created_at?: string
    categoria?: string
    comprovante_url?: string
    origem_pagamento?: 'empresa' | 'proprio'
}

type ExpenseCategory = 'combustivel' | 'alimentacao' | 'material' | 'outros'

export function TechnicianExpenses() {
    const { userData } = useAuth()
    const navigate = useNavigate()
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [descricao, setDescricao] = useState('')
    const [valor, setValor] = useState('')
    const [categoria, setCategoria] = useState<ExpenseCategory>('combustivel')

    const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)
    const [origemPagamento, setOrigemPagamento] = useState<'empresa' | 'proprio'>('empresa')

    useEffect(() => {
        if (userData?.id) {
            fetchExpenses()
        }
    }, [userData?.id])

    const fetchExpenses = async () => {
        try {
            const { data, error } = await supabase
                .from('despesas_tecnicos')
                .select('*')
                .eq('tecnico_id', userData!.id)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Erro ao buscar despesas:', error)
                setExpenses([])
            } else {
                setExpenses(data || [])
            }
        } catch (error) {
            console.error('Erro ao buscar despesas:', error)
            setExpenses([])
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setComprovanteFile(e.target.files[0])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!descricao || !valor) return

        setSubmitting(true)

        try {
            let comprovanteUrl = null

            if (comprovanteFile) {
                const fileExt = comprovanteFile.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `despesas/${userData!.id}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('comprovantes')
                    .upload(filePath, comprovanteFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('comprovantes')
                    .getPublicUrl(filePath)

                comprovanteUrl = publicUrl
            }

            const { error } = await supabase
                .from('despesas_tecnicos')
                .insert({
                    tecnico_id: userData!.id,
                    empresa_id: userData!.empresa_id,
                    descricao,
                    valor: parseFloat(valor.replace(',', '.')),
                    categoria,
                    origem_pagamento: origemPagamento,
                    comprovante_url: comprovanteUrl,
                    status: 'pendente'
                })

            if (error) throw error

            // Reset form and refresh
            setDescricao('')
            setValor('')
            setCategoria('combustivel')
            setOrigemPagamento('empresa')
            setComprovanteFile(null)
            setShowForm(false)
            fetchExpenses()
        } catch (error) {
            console.error('Erro ao salvar despesa:', error)
            alert('Erro ao salvar despesa. Tente novamente.')
        } finally {
            setSubmitting(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'aprovado':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        <CheckCircle className="h-3 w-3" /> Aprovado
                    </span>
                )
            case 'rejeitado':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        <XCircle className="h-3 w-3" /> Rejeitado
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <Clock className="h-3 w-3" /> Pendente
                    </span>
                )
        }
    }

    const getCategoryLabel = (cat: string) => {
        const labels: Record<string, string> = {
            'combustivel': 'Combustível',
            'alimentacao': 'Alimentação',
            'material': 'Material',
            'outros': 'Outros'
        }
        return labels[cat] || cat
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    const totals = expenses.reduce((acc, exp) => {
        acc.total += exp.valor
        if (exp.status === 'pendente') acc.pendente += exp.valor
        if (exp.status === 'aprovado') acc.aprovado += exp.valor
        return acc
    }, { total: 0, pendente: 0, aprovado: 0 })

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 space-y-6">
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
                    <h1 className="text-2xl font-bold text-slate-900">Meus Gastos</h1>
                    <p className="text-sm text-slate-500">Registre e acompanhe suas despesas</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="bg-white/70 backdrop-blur border-amber-100">
                    <CardContent className="p-4">
                        <p className="text-xs text-amber-600 font-medium uppercase">Pendente</p>
                        <p className="text-lg font-bold text-amber-700">{formatCurrency(totals.pendente)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/70 backdrop-blur border-emerald-100">
                    <CardContent className="p-4">
                        <p className="text-xs text-emerald-600 font-medium uppercase">Aprovado</p>
                        <p className="text-lg font-bold text-emerald-700">{formatCurrency(totals.aprovado)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/70 backdrop-blur border-slate-100">
                    <CardContent className="p-4">
                        <p className="text-xs text-slate-600 font-medium uppercase">Total</p>
                        <p className="text-lg font-bold text-slate-700">{formatCurrency(totals.total)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* New Expense Form */}
            {showForm ? (
                <Card className="bg-white/90 backdrop-blur shadow-xl border-0 animate-in slide-in-from-bottom-4">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Nova Despesa</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Descrição</label>
                                <Input
                                    placeholder="Ex: Combustível para visita"
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Valor (R$)</label>
                                <Input
                                    placeholder="0,00"
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Origem do Pagamento */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Quem pagou essa despesa?</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setOrigemPagamento('empresa')}
                                        className={cn(
                                            "p-3 rounded-lg border-2 text-sm font-medium transition-all text-center",
                                            origemPagamento === 'empresa'
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                        )}
                                    >
                                        💳 Cartão/Dinheiro da Empresa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrigemPagamento('proprio')}
                                        className={cn(
                                            "p-3 rounded-lg border-2 text-sm font-medium transition-all text-center",
                                            origemPagamento === 'proprio'
                                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                        )}
                                    >
                                        💰 Paguei do Meu Bolso
                                    </button>
                                </div>
                                {/* Texto explicativo */}
                                <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg">
                                    {origemPagamento === 'empresa' ? (
                                        <>📋 <strong>Empresa:</strong> Você usou o cartão corporativo ou dinheiro que o admin te deu de manhã para os gastos do dia.</>
                                    ) : (
                                        <>💵 <strong>Meu Bolso:</strong> Você pagou com seu próprio dinheiro/cartão. O admin vai te reembolsar via PIX ou em espécie após aprovar.</>
                                    )}
                                </p>
                            </div>

                            {/* Upload de Comprovante */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">📸 Comprovante / Nota Fiscal</label>
                                <Input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    📎 Tire uma foto do cupom fiscal como prova do gasto. O admin poderá visualizar.
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Categoria</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['combustivel', 'alimentacao', 'material', 'outros'] as ExpenseCategory[]).map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setCategoria(cat)}
                                            className={cn(
                                                "p-3 rounded-xl border-2 text-sm font-medium transition-all",
                                                categoria === cat
                                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            )}
                                        >
                                            {getCategoryLabel(cat)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                                    ) : (
                                        'Salvar Despesa'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <Button
                    onClick={() => setShowForm(true)}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-200"
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Adicionar Despesa
                </Button>
            )}

            {/* Expenses List */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-800 px-1">Histórico</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                ) : expenses.length === 0 ? (
                    <Card className="bg-white/70 backdrop-blur border-dashed border-2 border-slate-200">
                        <CardContent className="p-8 text-center">
                            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">Nenhuma despesa registrada</p>
                            <p className="text-sm text-slate-400">Clique em "Adicionar Despesa" para começar</p>
                        </CardContent>
                    </Card>
                ) : (
                    expenses.map((expense) => (
                        <Card key={expense.id} className="bg-white/80 backdrop-blur hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-800">{expense.descricao}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-400">
                                                {(expense.data_despesa || expense.created_at) && format(new Date(expense.data_despesa || expense.created_at!), "dd/MM/yyyy", { locale: ptBR })}
                                            </span>
                                            {expense.categoria && (
                                                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                                    {getCategoryLabel(expense.categoria)}
                                                </span>
                                            )}
                                            {/* Pagamento Badge */}
                                            {expense.origem_pagamento === 'proprio' ? (
                                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                                    Reembolso
                                                </span>
                                            ) : (
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                                    Empresa
                                                </span>
                                            )}
                                        </div>
                                        {/* Link do comprovante se existir */}
                                        {expense.comprovante_url && (
                                            <div className="mt-2">
                                                <a
                                                    href={expense.comprovante_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                                                >
                                                    <Receipt className="w-3 h-3" /> Ver Comprovante
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-800">{formatCurrency(expense.valor)}</p>
                                        <div className="mt-1">
                                            {getStatusBadge(expense.status)}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}

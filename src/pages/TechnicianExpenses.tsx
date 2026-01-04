import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Receipt, CheckCircle, Clock, XCircle, Loader2, Calendar, Car, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Expense {
    id: string
    descricao: string
    valor: number
    status: 'pendente' | 'aprovado' | 'rejeitado' | 'pago'
    status_aprovacao?: 'pendente' | 'aprovado' | 'rejeitado'
    data_despesa?: string
    data_gasto?: string
    created_at?: string
    categoria?: string
    comprovante_url?: string
    origem_pagamento?: 'empresa' | 'proprio'
    placa_carro?: string
}

type ExpenseCategory = 'combustivel' | 'alimentacao' | 'material' | 'manutencao_veiculo' | 'outros'

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
    const [dataGasto, setDataGasto] = useState(new Date().toISOString().split('T')[0])
    const [placaCarro, setPlacaCarro] = useState('')

    // Vehicles state
    const [vehicles, setVehicles] = useState<any[]>([])
    const [loadingVehicles, setLoadingVehicles] = useState(false)

    const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)
    const [origemPagamento, setOrigemPagamento] = useState<'empresa' | 'proprio'>('empresa')
    const [analyzing, setAnalyzing] = useState(false)

    // Helper to convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = error => reject(error)
        })
    }

    // Compression Helper
    const compressImage = async (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (event) => {
                const img = new Image()
                img.src = event.target?.result as string
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')

                    // Max dimensions
                    const MAX_WIDTH = 800
                    const MAX_HEIGHT = 800
                    let width = img.width
                    let height = img.height

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width
                            width = MAX_WIDTH
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height
                            height = MAX_HEIGHT
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    ctx?.drawImage(img, 0, 0, width, height)

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            })
                            resolve(newFile)
                        } else {
                            reject(new Error('Canvas to Blob failed'))
                        }
                    }, 'image/jpeg', 0.7) // 70% quality, JPEG
                }
            }
            reader.onerror = (error) => reject(error)
        })
    }

    const analyzeReceipt = async (file: File) => {
        setAnalyzing(true)
        try {
            const base64 = await fileToBase64(file)

            const { data, error } = await supabase.functions.invoke('analyze-receipt', {
                body: { image: base64 }
            })

            if (error) throw error

            if (data) {
                if (data.descricao) setDescricao(data.descricao)
                if (data.valor) setValor(data.valor.replace('.', ','))
                if (data.categoria) {
                    // Map generic categories to our specific ones
                    let cat = data.categoria.toLowerCase()
                    if (cat.includes('manutencao') || cat.includes('conserto') || cat.includes('oficina')) {
                        setCategoria('manutencao_veiculo')
                    } else if (['combustivel', 'alimentacao', 'material', 'outros'].includes(cat)) {
                        setCategoria(cat as ExpenseCategory)
                    } else {
                        setCategoria('outros')
                    }
                }

                toast.success('Comprovante analisado pela IA!', {
                    description: 'Dados preenchidos automaticamente.'
                })
            }

        } catch (error) {
            console.error('Erro na análise IA:', error)
            toast.error('Erro ao analisar imagem', {
                description: 'Preencha os dados manualmente.'
            })
        } finally {
            setAnalyzing(false)
        }
    }

    useEffect(() => {
        if (userData?.id) {
            fetchExpenses()
            if (userData.empresa_id) {
                fetchVehicles()
            }
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const originalFile = e.target.files[0]

            // Compress before set and analyze
            toast.promise(
                async () => {
                    const compressed = await compressImage(originalFile)
                    setComprovanteFile(compressed)
                    analyzeReceipt(compressed)
                    return 'Imagem otimizada para envio!'
                },
                {
                    loading: 'Otimizando imagem...',
                    success: 'Imagem pronta!',
                    error: 'Erro ao otimizar imagem'
                }
            )
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!descricao || !valor) {
            toast.error('Preencha descrição e valor')
            return
        }

        if ((categoria === 'combustivel' || categoria === 'manutencao_veiculo') && !placaCarro) {
            toast.error('Selecione um veículo para esta categoria')
            return
        }

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
                    status: 'pendente',
                    status_aprovacao: 'pendente',
                    data_gasto: dataGasto,
                    placa_carro: placaCarro || null,
                    tipo_despesa: categoria === 'manutencao_veiculo' ? 'manutencao' : 'outros'
                })

            if (error) throw error

            // Reset form and refresh
            setDescricao('')
            setValor('')
            setCategoria('combustivel')
            setOrigemPagamento('empresa')
            setComprovanteFile(null)
            setPlacaCarro('')
            setDataGasto(new Date().toISOString().split('T')[0])
            setShowForm(false)
            fetchExpenses()
            toast.success('Despesa registrada com sucesso!')
        } catch (error) {
            console.error('Erro ao salvar despesa:', error)
            toast.error('Erro ao salvar despesa. Tente novamente.')
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
            'manutencao_veiculo': 'Manutenção Veículo',
            'outros': 'Outros'
        }
        return labels[cat] || cat
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    const totals = expenses.reduce((acc, exp) => {
        acc.total += exp.valor
        if (exp.status_aprovacao === 'pendente' || exp.status === 'pendente') acc.pendente += exp.valor
        if (exp.origem_pagamento === 'proprio' && exp.status_aprovacao === 'aprovado' && exp.status !== 'pago') acc.reembolso += exp.valor
        return acc
    }, { total: 0, pendente: 0, reembolso: 0 })

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6 mt-6 md:mt-0">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="rounded-full hover:bg-slate-200"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-700" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Meus Gastos</h1>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card className="bg-amber-50 border-amber-100 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-medium text-amber-700 uppercase tracking-wider">Aguardando Aprovação</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-amber-900">{formatCurrency(totals.pendente)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-medium text-blue-700 uppercase tracking-wider">A Receber (Reembolso)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-blue-900">{formatCurrency(totals.reembolso)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm hidden md:block">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-medium text-slate-700 uppercase tracking-wider">Total Histórico</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(totals.total)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* New Expense Form */}
            {showForm ? (
                <Card className="bg-white shadow-lg border-0 animate-in slide-in-from-bottom-4">
                    <CardHeader className="pb-4 border-b border-slate-100">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-emerald-600" />
                            Nova Despesa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Upload Area */}
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-center group icon-upload">
                                <input
                                    type="file"
                                    id="receipt-upload"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label htmlFor="receipt-upload" className="cursor-pointer block w-full h-full">
                                    {analyzing ? (
                                        <div className="flex flex-col items-center justify-center py-4">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
                                            <p className="text-sm font-medium text-emerald-700">Analisando comprovante...</p>
                                        </div>
                                    ) : comprovanteFile ? (
                                        <div className="flex flex-col items-center justify-center py-2">
                                            <CheckCircle className="h-8 w-8 text-emerald-600 mb-2" />
                                            <p className="text-sm font-medium text-slate-900">{comprovanteFile.name}</p>
                                            <p className="text-xs text-emerald-600">Comprovante anexado!</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-4">
                                            <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                                <Receipt className="h-6 w-6 text-slate-400 group-hover:text-emerald-600" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">Toque p/ tirar foto do comprovante</p>
                                            <p className="text-xs text-slate-400 mt-1">A IA preencherá os dados automaticamente</p>
                                        </div>
                                    )}
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Data</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="date"
                                            className="pl-9"
                                            value={dataGasto}
                                            onChange={e => setDataGasto(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Valor (R$)</Label>
                                    <Input
                                        placeholder="0,00"
                                        className="text-right font-medium"
                                        value={valor}
                                        onChange={(e) => setValor(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input
                                    placeholder="Ex: Almoço, Combustível, Peça..."
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['combustivel', 'alimentacao', 'material', 'manutencao_veiculo', 'outros'] as ExpenseCategory[]).map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setCategoria(cat)}
                                            className={cn(
                                                "p-3 rounded-xl border text-sm font-medium transition-all",
                                                categoria === cat
                                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            {getCategoryLabel(cat)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Vehicle Selection - Conditional */}
                            {(categoria === 'combustivel' || categoria === 'manutencao_veiculo') && (
                                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in">
                                    <Label className="flex items-center gap-2">
                                        <Car className="h-4 w-4 text-slate-500" />
                                        Selecione o Veículo
                                    </Label>
                                    <Select
                                        value={placaCarro}
                                        onValueChange={setPlacaCarro}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Qual carro?" />
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
                                        </SelectContent>
                                    </Select>
                                    {!placaCarro && (
                                        <p className="text-xs text-amber-600 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" /> Obrigatório informar o veículo
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <Label>Quem pagou?</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setOrigemPagamento('empresa')}
                                        className={cn(
                                            "p-4 rounded-xl border text-sm font-medium transition-all text-center flex flex-col items-center gap-2",
                                            origemPagamento === 'empresa'
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="bg-white p-2 rounded-full shadow-sm">💳</div>
                                        Empresa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrigemPagamento('proprio')}
                                        className={cn(
                                            "p-4 rounded-xl border text-sm font-medium transition-all text-center flex flex-col items-center gap-2",
                                            origemPagamento === 'proprio'
                                                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="bg-white p-2 rounded-full shadow-sm">💰</div>
                                        Reembolso (Meu Bolso)
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-12"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 shadow-lg shadow-emerald-200"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                                    ) : (
                                        'Confirmar Despesa'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <Button
                    onClick={() => setShowForm(true)}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-lg shadow-emerald-200 text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="mr-2 h-6 w-6" />
                    Adicionar Nova Despesa
                </Button>
            )}

            {/* Expenses List */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 px-1">Últimos Lançamentos</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                ) : expenses.length === 0 ? (
                    <Card className="bg-slate-50 border-dashed border-2 border-slate-200 shadow-none">
                        <CardContent className="p-8 text-center">
                            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Nenhuma despesa registrada</p>
                            <p className="text-sm text-slate-400">Toque no botão verde para começar</p>
                        </CardContent>
                    </Card>
                ) : (
                    expenses.map((expense) => (
                        <Card key={expense.id} className="bg-white hover:shadow-md transition-shadow border-slate-100">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-1">
                                        <p className="font-bold text-slate-800 line-clamp-1">{expense.descricao}</p>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {(expense.data_gasto || expense.data_despesa || expense.created_at) && format(new Date(expense.data_gasto || expense.data_despesa || expense.created_at!), "dd/MM", { locale: ptBR })}
                                            </span>

                                            {expense.placa_carro && (
                                                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono border border-slate-200">
                                                    {expense.placa_carro}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {expense.categoria && (
                                                <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                                                    {getCategoryLabel(expense.categoria)}
                                                </span>
                                            )}
                                            {expense.origem_pagamento === 'proprio' && (
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-100">
                                                    Reembolso
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right flex flex-col items-end gap-1">
                                        <p className="font-bold text-slate-900 text-lg">{formatCurrency(expense.valor)}</p>
                                        {getStatusBadge(expense.status_aprovacao || expense.status)}

                                        {expense.comprovante_url && (
                                            <a
                                                href={expense.comprovante_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                            >
                                                <Receipt className="w-4 h-4" />
                                            </a>
                                        )}
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

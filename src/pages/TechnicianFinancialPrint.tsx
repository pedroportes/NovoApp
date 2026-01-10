import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { financialService, TechnicianBalance } from '@/services/financialService'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, FileText } from 'lucide-react'

export function TechnicianFinancialPrint() {
    const { userData } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [balance, setBalance] = useState<TechnicianBalance | null>(null)
    const [history, setHistory] = useState<{ monthlyEarnings: any[], topServices: any[] } | null>(null)

    useEffect(() => {
        if (userData?.id) {
            loadData()
        }
    }, [userData?.id])

    const loadData = async () => {
        setLoading(true)
        try {
            const [balanceData, historyData] = await Promise.all([
                financialService.getTechnicianBalance(userData!.id),
                financialService.getTechnicianHistory(userData!.id)
            ])
            setBalance(balanceData)
            setHistory(historyData)
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    const today = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })

    return (
        <div className="min-h-screen bg-white">
            {/* Header - Só aparece na tela, não imprime */}
            <div className="print:hidden bg-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
                <Button variant="ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
                <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700">
                    <FileText className="h-4 w-4 mr-2" />
                    Baixar PDF
                </Button>
            </div>

            {/* Conteúdo do Extrato */}
            <div className="max-w-2xl mx-auto p-8 print:p-4">
                {/* Cabeçalho */}
                <div className="text-center border-b-2 border-emerald-600 pb-4 mb-6">
                    <h1 className="text-2xl font-bold text-emerald-800">FlowDrain</h1>
                    <h2 className="text-lg font-semibold text-slate-700 mt-2">Extrato Financeiro do Técnico</h2>
                    <p className="text-sm text-slate-500 mt-1">{today}</p>
                </div>

                {/* Dados do Técnico */}
                <div className="bg-slate-50 rounded-lg p-4 mb-6 print:bg-gray-100">
                    <p className="text-sm text-slate-600">
                        <strong>Técnico:</strong> {balance?.technicianName || userData?.nome || 'Nome não disponível'}
                    </p>
                </div>

                {/* Resumo Financeiro */}
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">📊 Resumo Financeiro</h3>
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b">
                                <td className="py-2 text-slate-600">Comissões (serviços finalizados)</td>
                                <td className="py-2 text-right font-semibold text-emerald-600">
                                    + {formatCurrency(balance?.totalCommission || 0)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 text-slate-600">Reembolsos aprovados</td>
                                <td className="py-2 text-right font-semibold text-blue-600">
                                    + {formatCurrency(balance?.totalReimbursements || 0)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 text-slate-600">Bônus</td>
                                <td className="py-2 text-right font-semibold text-purple-600">
                                    + {formatCurrency(balance?.totalBonus || 0)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 text-slate-600">Adiantamentos (desconto)</td>
                                <td className="py-2 text-right font-semibold text-red-600">
                                    - {formatCurrency(balance?.totalAdvances || 0)}
                                </td>
                            </tr>
                            <tr className="bg-emerald-50 print:bg-gray-200">
                                <td className="py-3 font-bold text-slate-800">SALDO A RECEBER</td>
                                <td className="py-3 text-right font-bold text-xl text-emerald-700">
                                    {formatCurrency(balance?.finalBalance || 0)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Detalhamento dos Serviços */}
                {balance?.osDetails && balance.osDetails.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">
                            📋 Serviços com Comissão ({balance.osCount})
                        </h3>
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 print:bg-gray-200">
                                <tr>
                                    <th className="py-2 px-2 text-left">Cliente</th>
                                    <th className="py-2 px-2 text-left">Serviço</th>
                                    <th className="py-2 px-2 text-right">Valor OS</th>
                                    <th className="py-2 px-2 text-right">Comissão</th>
                                </tr>
                            </thead>
                            <tbody>
                                {balance.osDetails.map((os, index) => (
                                    <tr key={os.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                        <td className="py-2 px-2">{os.cliente_nome || 'Cliente'}</td>
                                        <td className="py-2 px-2 text-slate-600 truncate max-w-[150px]">
                                            {os.descricao_servico || 'Serviço'}
                                        </td>
                                        <td className="py-2 px-2 text-right">{formatCurrency(os.valor_total || 0)}</td>
                                        <td className="py-2 px-2 text-right font-semibold text-emerald-600">
                                            {formatCurrency(os.commissionValue || 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Histórico Recente e Top Serviços */}
                {history && (
                    <div className="grid grid-cols-2 gap-8 mb-6 break-inside-avoid">
                        {/* Rendimentos Mensais */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">📅 Últimos 6 Meses</h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 print:bg-gray-200">
                                        <th className="py-2 px-2 text-left">Mês</th>
                                        <th className="py-2 px-2 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.monthlyEarnings.length > 0 ? (
                                        history.monthlyEarnings.map((item, idx) => (
                                            <tr key={idx} className="border-b last:border-0">
                                                <td className="py-2 px-2">{item.month}</td>
                                                <td className="py-2 px-2 text-right font-medium text-emerald-600">
                                                    {formatCurrency(item.value)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={2} className="py-2 text-center text-slate-400">Sem dados</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Top Serviços */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">⭐ Mais Realizados</h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 print:bg-gray-200">
                                        <th className="py-2 px-2 text-left">Serviço</th>
                                        <th className="py-2 px-2 text-right">Qtd</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.topServices.length > 0 ? (
                                        history.topServices.map((item, idx) => (
                                            <tr key={idx} className="border-b last:border-0">
                                                <td className="py-2 px-2 truncate max-w-[120px]">{item.name}</td>
                                                <td className="py-2 px-2 text-right font-medium text-slate-700">
                                                    {item.count}x
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={2} className="py-2 text-center text-slate-400">Sem dados</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Rodapé */}
                <div className="text-center text-xs text-slate-400 mt-8 pt-4 border-t">
                    <p>Documento gerado em {new Date().toLocaleString('pt-BR')}</p>
                    <p className="mt-1">FlowDrain - Sistema de Gestão</p>
                </div>
            </div>

            {/* CSS de Impressão */}
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print\\:hidden { display: none !important; }
                    .print\\:bg-gray-100 { background-color: #f3f4f6 !important; }
                    .print\\:bg-gray-200 { background-color: #e5e7eb !important; }
                    .print\\:p-4 { padding: 1rem !important; }
                }
            `}</style>
        </div>
    )
}

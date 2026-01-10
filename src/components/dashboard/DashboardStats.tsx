import { ArrowDownLeft, ArrowUpRight, DollarSign, Wallet, TrendingUp, Receipt } from 'lucide-react'

interface DashboardStatsProps {
    revenue: number
    receivables: number
    payables: number
    averageTicket: number
    monthlyGrowth?: number
}

export function DashboardStats({ revenue, receivables, payables, averageTicket, monthlyGrowth = 0 }: DashboardStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Revenue Card - Highlighted */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-2xl">
                        <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    {monthlyGrowth !== 0 && (
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${monthlyGrowth > 0 ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-100'}`}>
                            {monthlyGrowth > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                            {Math.abs(monthlyGrowth)}%
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <p className="text-emerald-100 text-sm font-medium">Faturamento (Este Mês)</p>
                    <h3 className="text-3xl font-bold tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue)}
                    </h3>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-emerald-100 opacity-80">
                    <TrendingUp className="h-3 w-3" />
                    <span>Atualizado em tempo real</span>
                </div>
            </div>

            {/* Ticket Médio Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-indigo-100 rounded-2xl">
                        <Receipt className="h-6 w-6 text-indigo-600" />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-slate-500 text-sm font-medium">Ticket Médio</p>
                    <h3 className="text-3xl font-bold tracking-tight text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageTicket)}
                    </h3>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                    Média por serviço concluído
                </div>
            </div>

            {/* Receivables Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-sky-100 rounded-2xl">
                        <Wallet className="h-6 w-6 text-sky-600" />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-slate-500 text-sm font-medium">A Receber (Pendentes)</p>
                    <h3 className="text-3xl font-bold tracking-tight text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receivables)}
                    </h3>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                    Comissões e OS pendentes
                </div>
            </div>

            {/* Payables Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-orange-100 rounded-2xl">
                        <ArrowDownLeft className="h-6 w-6 text-orange-600" />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-slate-500 text-sm font-medium">Contas a Pagar</p>
                    <h3 className="text-3xl font-bold tracking-tight text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payables)}
                    </h3>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                    Comissões e Despesas aprovadas
                </div>
            </div>
        </div>
    )
}

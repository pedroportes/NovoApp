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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Revenue Card */}
            <div className="bg-gradient-to-br from-white to-emerald-50/50 rounded-3xl p-6 shadow-xl shadow-emerald-500/10 border border-slate-100 border-t-4 border-t-emerald-500 relative overflow-hidden group hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                        <DollarSign className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-slate-500 text-sm font-medium">Faturamento</p>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue)}
                    </h3>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-emerald-600 font-bold">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>AO VIVO</span>
                </div>
            </div>

            {/* Ticket Médio Card */}
            <div className="bg-gradient-to-br from-white to-indigo-50/50 rounded-3xl p-6 shadow-xl shadow-indigo-500/10 border border-slate-100 border-t-4 border-t-indigo-500 relative overflow-hidden group hover:shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                        <Receipt className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-slate-500 text-sm font-medium">Ticket Médio</p>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageTicket)}
                    </h3>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                    Média por serviço concluído
                </div>
            </div>

            {/* Receivables Card */}
            <div className="bg-gradient-to-br from-white to-sky-50/50 rounded-3xl p-6 shadow-xl shadow-sky-500/10 border border-slate-100 border-t-4 border-t-sky-500 relative overflow-hidden group hover:shadow-sky-500/20 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-sky-500 rounded-2xl shadow-lg shadow-sky-500/30 group-hover:scale-110 transition-transform">
                        <Wallet className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-slate-500 text-sm font-medium">A Receber</p>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receivables)}
                    </h3>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                    Comissões e OS pendentes
                </div>
            </div>

            {/* Payables Card */}
            <div className="bg-gradient-to-br from-white to-orange-50/50 rounded-3xl p-6 shadow-xl shadow-orange-500/10 border border-slate-100 border-t-4 border-t-orange-500 relative overflow-hidden group hover:shadow-orange-500/20 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                        <ArrowDownLeft className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-slate-500 text-sm font-medium">Contas a Pagar</p>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payables)}
                    </h3>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                    Pendências aprovadas
                </div>
            </div>
        </div>
    )
}

import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, DollarSign, Wallet, TrendingUp, Receipt } from 'lucide-react'

interface DashboardStatsProps {
    revenue: number
    receivables: number
    payables: number
    averageTicket: number
    monthlyGrowth?: number
}

export function DashboardStats({ revenue, receivables, payables, averageTicket, monthlyGrowth = 0 }: DashboardStatsProps) {
    const navigate = useNavigate()
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Revenue Card */}
            <div
                onClick={() => navigate('/service-orders')}
                className="bg-emerald-600 rounded-3xl p-6 shadow-2xl shadow-emerald-500/40 relative overflow-hidden group hover:shadow-emerald-500/60 hover:-translate-y-2 transition-all duration-500 border border-emerald-500/20 cursor-pointer"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <DollarSign className="h-24 w-24 text-white" />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 group-hover:scale-110 transition-transform">
                        <DollarSign className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div className="space-y-1 relative z-10">
                    <p className="text-emerald-100 text-sm font-semibold tracking-wide uppercase">Faturamento</p>
                    <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue)}
                    </h3>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2 text-[10px] text-emerald-200 font-bold tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shadow-[0_0_8px_rgba(110,231,183,1)]" />
                        <span>RELATÓRIO EM TEMPO REAL</span>
                    </div>
                </div>
            </div>

            {/* Ticket Médio Card */}
            <div
                onClick={() => navigate('/service-orders')}
                className="bg-indigo-600 rounded-3xl p-6 shadow-2xl shadow-indigo-500/40 relative overflow-hidden group hover:shadow-indigo-500/60 hover:-translate-y-2 transition-all duration-500 border border-indigo-500/20 cursor-pointer"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Receipt className="h-24 w-24 text-white" />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 group-hover:scale-110 transition-transform">
                        <Receipt className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div className="space-y-1 relative z-10">
                    <p className="text-indigo-100 text-sm font-semibold tracking-wide uppercase">Ticket Médio</p>
                    <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageTicket)}
                    </h3>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
                    <p className="text-[10px] text-indigo-200 font-bold tracking-widest">MÉDIA POR SERVIÇO CONCLUÍDO</p>
                </div>
            </div>

            {/* Receivables Card */}
            <div
                onClick={() => navigate('/financial')}
                className="bg-sky-600 rounded-3xl p-6 shadow-2xl shadow-sky-500/40 relative overflow-hidden group hover:shadow-sky-500/60 hover:-translate-y-2 transition-all duration-500 border border-sky-500/20 cursor-pointer"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Wallet className="h-24 w-24 text-white" />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 group-hover:scale-110 transition-transform">
                        <Wallet className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div className="space-y-1 relative z-10">
                    <p className="text-sky-100 text-sm font-semibold tracking-wide uppercase">A Receber</p>
                    <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receivables)}
                    </h3>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
                    <p className="text-[10px] text-sky-200 font-bold tracking-widest uppercase">Comissões e OS pendentes</p>
                </div>
            </div>

            {/* Payables Card */}
            <div
                onClick={() => navigate('/financial')}
                className="bg-rose-600 rounded-3xl p-6 shadow-2xl shadow-rose-500/40 relative overflow-hidden group hover:shadow-rose-500/60 hover:-translate-y-2 transition-all duration-500 border border-rose-500/20 cursor-pointer"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <ArrowDownLeft className="h-24 w-24 text-white" />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 group-hover:scale-110 transition-transform">
                        <ArrowDownLeft className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div className="space-y-1 relative z-10">
                    <p className="text-rose-100 text-sm font-semibold tracking-wide uppercase">Contas a Pagar</p>
                    <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payables)}
                    </h3>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
                    <p className="text-[10px] text-rose-200 font-bold tracking-widest uppercase">Pendências aprovadas</p>
                </div>
            </div>
        </div>
    )
}

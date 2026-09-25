import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, DollarSign, Wallet, Receipt } from 'lucide-react'

export interface BrandBreakdownItem {
    id: string
    nome: string
    cor: string
    revenue: number
    count: number
}

interface DashboardStatsProps {
    revenue: number
    receivables: number
    payables: number
    averageTicket: number
    monthlyGrowth?: number
    brandBreakdown?: BrandBreakdownItem[]
    selectedBrandName?: string
    selectedBrandColor?: string
    isAllBrands?: boolean
}

export function DashboardStats({
    revenue,
    receivables,
    payables,
    averageTicket,
    brandBreakdown = [],
    selectedBrandName,
    selectedBrandColor,
    isAllBrands = true
}: DashboardStatsProps) {
    const navigate = useNavigate()

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const formatCompactCurrency = (val: number) => {
        if (val >= 1000) {
            return `R$ ${(val / 1000).toFixed(1).replace('.', ',')}k`
        }
        return `R$ ${val.toFixed(0)}`
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* 1. Revenue Card (Faturamento) */}
            <div
                onClick={() => navigate('/service-orders')}
                className="bg-emerald-600 rounded-3xl p-6 shadow-2xl shadow-emerald-500/40 relative overflow-hidden group hover:shadow-emerald-500/60 hover:-translate-y-2 transition-all duration-500 border border-emerald-500/20 cursor-pointer flex flex-col justify-between"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                    <DollarSign className="h-24 w-24 text-white" />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 group-hover:scale-110 transition-transform">
                            <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        {!isAllBrands && selectedBrandName && (
                            <span
                                className="px-2.5 py-1 rounded-full text-[11px] font-black text-white shadow-sm border border-white/30 flex items-center gap-1.5"
                                style={{ backgroundColor: selectedBrandColor || '#059669' }}
                            >
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                {selectedBrandName}
                            </span>
                        )}
                    </div>

                    <div className="space-y-1 relative z-10">
                        <p className="text-emerald-100 text-sm font-semibold tracking-wide uppercase">
                            {isAllBrands || !selectedBrandName ? 'Faturamento Total' : `Faturamento • ${selectedBrandName.replace('Desentupidora ', '')}`}
                        </p>
                        <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                            {formatCurrency(revenue)}
                        </h3>
                    </div>

                    {/* Breakdown por Empresa quando 'Todas as Marcas' ativo */}
                    {isAllBrands && brandBreakdown.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/15 space-y-1.5 relative z-10">
                            <div className="flex items-center justify-between text-[10px] text-emerald-100 font-bold uppercase tracking-wider">
                                <span>Por Empresa ({brandBreakdown.length})</span>
                                <span>OS</span>
                            </div>
                            <div className="space-y-1">
                                {brandBreakdown.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between text-xs text-white/95 bg-white/10 hover:bg-white/20 transition-colors rounded-lg px-2 py-1"
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span
                                                className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                                                style={{ backgroundColor: item.cor || '#ffffff' }}
                                            />
                                            <span className="truncate text-[11px] font-medium">
                                                {item.nome.replace('Desentupidora ', '')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 text-[11px]">
                                            <span className="font-bold">{formatCompactCurrency(item.revenue)}</span>
                                            <span className="text-[10px] text-emerald-200 bg-emerald-700/60 px-1 rounded font-semibold">
                                                {item.count}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2 text-[10px] text-emerald-200 font-bold tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shadow-[0_0_8px_rgba(110,231,183,1)]" />
                        <span>RELATÓRIO EM TEMPO REAL</span>
                    </div>
                </div>
            </div>

            {/* 2. Ticket Médio Card */}
            <div
                onClick={() => navigate('/service-orders')}
                className="bg-indigo-600 rounded-3xl p-6 shadow-2xl shadow-indigo-500/40 relative overflow-hidden group hover:shadow-indigo-500/60 hover:-translate-y-2 transition-all duration-500 border border-indigo-500/20 cursor-pointer flex flex-col justify-between"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                    <Receipt className="h-24 w-24 text-white" />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 group-hover:scale-110 transition-transform">
                            <Receipt className="h-6 w-6 text-white" />
                        </div>
                        {!isAllBrands && selectedBrandName && (
                            <span
                                className="px-2.5 py-1 rounded-full text-[11px] font-black text-white shadow-sm border border-white/30"
                                style={{ backgroundColor: selectedBrandColor || '#4f46e5' }}
                            >
                                {selectedBrandName.replace('Desentupidora ', '')}
                            </span>
                        )}
                    </div>

                    <div className="space-y-1 relative z-10">
                        <p className="text-indigo-100 text-sm font-semibold tracking-wide uppercase">Ticket Médio</p>
                        <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                            {formatCurrency(averageTicket)}
                        </h3>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
                    <p className="text-[10px] text-indigo-200 font-bold tracking-widest uppercase">
                        Média por serviço concluído
                    </p>
                </div>
            </div>

            {/* 3. Receivables Card (A Receber) */}
            <div
                onClick={() => navigate('/financial')}
                className="bg-sky-600 rounded-3xl p-6 shadow-2xl shadow-sky-500/40 relative overflow-hidden group hover:shadow-sky-500/60 hover:-translate-y-2 transition-all duration-500 border border-sky-500/20 cursor-pointer flex flex-col justify-between"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                    <Wallet className="h-24 w-24 text-white" />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 group-hover:scale-110 transition-transform">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                        {!isAllBrands && selectedBrandName && (
                            <span
                                className="px-2.5 py-1 rounded-full text-[11px] font-black text-white shadow-sm border border-white/30"
                                style={{ backgroundColor: selectedBrandColor || '#0284c7' }}
                            >
                                {selectedBrandName.replace('Desentupidora ', '')}
                            </span>
                        )}
                    </div>

                    <div className="space-y-1 relative z-10">
                        <p className="text-sky-100 text-sm font-semibold tracking-wide uppercase">A Receber</p>
                        <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                            {formatCurrency(receivables)}
                        </h3>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
                    <p className="text-[10px] text-sky-200 font-bold tracking-widest uppercase">
                        Comissões e OS pendentes
                    </p>
                </div>
            </div>

            {/* 4. Payables Card (Contas a Pagar) */}
            <div
                onClick={() => navigate('/financial')}
                className="bg-rose-600 rounded-3xl p-6 shadow-2xl shadow-rose-500/40 relative overflow-hidden group hover:shadow-rose-500/60 hover:-translate-y-2 transition-all duration-500 border border-rose-500/20 cursor-pointer flex flex-col justify-between"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                    <ArrowDownLeft className="h-24 w-24 text-white" />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 group-hover:scale-110 transition-transform">
                            <ArrowDownLeft className="h-6 w-6 text-white" />
                        </div>
                    </div>

                    <div className="space-y-1 relative z-10">
                        <p className="text-rose-100 text-sm font-semibold tracking-wide uppercase">Contas a Pagar</p>
                        <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                            {formatCurrency(payables)}
                        </h3>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
                    <p className="text-[10px] text-rose-200 font-bold tracking-widest uppercase">
                        Pendências aprovadas
                    </p>
                </div>
            </div>
        </div>
    )
}

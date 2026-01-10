import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { CheckCircle2, TrendingUp } from 'lucide-react'

interface TechnicianChartsProps {
    monthlyEarnings: { month: string; value: number }[]
    topServices: { name: string; count: number }[]
}

export function TechnicianCharts({ monthlyEarnings, topServices }: TechnicianChartsProps) {

    // Custom Tooltip for Chart
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-emerald-100 shadow-xl rounded-2xl">
                    <p className="text-xs font-bold text-slate-500 mb-1">{label}</p>
                    <p className="text-emerald-600 font-bold text-lg">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)}
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="grid md:grid-cols-2 gap-4 mt-6">
            {/* MONTHLY EARNINGS CHART */}
            <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-sm border border-emerald-50">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Seus Rendimentos</h3>
                        <p className="text-xs text-slate-500">Histórico de comissões (6 meses)</p>
                    </div>
                </div>

                <div className="h-52 w-full">
                    {monthlyEarnings.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyEarnings}>
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#ecfdf5' }} />
                                <Bar
                                    dataKey="value"
                                    fill="#10b981"
                                    radius={[4, 4, 0, 0]}
                                    barSize={30}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                            Sem dados suficientes
                        </div>
                    )}
                </div>
            </div>

            {/* TOP SERVICES LIST */}
            <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-sm border border-blue-50">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Serviços Mais Realizados</h3>
                        <p className="text-xs text-slate-500">O que você mais faz bem</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {topServices.length > 0 ? (
                        topServices.map((service, index) => (
                            <div key={index} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${index === 0 ? 'bg-amber-100 text-amber-600' :
                                            index === 1 ? 'bg-slate-100 text-slate-600' :
                                                index === 2 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'
                                        }`}>
                                        {index + 1}
                                    </span>
                                    <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">
                                        {service.name || 'Serviço sem nome'}
                                    </span>
                                </div>
                                <div className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {service.count}x
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                            Nenhum serviço registrado
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

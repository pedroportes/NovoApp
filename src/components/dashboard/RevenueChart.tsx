import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartData {
    name: string
    faturamento: number
}

interface RevenueChartProps {
    data: ChartData[]
}

export function RevenueChart({ data }: RevenueChartProps) {
    return (
        <div className="bg-gradient-to-br from-white to-emerald-50/30 p-6 rounded-3xl shadow-xl shadow-emerald-500/5 border border-slate-100 border-l-4 border-l-emerald-500 hover:shadow-emerald-500/10 transition-all duration-300">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800">Histórico de Faturamento</h3>
                <p className="text-sm text-slate-500">Acompanhamento dos últimos meses</p>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="99%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickFormatter={(value) => `R$ ${value / 1000}k`}
                        />
                        <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number | undefined) => [`R$ ${(value || 0).toLocaleString('pt-BR')}`, 'Faturamento']}
                        />
                        <Bar
                            dataKey="faturamento"
                            fill="#10b981"
                            radius={[6, 6, 0, 0]}
                            barSize={32}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

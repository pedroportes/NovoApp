import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    TooltipProps
} from 'recharts'
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

interface ClientGrowthData {
    month: string
    newClients: number
}

interface ClientGrowthChartProps {
    data: ClientGrowthData[]
}

export function ClientGrowthChart({ data }: ClientGrowthChartProps) {
    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-2xl">
                    <p className="text-xs font-bold text-slate-500 mb-1">{label}</p>
                    <p className="text-emerald-600 font-bold text-lg">
                        +{payload[0].value} <span className="text-xs font-normal text-slate-400">clientes</span>
                    </p>
                </div>
            )
        }
        return null
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center h-full min-h-[300px]">
                <p className="text-slate-400 text-sm">Sem dados de crescimento.</p>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Crescimento da Base</h3>
                    <p className="text-xs text-slate-400">Novos clientes cadastrados</p>
                </div>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar
                            dataKey="newClients"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            barSize={32}
                            fillOpacity={0.8}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

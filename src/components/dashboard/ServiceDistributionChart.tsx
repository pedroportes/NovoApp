import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ServiceData {
    name: string;
    value: number;
    [key: string]: any;
}

interface ServiceDistributionChartProps {
    data: ServiceData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function ServiceDistributionChart({ data }: ServiceDistributionChartProps) {
    // Filter out tiny values to avoid clutter if needed, or just show top 5 + Others
    const processedData = React.useMemo(() => {
        if (!data || data.length === 0) return [];

        // Sort by value desc
        const sorted = [...data].sort((a, b) => b.value - a.value);

        // Take top 4 and sum the rest as "Outros"
        if (sorted.length > 5) {
            const top4 = sorted.slice(0, 4);
            const others = sorted.slice(4).reduce((acc, curr) => acc + curr.value, 0);
            return [...top4, { name: 'Outros', value: others }];
        }

        return sorted;
    }, [data]);

    if (processedData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                Nenhum serviço registrado no período
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-white to-violet-50/30 p-4 md:p-6 rounded-3xl shadow-xl shadow-violet-500/5 border border-slate-100 h-full flex flex-col border-l-4 border-l-violet-500 hover:shadow-violet-500/10 transition-all duration-300">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 px-2">
                Serviços Mais Vendidos
            </h3>

            <div className="flex-1 min-h-[220px] w-full relative">
                <ResponsiveContainer width="99%" height="100%">
                    <PieChart>
                        <Pie
                            data={processedData}
                            cx="50%"
                            cy="45%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {processedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number | undefined) =>
                                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
                            }
                            itemStyle={{ color: '#374151' }}
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4">
                {processedData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-xs md:text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                            <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-slate-600 truncate">{entry.name}</span>
                        </div>
                        <span className="font-semibold text-slate-700 whitespace-nowrap">
                            {new Intl.NumberFormat('pt-BR', { style: 'percent' }).format(entry.value / processedData.reduce((acc, curr) => acc + curr.value, 0))}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

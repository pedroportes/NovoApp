import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Serviços Mais Vendidos
            </h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={processedData}
                            cx="50%"
                            cy="50%"
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
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

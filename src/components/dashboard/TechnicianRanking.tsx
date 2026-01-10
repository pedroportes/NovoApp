import { Crown, Medal, User } from 'lucide-react'

interface TechnicianStat {
    name: string;
    totalCommissions: number;
    servicesCount: number;
}

interface TechnicianRankingProps {
    data: TechnicianStat[];
}

export function TechnicianRanking({ data }: TechnicianRankingProps) {
    // Sort by commission desc
    const sortedData = [...data].sort((a, b) => b.totalCommissions - a.totalCommissions);
    const top5 = sortedData.slice(0, 5);

    const getIcon = (index: number) => {
        if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" fill="currentColor" />;
        if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
        if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
        return <span className="text-sm font-bold text-slate-400">#{index + 1}</span>;
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 h-full">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                <Crown className="h-5 w-5 text-emerald-500" />
                Performance da Equipe
            </h3>

            {top5.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <User className="h-10 w-10 text-slate-200 mb-2" />
                    <p className="text-slate-400 text-sm">Sem dados de performance no período.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {top5.map((tech, index) => (
                        <div key={index} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${index === 0 ? 'bg-yellow-50' : 'bg-slate-50'}`}>
                                    {getIcon(index)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700">{tech.name}</p>
                                    <p className="text-[10px] text-slate-400">{tech.servicesCount} serviços</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-emerald-600">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tech.totalCommissions)}
                                </p>
                                <span className="text-[10px] text-slate-400">em comissões</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

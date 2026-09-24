import { Crown, Medal, User, ChevronRight, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export interface TechnicianStat {
    id?: string;
    name: string;
    totalCommissions: number;
    servicesCount: number;
}

interface TechnicianRankingProps {
    data: TechnicianStat[];
}

export function TechnicianRanking({ data }: TechnicianRankingProps) {
    const navigate = useNavigate();
    // Sort by commission desc
    const sortedData = [...data].sort((a, b) => b.totalCommissions - a.totalCommissions);
    const top5 = sortedData.slice(0, 5);

    const getIcon = (index: number) => {
        if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" fill="currentColor" />;
        if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
        if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
        return <span className="text-sm font-bold text-slate-400">#{index + 1}</span>;
    }

    const handleOpenTechnician = (techId?: string) => {
        if (techId) {
            navigate('/financial?tab=comissoes&techId=' + techId)
        } else {
            navigate('/financial?tab=comissoes')
        }
    }

    return (
        <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-3xl shadow-xl shadow-amber-500/5 border border-slate-100 border-l-4 border-l-amber-500 p-6 h-full hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Crown className="h-5 w-5 text-emerald-500" />
                        Performance da Equipe
                    </h3>
                    <button
                        onClick={() => navigate('/financial?tab=comissoes')}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                        title="Ver tela de fechamento de comissões"
                    >
                        Ver Fechamento
                        <ArrowUpRight className="h-3 w-3" />
                    </button>
                </div>

                {top5.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <User className="h-10 w-10 text-slate-200 mb-2" />
                        <p className="text-slate-400 text-sm">Sem dados de performance no período.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {top5.map((tech, index) => (
                            <div
                                key={index}
                                onClick={() => handleOpenTechnician(tech.id)}
                                className="flex items-center justify-between group p-2.5 -mx-2.5 rounded-2xl hover:bg-amber-500/10 cursor-pointer transition-all duration-200 border border-transparent hover:border-amber-200/80"
                                title="Clique para ver o extrato financeiro e comissões deste técnico"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={"w-8 h-8 rounded-full flex items-center justify-center shrink-0 " + (index === 0 ? "bg-yellow-50" : "bg-slate-50")}>
                                        {getIcon(index)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 group-hover:text-amber-800 transition-colors flex items-center gap-1.5">
                                            {tech.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400">{tech.servicesCount} serviços</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-emerald-600">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tech.totalCommissions)}
                                        </p>
                                        <span className="text-[10px] text-slate-400">em comissões</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {top5.length > 0 && (
                <div className="pt-4 mt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>💡 Clique no técnico para ver detalhes</span>
                    <button
                        onClick={() => navigate('/financial?tab=comissoes')}
                        className="font-medium text-amber-600 hover:underline cursor-pointer"
                    >
                        Extrato geral &rarr;
                    </button>
                </div>
            )}
        </div>
    )
}

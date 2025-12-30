import { TrendingUp, Users, ClipboardList, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export function Dashboard() {
    return (
        <div className="space-y-6">
            {/* GRID DE CARDS PRINCIPAIS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Card - Receita */}
                <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />

                    <div className="relative z-10 flex justify-between items-start">
                        <div className="p-3 bg-emerald-100/50 rounded-2xl text-emerald-600">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            +20.1%
                        </span>
                    </div>

                    <div className="relative z-10">
                        <p className="text-sm font-medium text-slate-500 mb-1">Receita Total</p>
                        <h3 className="text-2xl font-bold text-slate-800">R$ 45.231,89</h3>
                    </div>
                </div>

                {/* Card - Serviços Ativos */}
                <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />

                    <div className="relative z-10 flex justify-between items-start">
                        <div className="p-3 bg-sky-100/50 rounded-2xl text-sky-600">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            +12%
                        </span>
                    </div>

                    <div className="relative z-10">
                        <p className="text-sm font-medium text-slate-500 mb-1">Serviços Ativos</p>
                        <h3 className="text-2xl font-bold text-slate-800">12 O.S.</h3>
                    </div>
                </div>

                {/* Card - Clientes */}
                <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />

                    <div className="relative z-10 flex justify-between items-start">
                        <div className="p-3 bg-indigo-100/50 rounded-2xl text-indigo-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +5
                        </span>
                    </div>

                    <div className="relative z-10">
                        <p className="text-sm font-medium text-slate-500 mb-1">Novos Clientes</p>
                        <h3 className="text-2xl font-bold text-slate-800">48</h3>
                    </div>
                </div>
            </div>

            {/* LISTA RECENTE / TRANSACTION STYLE */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Atividades Recentes</h3>
                    <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Ver tudo</button>
                </div>

                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Limpeza de Fossa</p>
                                    <p className="text-xs text-slate-400">Cliente: Restaurante Sabor & Arte</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-800">R$ 1.250,00</p>
                                <p className="text-xs text-emerald-500 font-medium">Concluído</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

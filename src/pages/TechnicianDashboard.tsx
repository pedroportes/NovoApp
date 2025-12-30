import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { ClipboardList, Plus, MapPin, DollarSign, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function TechnicianDashboard() {
    const { userData, signOut } = useAuth()
    const navigate = useNavigate()

    // We can reuse the main layout's FAB context if we want, 
    // or just put big buttons on the screen since it's mobile-first.
    const { setFabAction } = useOutletContext<{ setFabAction: (action: (() => void) | null) => void }>() ?? { setFabAction: () => { } }

    useEffect(() => {
        // Fab action to New OS
        setFabAction(() => navigate('/service-orders/new'))
        return () => setFabAction(null)
    }, [navigate, setFabAction])

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-[#F0F4F2] p-4 space-y-6 pb-24 relative overflow-hidden">
            {/* Background Gradient Orbs */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-300/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-300/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between pt-2 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-950 tracking-tight">
                        Olá, {userData?.nome ? userData.nome.split(' ')[0] : 'Técnico'}
                    </h1>
                    <p className="text-emerald-700/80 text-sm font-medium">
                        {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </p>
                </div>
                <div className="h-12 w-12 bg-emerald-100/80 backdrop-blur-sm rounded-full flex items-center justify-center text-emerald-700 font-bold border border-white/50 shadow-sm">
                    {userData?.nome?.[0] || 'T'}
                </div>
            </header>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4 relative z-10">
                <Card
                    className="group p-5 flex flex-col items-center justify-center gap-3 cursor-pointer bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-emerald-200/50 hover:bg-white/90 transition-all duration-300 rounded-[24px] h-36 active:scale-95"
                    onClick={() => navigate('/service-orders/new')}
                >
                    <div className="h-14 w-14 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center text-white shadow-emerald-200 shadow-md group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-7 w-7" />
                    </div>
                    <span className="font-semibold text-emerald-900 text-sm tracking-wide">Nova OS</span>
                </Card>

                <Card
                    className="group p-5 flex flex-col items-center justify-center gap-3 cursor-pointer bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-blue-200/50 hover:bg-white/90 transition-all duration-300 rounded-[24px] h-36 active:scale-95"
                    onClick={() => navigate('/service-orders')}
                >
                    <div className="h-14 w-14 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-blue-200 shadow-md group-hover:scale-110 transition-transform duration-300">
                        <ClipboardList className="h-7 w-7" />
                    </div>
                    <span className="font-semibold text-slate-700 text-sm tracking-wide">Minhas OS</span>
                </Card>

                <Card
                    className="group p-5 flex flex-col items-center justify-center gap-3 cursor-pointer bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-amber-200/50 hover:bg-white/90 transition-all duration-300 rounded-[24px] h-36 active:scale-95"
                    onClick={() => navigate('/expenses')}
                >
                    <div className="h-14 w-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-amber-200 shadow-md group-hover:scale-110 transition-transform duration-300">
                        <DollarSign className="h-7 w-7" />
                    </div>
                    <span className="font-semibold text-slate-700 text-sm tracking-wide">Gastos</span>
                </Card>

                <Card
                    className="group p-5 flex flex-col items-center justify-center gap-3 cursor-pointer bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-purple-200/50 hover:bg-white/90 transition-all duration-300 rounded-[24px] h-36 active:scale-95"
                    onClick={() => navigate('/clients')}
                >
                    <div className="h-14 w-14 bg-gradient-to-br from-purple-400 to-violet-500 rounded-2xl flex items-center justify-center text-white shadow-purple-200 shadow-md group-hover:scale-110 transition-transform duration-300">
                        <MapPin className="h-7 w-7" />
                    </div>
                    <span className="font-semibold text-slate-700 text-sm tracking-wide">Clientes</span>
                </Card>
            </div>

            {/* Recent Activity / Next Task */}
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="font-bold text-emerald-950 text-lg">Próxima Tarefa</h2>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Hoje</span>
                </div>

                <Card className="p-0 border-none shadow-lg shadow-emerald-100/50 bg-white/80 backdrop-blur-md rounded-[24px] overflow-hidden">
                    <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Residencial Flores</h3>
                                <p className="text-sm text-slate-500 font-medium">Limpeza de Caixa d'Água</p>
                            </div>
                            <div className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200">
                                09:00
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span className="truncate">Rua das Camélias, 123 - Curitiba/PR</span>
                        </div>

                        <Button
                            className="w-full h-12 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 disabled:opacity-50"
                            onClick={() => {
                                window.open(`https://waze.com/ul?q=Rua das Camelias, 123`, '_blank')
                            }}
                        >
                            <MapPin className="mr-2 h-4 w-4" />
                            Iniciar Navegação
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="w-full flex justify-center pb-6">
                <Button variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full px-6" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair da conta
                </Button>
            </div>
        </div>
    )
}

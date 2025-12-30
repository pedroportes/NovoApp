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
        <div className="min-h-screen bg-slate-50 p-4 space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between pt-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Olá, {userData?.nome?.split(' ')[0]}</h1>
                    <p className="text-slate-500 text-sm">
                        {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </p>
                </div>
                <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">
                    {userData?.nome?.[0]}
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
                <Card
                    className="p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-emerald-50 active:scale-95 transition-all border-emerald-100 shadow-sm h-32"
                    onClick={() => navigate('/service-orders/new')}
                >
                    <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <Plus className="h-6 w-6" />
                    </div>
                    <span className="font-semibold text-slate-700">Nova OS</span>
                </Card>

                <Card
                    className="p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-blue-50 active:scale-95 transition-all border-blue-100 shadow-sm h-32"
                    onClick={() => navigate('/service-orders')}
                >
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <ClipboardList className="h-6 w-6" />
                    </div>
                    <span className="font-semibold text-slate-700">Minhas OS</span>
                </Card>

                <Card
                    className="p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-amber-50 active:scale-95 transition-all border-amber-100 shadow-sm h-32"
                    onClick={() => navigate('/expenses')} // We need to create this or reuse financial
                >
                    <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <span className="font-semibold text-slate-700">Gastos</span>
                </Card>

                <Card
                    className="p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-purple-50 active:scale-95 transition-all border-purple-100 shadow-sm h-32"
                    onClick={() => navigate('/clients')}
                >
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                        <MapPin className="h-6 w-6" />
                    </div>
                    <span className="font-semibold text-slate-700">Clientes</span>
                </Card>
            </div>

            {/* Recent Activity / Next Task Placeholder */}
            <div>
                <h2 className="font-bold text-slate-800 mb-2">Próxima Tarefa</h2>
                <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-slate-900">Residencial Flores</h3>
                            <p className="text-sm text-slate-500">Limpeza de Caixa d'Água</p>
                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                                <MapPin className="h-3 w-3" />
                                <span>Rua das Camélias, 123</span>
                            </div>
                        </div>
                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded font-bold">
                            09:00
                        </span>
                    </div>
                    <Button className="w-full mt-4 h-10 text-sm" variant="outline" onClick={() => {
                        // Open Waze/Maps logic here
                        window.open(`https://waze.com/ul?q=Rua das Camelias, 123`, '_blank')
                    }}>
                        Navegar até lá
                    </Button>
                </Card>
            </div>

            <Button variant="ghost" className="w-full text-red-500 hover:bg-red-50 hover:text-red-600" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
            </Button>
        </div>
    )
}

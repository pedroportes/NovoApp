import { useState, useEffect, useCallback } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, ClipboardList, Settings, Menu, LogOut, Plus, Wrench, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/button'

export function MainLayout() {
    const location = useLocation()
    const navigate = useNavigate()
    const { signOut, userData } = useAuth()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const navItems = [
        { icon: LayoutDashboard, label: 'Início', path: '/' },
        { icon: ClipboardList, label: 'OS', path: '/service-orders' },
        // Middle item is skipped in map to place FAB
        { icon: Wrench, label: 'Serviços', path: '/services' },
        { icon: Users, label: 'Equipe', path: '/technicians' }, // Renamed for better fit
    ]

    // Determine Page Title
    const getPageTitle = () => {
        switch (location.pathname) {
            case '/': return `Olá, ${userData?.nome?.split(' ')[0] || 'Visitante'}`;
            case '/service-orders': return 'Ordens de Serviço';
            case '/services': return 'Catálogo de Serviços';
            case '/clients': return 'Carteira de Clientes';
            case '/technicians': return 'Equipe Técnica';
            case '/settings': return 'Configurações';
            default: return 'FlowDrain';
        }
    }

    const [fabAction, setFabActionState] = useState<(() => void) | null>(null)

    // Helper to safely set state, handling function updates correctly
    const setFabAction = useCallback((action: (() => void) | null) => {
        setFabActionState(() => action)
    }, [])

    // Reset FAB action removed to prevent race conditions with child components
    // Children are responsible for cleaning up their own actions on unmount.

    const handleFabClick = () => {
        if (fabAction) {
            fabAction()
        }
    }

    // ... (render logic)

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans">
            {/* Desktop Sidebar (Kept functional but styled) */}
            <aside className="hidden md:flex w-72 flex-col border-r border-border bg-white shadow-xl z-20">
                <div className="h-20 flex items-center px-8 border-b border-gray-100">
                    <span className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent transform hover:scale-105 transition-transform">
                        FlowDrain
                    </span>
                </div>
                <nav className="flex-1 p-6 space-y-3">
                    {[
                        ...navItems,
                        { icon: Users, label: 'Clientes', path: '/clients' },
                        { icon: Settings, label: 'Configurações', path: '/settings' }
                    ].map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group",
                                location.pathname === item.path
                                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-x-1"
                                    : "hover:bg-gray-50 text-gray-500 hover:text-slate-900"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", location.pathname === item.path ? "text-emerald-400" : "")} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="p-6 border-t border-gray-100">
                    <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 px-6 py-4 text-sm font-medium text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        Sair do Sistema
                    </button>
                </div>
            </aside>

            {/* Mobile / Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">

                {/* Mobile Header Gradient */}
                <header className="md:hidden min-h-[130px] banking-gradient rounded-b-[30px] px-6 pt-6 pb-8 flex flex-col justify-between shadow-2xl relative z-0 shrink-0">
                    <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                                <span className="font-bold text-lg">{userData?.nome?.[0] || 'F'}</span>
                            </div>
                            <div>
                                <p className="text-xs text-emerald-100 font-medium opacity-90">
                                    {location.pathname === '/' ? 'Bem-vindo de volta,' : 'Gerenciamento'}
                                </p>
                                <h1 className="text-xl font-bold leading-tight">{getPageTitle()}</h1>
                            </div>
                        </div>
                        <button onClick={() => navigate('/settings')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-sm transition-colors">
                            <Settings className="h-5 w-5 text-white" />
                        </button>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/20 rounded-full blur-2xl -ml-10 -mb-5 pointer-events-none" />
                </header>

                {/* Main Content Scrollable */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent z-10 -mt-8 md:mt-0 md:p-8 px-4 pb-28 pt-4 md:bg-[#f3f4f6]">
                    {/* Desktop Header */}
                    <header className="hidden md:flex h-20 items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{getPageTitle()}</h1>
                            <p className="text-slate-500 mt-1">Gerencie sua empresa com eficiência.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                <span className="font-bold text-slate-700">{userData?.nome}</span>
                                <span className="text-xs text-slate-400">{userData?.email}</span>
                            </div>
                            <div className="w-12 h-12 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                <div className="w-full h-full flex items-center justify-center bg-emerald-500 text-white font-bold text-xl">
                                    {userData?.nome?.[0]}
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="md:max-w-7xl md:mx-auto">
                        <Outlet context={{ setFabAction }} />
                    </div>
                </main>

                {/* Mobile Bottom Navigation with FAB */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-100 rounded-t-[30px] shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] flex items-center justify-between px-6 z-50">
                    <Link to="/" className={cn("flex flex-col items-center gap-1 transition-colors", location.pathname === '/' ? "text-emerald-600" : "text-gray-400")}>
                        <LayoutDashboard className="h-6 w-6" strokeWidth={location.pathname === '/' ? 2.5 : 2} />
                    </Link>

                    <Link to="/service-orders" className={cn("flex flex-col items-center gap-1 transition-colors", location.pathname === '/service-orders' ? "text-emerald-600" : "text-gray-400")}>
                        <ClipboardList className="h-6 w-6" strokeWidth={location.pathname === '/service-orders' ? 2.5 : 2} />
                    </Link>

                    {/* FAB (Floating Action Button) */}
                    <div className="relative -top-8">
                        <button
                            onClick={handleFabClick}
                            className={cn(
                                "w-16 h-16 bg-gradient-to-tr from-emerald-500 to-sky-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all duration-300 border-4 border-[#f3f4f6]",
                                !fabAction && "opacity-0 scale-50 pointer-events-none"
                            )}
                        >
                            <Plus className="h-8 w-8" strokeWidth={3} />
                        </button>
                    </div>

                    <Link to="/clients" className={cn("flex flex-col items-center gap-1 transition-colors", location.pathname === '/clients' ? "text-emerald-600" : "text-gray-400")}>
                        <Users className="h-6 w-6" strokeWidth={location.pathname === '/clients' ? 2.5 : 2} />
                    </Link>

                    <Link to="/technicians" className={cn("flex flex-col items-center gap-1 transition-colors", location.pathname === '/technicians' ? "text-emerald-600" : "text-gray-400")}>
                        <Wallet className="h-6 w-6" strokeWidth={location.pathname === '/technicians' ? 2.5 : 2} />
                    </Link>
                </nav>
            </div>
        </div>
    )
}

import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Wallet, User, LogOut, Menu, Share2, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useAffiliate } from '@/hooks/useAffiliate'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function AffiliateLayout() {
    const location = useLocation()
    const navigate = useNavigate()
    const { signOut, userData } = useAuth()
    const { affiliate, loading, registerAffiliate } = useAffiliate()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isRegistering, setIsRegistering] = useState(false)

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const handleJoinProgram = async () => {
        setIsRegistering(true)
        try {
            const nickname = userData?.nome || 'Affiliate'
            await registerAffiliate(nickname)
        } catch (error) {
            console.error(error)
        } finally {
            setIsRegistering(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    // Se não for afiliado, mostra tela de "Cadastro"
    if (!affiliate) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                        <DollarSign className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Programa de Afiliados</h1>
                        <p className="text-slate-500 mt-2">
                            Ganhe comissões recorrentes indicando o FlowDrain para outras empresas.
                        </p>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-xl text-left space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <span className="font-bold text-purple-600">1</span>
                            </div>
                            <span className="text-sm font-medium text-purple-900">Indique seu link exclusivo</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <span className="font-bold text-purple-600">2</span>
                            </div>
                            <span className="text-sm font-medium text-purple-900">Ganhe 10% recorrente</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <span className="font-bold text-purple-600">3</span>
                            </div>
                            <span className="text-sm font-medium text-purple-900">Saques mensais via PIX</span>
                        </div>
                    </div>

                    <Button
                        onClick={handleJoinProgram}
                        disabled={isRegistering}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 rounded-xl text-lg font-bold shadow-lg shadow-purple-200"
                    >
                        {isRegistering ? 'Criando conta...' : 'Quero ser um Parceiro'}
                    </Button>

                    <button onClick={handleSignOut} className="text-sm text-slate-400 hover:text-slate-600">
                        Sair da conta
                    </button>
                </div>
            </div>
        )
    }

    const navItems = [
        { icon: LayoutDashboard, label: 'Visão Geral', path: '/afiliado/dashboard' },
        { icon: Share2, label: 'Links & Divulgação', path: '/afiliado/links' },
        { icon: Wallet, label: 'Financeiro', path: '/afiliado/financeiro' },
        { icon: User, label: 'Meu Perfil', path: '/afiliado/perfil' },
    ]

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm z-20">
                <div className="h-20 flex items-center px-6 border-b border-slate-100">
                    <span className="text-xl font-bold text-slate-800">
                        Parceiro <span className="text-purple-600">FlowDrain</span>
                    </span>
                </div>

                <div className="p-6 pb-2">
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Saldo Disponível</p>
                        <p className="text-2xl font-bold text-slate-900">
                            R$ {affiliate.total_comissoes_pendentes.toFixed(2)}
                        </p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                                location.pathname === item.path
                                    ? "bg-purple-50 text-purple-700 font-medium"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", location.pathname === item.path ? "text-purple-600" : "text-slate-400 group-hover:text-slate-600")} />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="flex-1 flex flex-col min-h-screen">
                <header className="md:hidden bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sticky top-0 z-30">
                    <span className="font-bold text-lg text-slate-800">Parceiro FlowDrain</span>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-600">
                        <Menu className="h-6 w-6" />
                    </button>
                </header>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
                        <aside className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl p-4" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold">Menu</span>
                                <button onClick={() => setSidebarOpen(false)}>✕</button>
                            </div>
                            <nav className="space-y-2">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setSidebarOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-lg",
                                            location.pathname === item.path ? "bg-purple-50 text-purple-700" : "text-slate-600"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.label}
                                    </Link>
                                ))}
                                <button onClick={handleSignOut} className="flex w-full items-center gap-3 px-4 py-3 text-red-500 mt-4">
                                    <LogOut className="h-5 w-5" /> Sair
                                </button>
                            </nav>
                        </aside>
                    </div>
                )}

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
                    <Outlet context={{ affiliate }} />
                </main>
            </div>
        </div>
    )
}

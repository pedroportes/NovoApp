import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Loader2, Building2, Wrench } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ModeToggle } from '@/components/mode-toggle'
import { cn } from '@/lib/utils'

type LoginType = 'admin' | 'tecnico'

export function Login() {
    const [loginType, setLoginType] = useState<LoginType>('admin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [companyName, setCompanyName] = useState<string | null>(null)

    const { signIn } = useAuth()
    const navigate = useNavigate()

    // Tenta buscar o nome da empresa se for técnico
    useEffect(() => {
        if (loginType === 'tecnico' && email.includes('@')) {
            // Lógica futura: buscar logo/nome da empresa pelo domínio ou email
            // Por enquanto, mostra placeholder visual
        }
    }, [loginType, email])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Validation
        if (!email || !password) {
            setError('Preencha todos os campos')
            return
        }

        if (!email.includes('@')) {
            setError('E-mail inválido')
            return
        }

        setLoading(true)

        try {
            const result = await signIn(email, password)

            if (result.success) {
                // Get fresh user data directly from Supabase to ensure we use the correct ID
                const { data: { user: authUser } } = await supabase.auth.getUser()

                if (!authUser) {
                    setError('Erro: Usuário autenticado não encontrado.')
                    setLoading(false)
                    return
                }

                // Check role to redirect and validate correct login type
                const { data: userProfile, error: profileError } = await supabase
                    .from('usuarios')
                    .select('cargo, empresa_id, empresas(nome)')
                    .eq('id', authUser.id)
                    .single()

                if (profileError || !userProfile) {
                    console.error('Erro ao buscar perfil:', profileError)
                    // Se não achou perfil mas logou no Auth, pode ser erro de sincronia.
                    // O usuário disse que já sincronizou, então isso não deveria acontecer,
                    // mas se acontecer, damos um erro claro.
                    setError('Perfil de usuário não encontrado. Contate o suporte.')
                    await supabase.auth.signOut()
                    setLoading(false)
                    return
                }

                console.log('Login Info:', {
                    authId: authUser.id,
                    profileId: userProfile?.id, // check if this field exists in response if selected ?
                    // actually .select('cargo...') didn't select id, relying on single() returning the object
                    role: userProfile.cargo,
                    empresaId: userProfile.empresa_id
                })

                const userRole = userProfile.cargo?.toLowerCase()

                // Validação Cruzada: Impede técnico de logar na aba Admin e vice-versa
                if (loginType === 'tecnico' && userRole !== 'tecnico') {
                    setError('Esta conta não é de técnico. Use a aba "Sou Dono / Admin".')
                    await supabase.auth.signOut()
                    setLoading(false)
                    return
                }

                if (loginType === 'admin' && userRole === 'tecnico') {
                    setError('Técnicos devem usar a aba "Sou Técnico".')
                    await supabase.auth.signOut()
                    setLoading(false)
                    return
                }

                // Redirecionamento correto
                // Redirecionamento correto conforme solicitado
                if (userRole === 'tecnico') {
                    navigate('/tecnico/dashboard')
                } else if (userRole === 'admin') {
                    navigate('/') // Admin Dashboard
                } else {
                    // Fallback
                    navigate('/')
                }
            } else {
                console.error('Login Error:', result.error)
                setError(result.error || 'Erro ao fazer login (Detalhes no Console)')
            }
        } catch (err: any) {
            console.error('Erro geral no login:', err)
            setError(`Erro de conexão: ${err.message || 'Desconhecido'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black p-4">
            <div className="w-full max-w-md">
                <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-2xl overflow-hidden">

                    {/* Header com Logo */}
                    <div className="pt-8 pb-6 flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-transparent">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg mb-4 ring-4 ring-background">
                            <span className="text-white text-3xl font-bold">FD</span>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">
                            FlowDrain
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Gerencie sua desentupidora com facilidade
                        </p>
                    </div>

                    <div className="p-8 pt-2">
                        {/* Toggle Admin / Técnico */}
                        <div className="bg-muted/50 p-1 rounded-lg grid grid-cols-2 gap-1 mb-8">
                            <button
                                type="button"
                                onClick={() => {
                                    setLoginType('admin')
                                    setError('')
                                }}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                                    loginType === 'admin'
                                        ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                )}
                            >
                                <Building2 className="w-4 h-4" />
                                Sou Dono / Admin
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLoginType('tecnico')
                                    setError('')
                                }}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                                    loginType === 'tecnico'
                                        ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                )}
                            >
                                <Wrench className="w-4 h-4" />
                                Sou Técnico
                            </button>
                        </div>

                        {/* Título Dinâmico */}
                        {/* <div className="text-center mb-6">
                            <h2 className="text-lg font-medium text-foreground">
                                {loginType === 'admin' ? 'Acesso Administrativo' : 'Acesso Técnico'}
                            </h2>
                        </div> */}

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center justify-center text-center animate-in fade-in slide-in-from-top-2">
                                <p className="text-sm text-destructive font-medium">{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email Input */}
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                                    E-MAIL
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={loginType === 'admin' ? "admin@empresa.com" : "tecnico@empresa.com"}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        autoComplete="email"
                                        className="pl-10 h-12 bg-background/50 border-input group-hover:border-primary/50 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-1.5">
                                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                                    SENHA
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        autoComplete="current-password"
                                        className="pl-10 h-12 bg-background/50 border-input group-hover:border-primary/50 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full h-12 text-base font-semibold mt-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    <>
                                        Entrar na Conta
                                    </>
                                )}
                            </Button>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-muted" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">
                                        Ou
                                    </span>
                                </div>
                            </div>

                            {/* Google Login (Visível apenas para Admin por enquanto?) */}
                            <Button variant="outline" type="button" className="w-full h-12 font-medium" disabled={loading}>
                                <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                                </svg>
                                Entrar com Google
                            </Button>

                            {/* Create Account Link */}
                            <div className="text-center pt-2">
                                <span className="text-sm text-muted-foreground">Ainda não tem conta? </span>
                                <a
                                    href="/signup"
                                    className="text-sm text-primary hover:underline font-bold transition-colors"
                                >
                                    Criar nova conta
                                </a>
                            </div>
                        </form>
                    </div>

                    {/* Footer Theme Toggle */}
                    {/* <div className="bg-muted/30 p-4 border-t border-border flex justify-between items-center px-8">
                        <span className="text-xs text-muted-foreground">FlowDrain v1.0</span>
                        <ModeToggle />
                    </div> */}
                </div>
            </div>
        </div>
    )
}

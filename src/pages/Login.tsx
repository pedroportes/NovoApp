import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ModeToggle } from '@/components/mode-toggle'

export function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const { signIn } = useAuth()
    const navigate = useNavigate()

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
                navigate('/')
            } else {
                setError(result.error || 'Erro ao fazer login')
            }
        } catch (err) {
            setError('Erro de conexão. Tente novamente')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-4">
            <div className="w-full max-w-md">
                <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-2xl p-8">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg">
                            <div className="text-white text-4xl font-bold">FD</div>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-center mb-2 text-foreground">
                        FlowDrain
                    </h1>
                    <p className="text-center text-muted-foreground mb-8">
                        ACESSO TÉCNICO
                    </p>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <p className="text-sm text-destructive text-center">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Input */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-foreground">
                                E-mail
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                icon={<User className="h-5 w-5" />}
                                disabled={loading}
                                autoComplete="email"
                                className="h-12"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-foreground">
                                Senha
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                icon={<Lock className="h-5 w-5" />}
                                disabled={loading}
                                autoComplete="current-password"
                                className="h-12"
                            />
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember"
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                    disabled={loading}
                                />
                                <label
                                    htmlFor="remember"
                                    className="text-sm text-muted-foreground cursor-pointer select-none"
                                >
                                    Lembrar-me
                                </label>
                            </div>
                            <a
                                href="#"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors italic"
                            >
                                Esqueceu a senha?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full h-14 text-base font-semibold"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                'ENTRAR'
                            )}
                        </Button>

                        {/* Sign Up Link */}
                        <div className="text-center mt-4">
                            <span className="text-sm text-muted-foreground">Não tem uma conta? </span>
                            <a
                                href="/signup"
                                className="text-sm text-primary hover:underline font-medium"
                            >
                                Criar Conta
                            </a>
                        </div>
                    </form>

                    {/* Theme Toggle */}
                    <div className="mt-8 pt-6 border-t border-border">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Tema</span>
                            <ModeToggle />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/70 text-sm mt-6">
                    FlowDrain SaaS © 2024
                </p>
            </div>
        </div>
    )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Mail, Building2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModeToggle } from '@/components/mode-toggle'

export function SignUp() {
    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [nomeEmpresa, setNomeEmpresa] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Validation
        if (!nome || !email || !password || !confirmPassword || !nomeEmpresa) {
            setError('Preencha todos os campos')
            return
        }

        if (!email.includes('@')) {
            setError('E-mail inválido')
            return
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres')
            return
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem')
            return
        }

        setLoading(true)

        try {
            // 1. Create user in Supabase Auth with metadata for Triggers
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: nome,
                        nome_empresa: nomeEmpresa,
                    }
                }
            })

            if (authError) throw authError

            if (!authData.user) {
                throw new Error('Erro ao criar usuário')
            }

            // Success! The database triggers will handle 'empresas' and 'usuarios' creation.
            setSuccess(true)

            // Redirect to Dashboard
            setTimeout(() => {
                navigate('/')
            }, 2000)

        } catch (error: any) {
            console.error('Sign up error:', error)
            setError(error.message || 'Erro ao criar conta. Tente novamente')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-4">
                <div className="w-full max-w-md">
                    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-2xl p-8 text-center">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Conta Criada!</h2>
                        <p className="text-muted-foreground mb-4">
                            Sua conta foi criada com sucesso. Entrando no sistema...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-4">
            <div className="w-full max-w-md">
                <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-2xl p-8">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg">
                            <div className="text-white text-3xl font-bold">FD</div>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-center mb-2 text-foreground">
                        Criar Conta
                    </h1>
                    <p className="text-center text-muted-foreground mb-6">
                        Cadastre sua empresa no FlowDrain
                    </p>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <p className="text-sm text-destructive text-center">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nome Empresa */}
                        <div className="space-y-2">
                            <label htmlFor="empresa" className="text-sm font-medium text-foreground">
                                Nome da Empresa
                            </label>
                            <Input
                                id="empresa"
                                type="text"
                                placeholder="Sua Empresa Ltda"
                                value={nomeEmpresa}
                                onChange={(e) => setNomeEmpresa(e.target.value)}
                                icon={<Building2 className="h-5 w-5" />}
                                disabled={loading}
                                className="h-12"
                            />
                        </div>

                        {/* Nome */}
                        <div className="space-y-2">
                            <label htmlFor="nome" className="text-sm font-medium text-foreground">
                                Seu Nome
                            </label>
                            <Input
                                id="nome"
                                type="text"
                                placeholder="João Silva"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                icon={<User className="h-5 w-5" />}
                                disabled={loading}
                                className="h-12"
                            />
                        </div>

                        {/* Email */}
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
                                icon={<Mail className="h-5 w-5" />}
                                disabled={loading}
                                autoComplete="email"
                                className="h-12"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-foreground">
                                Senha
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                icon={<Lock className="h-5 w-5" />}
                                disabled={loading}
                                autoComplete="new-password"
                                className="h-12"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                                Confirmar Senha
                            </label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Digite a senha novamente"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                icon={<Lock className="h-5 w-5" />}
                                disabled={loading}
                                autoComplete="new-password"
                                className="h-12"
                            />
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full h-14 text-base font-semibold mt-6"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Criando conta...
                                </>
                            ) : (
                                'CRIAR CONTA'
                            )}
                        </Button>

                        {/* Login Link */}
                        <div className="text-center mt-4">
                            <span className="text-sm text-muted-foreground">Já tem uma conta? </span>
                            <a
                                href="/login"
                                className="text-sm text-primary hover:underline font-medium"
                            >
                                Entrar
                            </a>
                        </div>
                    </form>

                    {/* Theme Toggle */}
                    <div className="mt-6 pt-6 border-t border-border">
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

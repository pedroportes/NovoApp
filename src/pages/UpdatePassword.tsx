import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toaster, toast } from 'sonner'

export function UpdatePassword() {
    const [email, setEmail] = useState<string | null>(null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [verifying, setVerifying] = useState(true)
    const [verifyingError, setVerifyingError] = useState<string | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        const handleAuth = async () => {
            const urlParams = new URLSearchParams(window.location.search)
            const tokenHash = urlParams.get('token_hash')
            const type = urlParams.get('type')
            const emailParam = urlParams.get('email')

            if (emailParam) setEmail(emailParam)

            // Se já tem sessão, ok
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                console.log('Sessão já existente detectada.')
                setVerifying(false)
                return
            }

            // Se não tem sessão, PRECISA ter token_hash
            if (tokenHash && type === 'recovery') {
                console.log('Tentando trocar token de recuperação por sessão...', { type })

                const { data, error } = await supabase.auth.verifyOtp({
                    token_hash: tokenHash,
                    type: 'recovery'
                })

                if (error) {
                    console.error('Erro ao verificar token:', error)
                    setVerifyingError('O link de recuperação parece inválido ou expirou. Solicite um novo.')
                } else if (!data.session) {
                    console.error('verifyOtp sucesso mas sem sessão retornada.')
                    setVerifyingError('Falha ao estabelecer sessão segura. Tente novamente.')
                } else {
                    console.log('Sessão de recuperação estabelecida com sucesso!')
                    toast.success('Acesso verificado via link seguro.')
                }
            } else {
                setVerifyingError('Link inválido. Verifique se copiou corretamente.')
            }
            setVerifying(false)
        }

        handleAuth()
    }, [])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres')
            return
        }

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem')
            return
        }

        setLoading(true)

        try {
            // Verificar sessão explicitamente
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                throw new Error('Sessão perdida. Por favor, recarregue a página e tente novamente.')
            }

            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            // Atualiza flag must_change_password se existir usuário
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                await supabase
                    .from('usuarios')
                    .update({ must_change_password: false })
                    .eq('id', user.id)
            }

            setSuccess(true)
            toast.success('Senha atualizada com sucesso!')

            setTimeout(() => {
                navigate('/login')
            }, 3000)

        } catch (error: any) {
            console.error('Erro ao atualizar senha:', error)
            toast.error(`Erro: ${error.message || 'Não foi possível atualizar a senha'}`)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Senha Atualizada!</h2>
                    <p className="text-slate-600 mb-6">
                        Sua senha foi redefinida com sucesso.{email ? ` (Conta: ${email})` : ''}
                    </p>
                    <Button onClick={() => navigate('/login')} className="w-full">
                        Ir para Login agora
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black p-4">
            <Toaster richColors position="top-right" />
            <div className="w-full max-w-md">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden p-8">
                    {verifying ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
                            <p className="text-slate-600 font-medium">Validando seu link de acesso...</p>
                        </div>
                    ) : verifyingError ? (
                        <div className="text-center py-8">
                            <div className="bg-red-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-red-600">
                                <Lock className="h-6 w-6" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-2">Acesso Negado</h2>
                            <p className="text-slate-600 mb-6 text-sm">{verifyingError}</p>
                            <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
                                Voltar para Login
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-xl font-bold text-slate-900">Redefinir Senha</h1>
                                <p className="text-sm text-slate-500 mt-2">
                                    Digite sua nova senha abaixo.
                                </p>
                            </div>

                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Nova Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <Input
                                            type="password"
                                            placeholder="••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 h-11"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Confirmar Nova Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <Input
                                            type="password"
                                            placeholder="••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-10 h-11"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 text-base font-semibold mt-4"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Atualizando...
                                        </>
                                    ) : (
                                        'Redefinir Senha'
                                    )}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

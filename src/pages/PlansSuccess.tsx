import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Home, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Volta da Stripe depois do pagamento. A pessoa continua logada (mesmo navegador): esta página
// só espera o stripe-webhook gravar a assinatura na empresa e mostra o plano. Nenhuma senha aparece aqui.

const NOME_DO_PLANO: Record<string, string> = {
    price_1T02TLC2SBfOxdrqrdbCvFEQ: 'Plano Solo',
    price_1T02Y8C2SBfOxdrqfPf01e1C: 'Essencial',
    price_1SsUaDC2SBfOxdrq9LBbQkcl: 'Pro Fluxo',
    price_1SsUe8C2SBfOxdrqRMtj4wjh: 'Operacional',
    price_1SsUkBC2SBfOxdrqofDd7Euj: 'Prime Fleet',
    price_1SsOJhC2SBfOxdrqy7Jf2xNO: 'Plano Teste',
}

type Estado = 'aguardando' | 'ativo' | 'demorando' | 'sem_login'

export function PlansSuccess() {
    const navigate = useNavigate()
    const { user, empresaId: empresaDoUsuario, userData, loading } = useAuth()
    const [estado, setEstado] = useState<Estado>('aguardando')
    const [plano, setPlano] = useState('')
    // Modo teste (só super admin): acompanha a empresa de teste em vez da própria
    const empresaTeste = userData?.isSuperAdmin ? new URLSearchParams(window.location.search).get('teste') : null
    const empresaId = empresaTeste || empresaDoUsuario
    // Troca de plano: só mostra "ativo" quando o plano novo já estiver gravado
    const precoDaTroca = new URLSearchParams(window.location.search).get('troca')

    useEffect(() => {
        if (loading) return
        if (!user || !empresaId) { setEstado('sem_login'); return }

        let parar = false
        const conferir = async (tentativa: number) => {
            const { data } = await supabase
                .from('empresas')
                .select('subscription_status, subscription_price_id')
                .eq('id', empresaId)
                .maybeSingle()
            if (parar) return
            const status = (data as any)?.subscription_status
            const planoNovoGravado = !precoDaTroca || (data as any)?.subscription_price_id === precoDaTroca
            if ((status === 'active' || status === 'trialing') && planoNovoGravado) {
                setPlano(NOME_DO_PLANO[(data as any)?.subscription_price_id] || 'Seu plano')
                setEstado('ativo')
                return
            }
            // O aviso da Stripe costuma chegar em poucos segundos; espera até ~1 minuto
            if (tentativa >= 20) { setEstado('demorando'); return }
            setTimeout(() => conferir(tentativa + 1), 3000)
        }
        conferir(0)
        return () => { parar = true }
    }, [user, empresaId, loading, precoDaTroca])

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-lg w-full border border-slate-100">
                {estado === 'aguardando' && (
                    <>
                        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-6" />
                        <h1 className="text-2xl font-black text-slate-900 mb-2">Confirmando seu pagamento…</h1>
                        <p className="text-slate-600">Isso leva só alguns segundos. Não feche esta página.</p>
                    </>
                )}

                {estado === 'ativo' && (
                    <>
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 mb-2">{precoDaTroca ? 'Plano alterado!' : 'Assinatura ativada!'}</h1>
                        <p className="text-slate-600 mb-8">
                            <span className="font-bold text-slate-800">{plano}</span> está ativo na sua empresa. Todos os recursos do plano já estão liberados.
                        </p>
                        <Button onClick={() => navigate('/')} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl gap-2">
                            Ir para o painel
                            <Home className="w-4 h-4" />
                        </Button>
                    </>
                )}

                {estado === 'demorando' && (
                    <>
                        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-6" />
                        <h1 className="text-2xl font-black text-slate-900 mb-2">Pagamento recebido, ativação a caminho</h1>
                        <p className="text-slate-600 mb-8">
                            A confirmação da Stripe está demorando mais que o normal. Seu plano será ativado sozinho em instantes; se não aparecer em alguns minutos, fale com o suporte.
                        </p>
                        <Button onClick={() => navigate('/')} className="w-full h-12 font-bold rounded-2xl">Ir para o painel</Button>
                    </>
                )}

                {estado === 'sem_login' && (
                    <>
                        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-6" />
                        <h1 className="text-2xl font-black text-slate-900 mb-2">Entre na sua conta</h1>
                        <p className="text-slate-600 mb-8">Entre com o e-mail e a senha que você cadastrou para ver o seu plano.</p>
                        <Button onClick={() => navigate('/login')} className="w-full h-12 font-bold rounded-2xl">Entrar</Button>
                    </>
                )}
            </div>
        </div>
    )
}

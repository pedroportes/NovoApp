import { useState } from 'react'
import { Check, Shield, Zap, Truck, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase' // Assuming this exists or similar
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export function Plans() {
    const { userData } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState<string | null>(null)

    // TODO: Substitua pelos IDs REAIS do seu Stripe (copie do painel)
    const PLANS = [
        {
            id: 'solo',
            stripe_price_id: 'price_1T02TLC2SBfOxdrqrdbCvFEQ',
            name: 'Plano Solo',
            price: 'R$ 59,90',
            period: '/mês',
            features: ['1 Usuário (Apenas Dono)', 'Sem acesso para técnicos', 'Gestão de Clientes', 'Ordens de Serviço Simples', 'Suporte por Email'],
            recommended: false,
            icon: Star
        },
        {
            id: 'essencial',
            stripe_price_id: 'price_1T02Y8C2SBfOxdrqfPf01e1C',
            name: 'Essencial',
            price: 'R$ 98,90',
            period: '/mês',
            features: ['Até 3 técnicos', 'Gestão Financeira Básica', 'Relatórios Simples', 'Suporte Horário Comercial'],
            recommended: false,
            icon: Star
        },
        {
            id: 'pro',
            stripe_price_id: 'price_1SsUaDC2SBfOxdrq9LBbQkcl',
            name: 'Pro Fluxo',
            price: 'R$ 129,90',
            period: '/mês',
            features: ['Até 5 técnicos', 'Gestão Financeira Completa', 'Relatórios Avançados', 'Suporte Prioritário'],
            recommended: true,
            icon: Zap
        },
        {
            id: 'operacional',
            stripe_price_id: 'price_1SsUe8C2SBfOxdrqRMtj4wjh',
            name: 'Operacional',
            price: 'R$ 249,90',
            period: '/mês',
            features: ['Até 10 técnicos', 'Gestão de Frotas', 'Rastreamento em Tempo Real', 'Gestor de Contas Dedicado'],
            recommended: false,
            icon: Truck
        },
        {
            id: 'prime',
            stripe_price_id: 'price_1SsUkBC2SBfOxdrqofDd7Euj',
            name: 'Prime Fleet',
            price: 'R$ 499,90',
            period: '/mês',
            features: ['Técnicos Ilimitados', 'API Personalizada', 'White Label (Sua Marca)', 'Atendimento 24/7'],
            recommended: false,
            icon: Shield
        },
        {
            id: 'teste',
            stripe_price_id: 'price_1SsN4HC2SBfOxdrq13q2V5ga',
            name: 'Plano Teste',
            price: 'R$ 1,99',
            period: '/mês',
            features: ['Plano para testes', 'Validação de comissão', 'Acesso completo (demo)', 'Cancelamento automático'],
            recommended: false,
            icon: Check
        }
    ]

    const handleSubscribe = async (priceId: string) => {
        try {
            setLoading(priceId)

            // Call Edge Function
            const affiliateId = localStorage.getItem('flowdrain_affiliate_id')
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    price_id: priceId,
                    affiliate_id: affiliateId,
                    success_url: `${window.location.origin}/sucesso`,
                    cancel_url: `${window.location.origin}/plans`,
                }
            })

            if (error) {
                console.error('Erro de Rede/Supabase:', error)
                throw new Error(error.message || 'Erro de conexão com o servidor')
            }

            // Agora a Function retorna 200 mesmo com erro para a gente conseguir ler.
            if (data && (data as any).error) {
                console.error('Erro retornado pelo Stripe:', data)
                throw new Error((data as any).error)
            }

            if (data?.url) {
                window.location.href = data.url
            }

        } catch (error: any) {
            console.error('Erro ao criar checkout:', error)
            alert(`Erro ao iniciar pagamento: ${error.message || error}`)
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-7xl mx-auto text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Escolha o Plano Ideal</h1>
                <p className="text-xl text-slate-600">Potencialize sua desentupidora com as ferramentas certas.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                {PLANS.map((plan) => {
                    const Icon = plan.icon
                    return (
                        <div
                            key={plan.id}
                            className={`relative bg-white rounded-2xl shadow-sm border p-8 flex flex-col ${plan.recommended ? 'border-blue-500 ring-2 ring-blue-500 shadow-xl scale-105 z-10' : 'border-slate-200 hover:border-blue-300 transition-all'}`}
                        >
                            {plan.recommended && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide">
                                    Mais Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${plan.recommended ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                                <div className="mt-2 flex items-baseline">
                                    <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                                    <span className="text-slate-500 ml-1">{plan.period}</span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start">
                                        <Check className="h-5 w-5 text-emerald-500 mr-2 shrink-0" />
                                        <span className="text-slate-600 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                className={`w-full h-12 font-bold ${plan.recommended ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
                                onClick={() => handleSubscribe(plan.stripe_price_id)}
                                disabled={loading === plan.stripe_price_id}
                            >
                                {loading === plan.stripe_price_id ? 'Processando...' : 'Assinar Agora'}
                            </Button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

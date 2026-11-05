import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

// Checkout da assinatura do FlowDrain. A assinatura é SEMPRE da empresa de quem está logado:
// o id da empresa vai no client_reference_id e nos metadados da sessão e da assinatura,
// e é por ele que o stripe-webhook liga o pagamento à empresa (nunca pelo e-mail digitado na Stripe).

// SECURITY: Restrict CORS to specific domain to prevent CSRF attacks
const allowedOrigins = [
    'https://app.gerenciaservicos.com.br',
    'http://localhost:5173',
    'http://localhost:4173'
]

// Preços aceitos (conta real da Stripe, conferidos em 05/11/2026). Qualquer outro é recusado.
const PRECOS_VALIDOS = new Set([
    'price_1T02TLC2SBfOxdrqrdbCvFEQ', // Solo
    'price_1T02Y8C2SBfOxdrqfPf01e1C', // Essencial
    'price_1SsUaDC2SBfOxdrq9LBbQkcl', // Pro Fluxo
    'price_1SsUe8C2SBfOxdrqRMtj4wjh', // Operacional
    'price_1SsUkBC2SBfOxdrqofDd7Euj', // Prime Fleet
    'price_1SsOJhC2SBfOxdrqy7Jf2xNO', // Teste de valor (R$ 1,99)
])
const PRECO_TESTE = 'price_1SsOJhC2SBfOxdrqy7Jf2xNO'

// MODO TESTE da Stripe (cartão 4242…, nada é cobrado): preço real → preço equivalente no modo teste.
// Só o super admin usa, e só numa empresa cujo nome começa com "TESTE " (nunca encosta em empresa real).
const PRECO_NO_MODO_TESTE: Record<string, string> = {
    'price_1T02TLC2SBfOxdrqrdbCvFEQ': 'price_1Su5WxC2SBfOxdrq59392S2M', // Solo
    'price_1T02Y8C2SBfOxdrqfPf01e1C': 'price_1Su5XbC2SBfOxdrqQryK1y1Q', // Essencial
    'price_1SsUaDC2SBfOxdrq9LBbQkcl': 'price_1Su5a1C2SBfOxdrqPhCj6qXz', // Pro Fluxo
    'price_1SsUe8C2SBfOxdrqRMtj4wjh': 'price_1Su5aVC2SBfOxdrqn8K8wS6t', // Operacional
    'price_1SsUkBC2SBfOxdrqofDd7Euj': 'price_1Su5b8C2SBfOxdrqV2fJ7z4X', // Prime Fleet
    'price_1SsOJhC2SBfOxdrqy7Jf2xNO': 'price_1Su5bTC2SBfOxdrqKe2j4p45', // Teste de valor
}

function getCorsHeaders(origin: string | null) {
    const isAllowed = origin && allowedOrigins.includes(origin)
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Credentials': 'true'
    }
}

// Volta só para o próprio app (evita mandar o cliente para um site qualquer)
function enderecoDoApp(url: unknown, origin: string | null): string {
    const base = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
    try {
        const u = new URL(String(url || ''), base)
        return allowedOrigins.includes(u.origin) ? `${u.origin}${u.pathname}` : `${base}/plans`
    } catch {
        return `${base}/plans`
    }
}

serve(async (req) => {
    const origin = req.headers.get('origin')
    const corsHeaders = getCorsHeaders(origin)

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Erros também voltam com 200 para a tela conseguir ler a mensagem (o invoke esconde o corpo de respostas 4xx)
    const responder = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
        )
        const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

        // 1. Precisa estar logado e ter empresa
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) return responder({ error: 'Entre na sua conta (ou crie uma) antes de assinar.' })

        const { data: profile } = await admin.from('usuarios').select('empresa_id, cargo, is_super_admin').eq('id', user.id).maybeSingle()
        let empresaId = profile?.empresa_id as string | undefined
        if (!empresaId) return responder({ error: 'Sua conta não tem empresa cadastrada.' })
        if (['tecnico', 'técnico'].includes(String(profile?.cargo || '').toLowerCase())) {
            return responder({ error: 'Só o administrador da empresa pode assinar um plano.' })
        }

        const { price_id, affiliate_id, success_url, cancel_url, teste_empresa_id } = await req.json()
        if (!PRECOS_VALIDOS.has(String(price_id))) return responder({ error: 'Plano inválido.' })
        // O plano de R$ 1,99 libera recursos do Pro: só o super admin pode comprá-lo (para testar a cobrança)
        if (price_id === PRECO_TESTE && !profile?.is_super_admin) return responder({ error: 'Plano inválido.' })

        // Modo teste: só super admin, só empresa "TESTE …", chave e preço de teste da Stripe
        const modoTeste = !!teste_empresa_id
        if (modoTeste) {
            if (!profile?.is_super_admin) return responder({ error: 'Modo teste só para o super admin.' })
            const { data: alvo } = await admin.from('empresas').select('id, nome').eq('id', String(teste_empresa_id)).maybeSingle()
            if (!alvo || !String(alvo.nome || '').startsWith('TESTE ')) {
                return responder({ error: 'Modo teste só em empresa cujo nome começa com "TESTE ".' })
            }
            empresaId = alvo.id
        }
        const STRIPE_KEY = Deno.env.get(modoTeste ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_SECRET_KEY')
        if (!STRIPE_KEY) throw new Error(`Configuração faltante: ${modoTeste ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_SECRET_KEY'} no Supabase.`)
        const stripe = new Stripe(STRIPE_KEY, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })
        const precoStripe = modoTeste ? PRECO_NO_MODO_TESTE[String(price_id)] : String(price_id)

        // 2. Um cliente da Stripe por empresa (reaproveita o que já existir; no modo teste cria um de teste)
        const { data: empresa } = await admin.from('empresas').select('nome, stripe_customer_id').eq('id', empresaId).maybeSingle()
        let customerId = modoTeste ? null : (empresa?.stripe_customer_id as string | null)
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: empresa?.nome || undefined,
                metadata: { empresa_id: empresaId },
            })
            customerId = customer.id
            if (!modoTeste) await admin.from('empresas').update({ stripe_customer_id: customerId }).eq('id', empresaId)
        }

        // 3. Sessão de pagamento ligada à empresa (price_id dos metadados é SEMPRE o preço real,
        //    para o webhook gravar o mesmo plano que um cliente real teria)
        const metadados: Record<string, string> = { empresa_id: empresaId!, price_id: String(price_id) }
        if (affiliate_id) metadados.affiliate_id = String(affiliate_id)
        if (modoTeste) metadados.modo = 'teste'

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            client_reference_id: empresaId,
            line_items: [{ price: precoStripe, quantity: 1 }],
            mode: 'subscription',
            subscription_data: { metadata: metadados },
            metadata: metadados,
            success_url: `${enderecoDoApp(success_url, origin)}?session_id={CHECKOUT_SESSION_ID}${modoTeste ? `&teste=${empresaId}` : ''}`,
            cancel_url: enderecoDoApp(cancel_url, origin),
        })

        return responder({ url: session.url })
    } catch (error: any) {
        console.error(`ERRO CRÍTICO: ${error.message}`)
        return responder({ error: error.message })
    }
})

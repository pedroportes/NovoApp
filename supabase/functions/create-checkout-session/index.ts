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

// MODO TESTE da Stripe (cartão 4242…, nada é cobrado). Só o super admin usa, e só numa empresa cujo
// nome começa com "TESTE " (nunca encosta em empresa real). O modo teste da conta não tem os mesmos
// preços, então o preço de teste é montado com o MESMO valor, moeda e periodicidade do plano real.
const PLANO_REAL: Record<string, { nome: string; centavos: number }> = {
    'price_1T02TLC2SBfOxdrqrdbCvFEQ': { nome: 'Plano Solo', centavos: 5990 },
    'price_1T02Y8C2SBfOxdrqfPf01e1C': { nome: 'Essencial', centavos: 9890 },
    'price_1SsUaDC2SBfOxdrq9LBbQkcl': { nome: 'Pro Fluxo', centavos: 12990 },
    'price_1SsUe8C2SBfOxdrqRMtj4wjh': { nome: 'Operacional', centavos: 24990 },
    'price_1SsUkBC2SBfOxdrqofDd7Euj': { nome: 'Prime Fleet', centavos: 49990 },
    'price_1SsOJhC2SBfOxdrqy7Jf2xNO': { nome: 'Teste de valor', centavos: 199 },
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
        const plano = PLANO_REAL[String(price_id)]
        const itemDoCheckout = modoTeste
            ? { price_data: { currency: 'brl', unit_amount: plano.centavos, recurring: { interval: 'month' as const }, product_data: { name: `${plano.nome} (modo teste)` } }, quantity: 1 }
            : { price: String(price_id), quantity: 1 }

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
            line_items: [itemDoCheckout],
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

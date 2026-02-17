import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

// SECURITY: Restrict CORS to specific domain to prevent CSRF attacks
const allowedOrigins = [
    'https://app.gerenciaservicos.com.br',
    'http://localhost:5173',
    'http://localhost:4173'
]

function getCorsHeaders(origin: string | null) {
    const isAllowed = origin && allowedOrigins.includes(origin)
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Credentials': 'true'
    }
}

serve(async (req) => {
    const origin = req.headers.get('origin')
    const corsHeaders = getCorsHeaders(origin)
    
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')
        if (!STRIPE_KEY) {
            throw new Error('Configuração faltante: STRIPE_SECRET_KEY não definida no Supabase.')
        }

        const stripe = new Stripe(STRIPE_KEY, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user } } = await supabaseClient.auth.getUser()
        
        let empresaId = null;
        let customer_id = null;

        if (user) {
            console.log(`Buscando perfil para o usuário logado: ${user.id}`)

            // 1. Get user profile to find empresa_id
            const { data: profile } = await supabaseClient
                .from('usuarios')
                .select('empresa_id')
                .eq('id', user.id)
                .single()

            if (profile?.empresa_id) {
                empresaId = profile.empresa_id;
                
                // 2. Get company data
                const { data: empresa } = await supabaseClient
                    .from('empresas')
                    .select('stripe_customer_id')
                    .eq('id', empresaId)
                    .single()

                if (empresa) {
                    customer_id = empresa.stripe_customer_id
                }
            }
        }

        const { price_id, affiliate_id, success_url, cancel_url } = await req.json()
        if (!price_id) throw new Error('O ID do preço (price_id) é obrigatório.')

        // Find or create customer (only if logged in and missing)
        if (user && !customer_id && empresaId) {
            console.log('Criando novo cliente no Stripe para usuário logado...')
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { empresa_id: empresaId }
            })
            customer_id = customer.id

            await supabaseClient
                .from('empresas')
                .update({ stripe_customer_id: customer_id })
                .eq('id', empresaId)
        }

        console.log(`Criando sessão de checkout (Customer: ${customer_id || 'Novo'})`)
        const session = await stripe.checkout.sessions.create({
            customer: customer_id || undefined,
            customer_email: !customer_id && user ? user.email : undefined,
            client_reference_id: affiliate_id || undefined,
            line_items: [{ price: price_id, quantity: 1 }],
            mode: 'subscription',
            success_url: user 
                ? `${success_url}?session_id={CHECKOUT_SESSION_ID}&email=${user.email}` 
                : `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancel_url,
            metadata: {
                empresa_id: empresaId,
                price_id: price_id,
                ref: affiliate_id // Redundant backup for client_reference_id
            }
        })

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        console.error(`ERRO CRÍTICO: ${error.message}`)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})

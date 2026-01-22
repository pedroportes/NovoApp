import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            throw new Error(`Falha na autenticação: ${authError?.message || 'Usuário não encontrado'}`)
        }

        console.log(`Buscando perfil para o usuário: ${user.id}`)

        // 1. Get user profile to find empresa_id
        const { data: profile, error: profileError } = await supabaseClient
            .from('usuarios')
            .select('empresa_id')
            .eq('id', user.id)
            .single()

        if (profileError || !profile?.empresa_id) {
            throw new Error(`Empresa não vinculada ao usuário: ${profileError?.message || 'Perfil incompleto'}`)
        }

        // 2. Get company data
        const { data: empresa, error: empresaError } = await supabaseClient
            .from('empresas')
            .select('*')
            .eq('id', profile.empresa_id)
            .single()

        if (empresaError || !empresa) {
            throw new Error(`Dados da empresa não localizados: ${empresaError?.message || 'Empresa sumiu'}`)
        }

        const { price_id, success_url, cancel_url } = await req.json()
        if (!price_id) throw new Error('O ID do preço (price_id) é obrigatório.')

        // Find or create customer
        let customer_id = empresa.stripe_customer_id
        if (!customer_id) {
            console.log('Criando novo cliente no Stripe...')
            const customer = await stripe.customers.create({
                email: user.email,
                name: empresa.nome || user.email,
                metadata: { empresa_id: empresa.id }
            })
            customer_id = customer.id

            await supabaseClient
                .from('empresas')
                .update({ stripe_customer_id: customer_id })
                .eq('id', empresa.id)
        }

        console.log(`Criando sessão de checkout para: ${customer_id}`)
        const session = await stripe.checkout.sessions.create({
            customer: customer_id,
            line_items: [{ price: price_id, quantity: 1 }],
            mode: 'subscription',
            success_url: success_url,
            cancel_url: cancel_url,
            metadata: {
                empresa_id: empresa.id,
                price_id: price_id
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

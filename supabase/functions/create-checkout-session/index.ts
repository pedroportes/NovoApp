import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0'

// Hardcoded for testing - Move to secrets later
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') || ''
const stripe = new Stripe(STRIPE_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user } } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error('Unauthorized')
        }

        // Get company data to link customer
        const { data: empresa } = await supabaseClient
            .from('empresas')
            .select('*')
            .eq('dono_id', user.id)
            .single()

        if (!empresa) throw new Error('Empresa não encontrada')

        const { price_id, success_url, cancel_url } = await req.json()

        // Find or create customer
        let customer_id = empresa.stripe_customer_id
        if (!customer_id) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: empresa.nome_fantasia || user.email,
                metadata: {
                    empresa_id: empresa.id
                }
            })
            customer_id = customer.id

            // Save customer_id
            await supabaseClient
                .from('empresas')
                .update({ stripe_customer_id: customer_id })
                .eq('id', empresa.id)
        }

        const session = await stripe.checkout.sessions.create({
            customer: customer_id,
            line_items: [
                {
                    price: price_id,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: success_url,
            cancel_url: cancel_url,
        })

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})

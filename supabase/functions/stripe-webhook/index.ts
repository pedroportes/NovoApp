import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') || ''
const ENDPOINT_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

const stripe = new Stripe(STRIPE_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature') || ''
    
    try {
        const body = await req.text()
        let event

        try {
            event = await stripe.webhooks.constructEventAsync(body, signature, ENDPOINT_SECRET)
            console.log(`✅ Evento verificado: ${event.type}`)
        } catch (err) {
            console.error(`⚠️ Falha na assinatura: ${err.message}`)
            return new Response(`Erro de Assinatura: ${err.message}`, { status: 400 })
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const customerEmail = session.customer_details?.email
            const customerName = session.customer_details?.name
            const subscriptionId = session.subscription

            console.log(`💰 Processando Checkout: ${customerEmail}`)

            // 1. Verificar se usuário existe
            const { data: profile } = await supabase
                .from('usuarios')
                .select('id, empresa_id')
                .eq('email', customerEmail)
                .maybeSingle()

            let userId = profile?.id

            if (!userId) {
                // Criar usuário se não existir
                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                    email: customerEmail,
                    password: 'FlowDrain 123',
                    email_confirm: true,
                    user_metadata: {
                        full_name: customerName,
                        nome_empresa: session.metadata?.nome_empresa || 'Minha Empresa',
                        must_change_password: true
                    }
                })
                
                if (authError) {
                    console.error('Erro Auth:', authError.message)
                } else {
                    userId = authUser.user.id
                }
            }

            // 2. Ativar empresa
            if (userId) {
                // Buscar empresa do usuário
                const { data: empresa } = await supabase
                    .from('empresas')
                    .select('id')
                    .eq('dono_id', userId)
                    .maybeSingle()

                if (empresa) {
                    await supabase.from('empresas').update({
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: subscriptionId,
                        subscription_status: 'active',
                        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias fallback
                    }).eq('id', empresa.id)
                    console.log(`✅ Empresa ${empresa.id} ativada!`)
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
    } catch (err) {
        console.error(err)
        return new Response(err.message, { status: 400 })
    }
})

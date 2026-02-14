import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

// Hardcoded for testing - Move to secrets later
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
    const signature = req.headers.get('Stripe-Signature')

    try {
        const body = await req.text()
        let event

        // SECURITY FIX: Fail-closed instead of fail-open
        // Always require webhook secret to be configured
        if (!ENDPOINT_SECRET || ENDPOINT_SECRET === 'whsec_REPLACE_ME' || ENDPOINT_SECRET === '') {
            console.error('🔴 STRIPE_WEBHOOK_SECRET not configured!')
            return new Response('Webhook secret not configured', { status: 500 })
        }

        // Always verify signature
        try {
            // Use async methods for Edge Runtime compatibility
            event = await stripe.webhooks.constructEventAsync(body, signature!, ENDPOINT_SECRET)
        } catch (err) {
            console.error(`⚠️  Webhook signature verification failed.`, (err as Error).message)
            return new Response((err as Error).message, { status: 400 })
        }

        console.log(`🔔  Event received: ${event.type}`)

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const customerId = session.customer as string
                const subscriptionId = session.subscription as string

                console.log(`💰 Checkout session completed for customer ${customerId}`)

                // Update company status to active
                const { error } = await supabase
                    .from('empresas')
                    .update({
                        stripe_subscription_id: subscriptionId,
                        subscription_status: 'active',
                        subscription_price_id: session.metadata?.price_id || session.subscription_price_id
                    })
                    .eq('stripe_customer_id', customerId)

                if (error) console.error('Error updating DB:', error)
                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object
                const customerId = subscription.customer
                const status = subscription.status
                const priceId = subscription.items.data[0].price.id
                const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

                console.log(`🔄 Subscription updated: ${customerId} -> ${status}`)

                const { error } = await supabase
                    .from('empresas')
                    .update({
                        stripe_subscription_id: subscription.id,
                        subscription_status: status,
                        subscription_price_id: priceId,
                        current_period_end: currentPeriodEnd
                    })
                    .eq('stripe_customer_id', customerId)

                if (error) console.error('Error updating DB:', error)
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object
                const customerId = subscription.customer

                console.log(`❌ Subscription canceled: ${customerId}`)

                // Update company status
                await supabase
                    .from('empresas')
                    .update({
                        subscription_status: 'canceled',
                    })
                    .eq('stripe_customer_id', customerId)

                // Mark affiliate sale as canceled
                await supabase.rpc('marcar_venda_cancelada', {
                    p_stripe_subscription_id: subscription.id
                })

                break
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object
                const customerId = invoice.customer
                const subscriptionId = invoice.subscription
                const valorPago = invoice.amount_paid / 100

                if (!subscriptionId) break;

                console.log(`💳 Payment succeeded for customer ${customerId}: $${valorPago}`)

                // 1. Get company and its affiliate
                const { data: empresa } = await supabase
                    .from('empresas')
                    .select('id, afiliado_id')
                    .eq('stripe_customer_id', customerId)
                    .single()

                if (empresa?.afiliado_id) {
                    // 2. Check if this sale record already exists in afiliados_vendas
                    const { data: existingVenda } = await supabase
                        .from('afiliados_vendas')
                        .select('id, total_meses_ativos')
                        .eq('stripe_subscription_id', subscriptionId)
                        .single()

                    if (!existingVenda) {
                        // NEW SALE: First payment
                        const { data: afiliado } = await supabase
                            .from('afiliados')
                            .select('percentual_comissao, tipo_comissao')
                            .eq('id', empresa.afiliado_id)
                            .single()

                        if (afiliado) {
                            const valorComissao = (valorPago * afiliado.percentual_comissao) / 100
                            
                            const { error: insertError } = await supabase.from('afiliados_vendas').insert({
                                afiliado_id: empresa.afiliado_id,
                                empresa_id: empresa.id,
                                stripe_subscription_id: subscriptionId,
                                stripe_customer_id: customerId,
                                valor_assinatura: valorPago,
                                valor_comissao: valorComissao,
                                tipo_comissao: afiliado.tipo_comissao,
                                status: 'ativa'
                            })

                            if (insertError) console.error('Error inserting affiliate sale:', insertError)
                        }
                    } else {
                        // RECURRING PAYMENT: Update existing record
                        const { data: afiliado } = await supabase
                            .from('afiliados')
                            .select('percentual_comissao, tipo_comissao')
                            .eq('id', empresa.afiliado_id)
                            .single()

                        if (afiliado && afiliado.tipo_comissao === 'recorrente') {
                            const valorComissao = (valorPago * afiliado.percentual_comissao) / 100
                            
                            const { error: rpcError } = await supabase.rpc('registrar_comissao_recorrente', {
                                p_stripe_subscription_id: subscriptionId,
                                p_valor_assinatura: valorPago,
                                p_valor_comissao: valorComissao
                            })

                            if (rpcError) console.error('Error calling registrar_comissao_recorrente:', rpcError)
                        }
                    }
                }
                break
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err) {
        console.error(err)
        return new Response(err.message, { status: 400 })
    }
})

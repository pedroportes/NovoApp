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

        // Verify signature if secret is provided
        if (ENDPOINT_SECRET !== 'whsec_REPLACE_ME') {
            try {
                // Use async methods for Edge Runtime compatibility
                event = await stripe.webhooks.constructEventAsync(body, signature!, ENDPOINT_SECRET)
            } catch (err) {
                console.error(`⚠️  Webhook signature verification failed.`, err.message)
                return new Response(err.message, { status: 400 })
            }
        } else {
            event = JSON.parse(body)
        }

        console.log(`🔔  Event received: ${event.type}`)

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const customerId = session.customer
                const subscriptionId = session.subscription
                // Metadata contains empresa_id if passed during checkout creation
                // But better to look up by stripe_customer_id

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

                const { error } = await supabase
                    .from('empresas')
                    .update({
                        subscription_status: 'canceled',
                    })
                    .eq('stripe_customer_id', customerId)

                if (error) console.error('Error updating DB:', error)
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

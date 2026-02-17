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
    console.log("🚀 Stripe Webhook v34: Loaded with config.toml (verify_jwt=false)")
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
                const customerEmail = session.customer_details?.email
                const customerName = session.customer_details?.name

                console.log(`💰 Checkout session completed for customer ${customerId} (${customerEmail})`)

                // Define variables outside the block scope so they can be used later
                let profile = null
                let authUser = null
                let newUser = null

                // 1. Auto-provision account if not exists
                if (customerEmail) {
                    console.log(`🔍 Checking if profile or Auth user exists for ${customerEmail}...`)
                    
                    // Check profile in public.usuarios
                    const { data: profileData } = await supabase
                        .from('usuarios')
                        .select('id, empresa_id')
                        .eq('email', customerEmail)
                        .maybeSingle()
                    profile = profileData

                    // Check user in Auth using a more direct method
                    const { data: { user: authUserData }, error: getAuthError } = await supabase.auth.admin.getUserByEmail(customerEmail)
                    authUser = authUserData

                    if (getAuthError && !getAuthError.message.includes('not found')) {
                        console.error('❌ Error checking auth user:', getAuthError)
                    }

                    if (profile) {
                         // SCENARIO 1: EXISTING USER (TRIAL/RETURNING)
                         // DO NOT CHANGE PASSWORD. DO NOT CHANGE METADATA (names/companies).
                         console.log(`✅ Profile correctly found for ${customerEmail}. Treating as EXISTING subscriber.`)
                         console.log(`👉 Action: Will only update subscription status in 'empresas' table.`)
                         // Link Auth User if missing for some reason
                         if (!authUser) {
                             console.warn(`⚠️ Profile exists but Auth User missing for ${customerEmail}. This is unusual.`)
                         } else {
                             authUser = authUserData;
                         }

                    } else {
                        // SCENARIO 2: NEW USER or ORPHANED AUTH USER
                        if (!authUser) {
                            console.log(`🆕 SCENARIO: New User. Creating account for ${customerEmail}...`)
                            // Create Auth User + Metadata which handles trigger
                            const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
                                email: customerEmail,
                                password: 'FlowDrain 123',
                                email_confirm: true,
                                user_metadata: {
                                    full_name: customerName || customerEmail,
                                    nome_empresa: session.metadata?.nome_empresa || 'Minha Empresa',
                                    must_change_password: true, // Force password change for new users
                                    referral_code: session.client_reference_id || session.metadata?.ref || session.metadata?.aff || null
                                }
                            })
                            newUser = newUserData

                            if (createError) {
                                console.error('❌ Error creating new user:', createError)
                            } else {
                                console.log(`✅ New User created successfully: ${newUser.user.id}`)
                            }
                        } else {
                            // Auth exists but NO PROFILE (Orphaned)
                            console.log(`🛠️ SCENARIO: Orphaned Auth User (${authUser.id}). Has Login but NO Profile.`)
                            console.log(`👉 Action: Resetting password to temp and forcing metadata update to trigger profile creation.`)
                            
                            const { error: updateError } = await supabase.auth.admin.updateUserById(
                                authUser.id,
                                {
                                    password: 'FlowDrain 123',
                                    user_metadata: {
                                        ...authUser.user_metadata,
                                        full_name: customerName || customerEmail,
                                        nome_empresa: session.metadata?.nome_empresa || 'Minha Empresa',
                                        must_change_password: true, // Force password change
                                        referral_code: session.client_reference_id || session.metadata?.ref || session.metadata?.aff || null
                                    }
                                }
                            )
                            
                            // MANUAL PROFILE CREATION (Fallback if trigger fails on UPDATE)
                            // Triggers often only run on INSERT. We must guarantee the profile exists.
                            const { error: manualProfileError } = await supabase.rpc('ensure_complete_signup', {
                                user_id: authUser.id,
                                user_email: customerEmail,
                                user_name: customerName || customerEmail,
                                company_name: session.metadata?.nome_empresa || 'Minha Empresa'
                            });

                            if (manualProfileError) {
                                console.error('❌ Error ensuring profile existence:', manualProfileError)
                            } else {
                                console.log(`✅ Profile enforced for orphaned user.`)
                            }

                            if (updateError) {
                                console.error('❌ Error updating orphaned user:', updateError)
                            }
                        }
                    }
                }

                // 2. Fetch full subscription details to get period end and price id
                let currentPeriodEnd = null
                let priceId = session.metadata?.price_id || null

                if (subscriptionId) {
                    try {
                        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
                        currentPeriodEnd = new Date(subscription.current_period_end * 1000)
                        priceId = subscription.items.data[0].price.id
                    } catch (e) {
                        console.error('Error fetching subscription details:', e)
                    }
                }

                // 3. Update company status to active
                // Resolve the company to update
                let targetEmpresaId = profile?.empresa_id;

                if (!targetEmpresaId) {
                    // If profile was just created by trigger, we might need to fetch it again or use dono_id
                    const currentUserId = authUser?.id || newUser?.user?.id;
                    console.log(`🔎 Empresa ID not in profile. Searching by dono_id: ${currentUserId}...`)
                    if (currentUserId) {
                        const { data: empresaByDono } = await supabase
                            .from('empresas')
                            .select('id')
                            .eq('dono_id', currentUserId)
                            .maybeSingle()
                        targetEmpresaId = empresaByDono?.id;
                        if (targetEmpresaId) console.log(`✅ Found company by dono_id: ${targetEmpresaId}`)
                        else console.log(`❌ Company not found by dono_id yet. Trigger might be pending.`)
                    }
                }

                if (targetEmpresaId) {
                    console.log(`🏢 Updating company ${targetEmpresaId} status to active...`)
                    const { error } = await supabase
                        .from('empresas')
                        .update({
                            stripe_customer_id: customerId,
                            stripe_subscription_id: subscriptionId,
                            subscription_status: 'active',
                            subscription_price_id: priceId,
                            current_period_end: currentPeriodEnd
                        })
                        .eq('id', targetEmpresaId)

                    if (error) console.error('❌ Error updating company after payment:', error)
                    else console.log(`✅ Company ${targetEmpresaId} is now active.`)
                } else {
                    console.error(`⚠️ Could not find company to update for ${customerEmail}`)
                }
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

// Recebe os avisos da Stripe e mantém a assinatura da empresa em dia (empresas.subscription_*).
// A empresa é achada pelo id que o create-checkout-session manda (client_reference_id / metadata.empresa_id)
// ou pela assinatura/cliente já gravados. NUNCA cria login: a conta é criada pela própria pessoa no cadastro.
//
// Aceita também o MODO TESTE da Stripe (destino de teste com segredo próprio). No modo teste só mexe em
// empresa cujo nome começa com "TESTE " e indicada nos metadados, e grava o preço REAL equivalente
// (metadata.price_id), para a liberação do plano no app seguir o mesmo caminho de um cliente real.

const opcoesStripe = { apiVersion: '2023-10-16' as const, httpClient: Stripe.createFetchHttpClient() }
const stripeReal = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', opcoesStripe)
const CHAVE_TESTE = Deno.env.get('STRIPE_TEST_SECRET_KEY') || ''
const stripeTeste = CHAVE_TESTE ? new Stripe(CHAVE_TESTE, opcoesStripe) : null

const SEGREDO_REAL = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
const SEGREDO_TESTE = Deno.env.get('STRIPE_TEST_WEBHOOK_SECRET') || ''

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Dias de tolerância depois de um pagamento recusado (o app continua liberado e mostra o aviso)
const DIAS_TOLERANCIA = 7

// Contexto de cada aviso: modo real ou teste, e o cliente Stripe do modo certo
interface Contexto { teste: boolean; stripe: Stripe }

const idDe = (x: unknown): string | null => (typeof x === 'string' ? x : (x as any)?.id ?? null)
const dataDe = (segundos: unknown) => (typeof segundos === 'number' ? new Date(segundos * 1000).toISOString() : null)

// Vencimento do período: no formato novo da Stripe ele fica no item da assinatura
function fimDoPeriodo(sub: any): string | null {
    return dataDe(sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end)
}
// Preço gravado na empresa: no modo teste, o preço REAL equivalente que o checkout pôs nos metadados
const precoDe = (sub: any, ctx: Contexto): string | null =>
    ctx.teste ? (sub?.metadata?.price_id ?? null) : (sub?.items?.data?.[0]?.price?.id ?? null)

const ehEmpresaDeTeste = (empresa: any) => String(empresa?.nome || '').startsWith('TESTE ')

// Acha a empresa: id mandado no checkout → assinatura gravada → cliente gravado.
// No modo teste só vale empresa "TESTE …" (e nunca pelo cliente, que é de teste).
async function acharEmpresa(ctx: Contexto, opcoes: { empresaId?: string | null; assinaturaId?: string | null; clienteId?: string | null }) {
    const campos = 'id, nome, stripe_subscription_id, subscription_status, grace_period_end'
    let achada: any = null
    if (opcoes.empresaId) {
        const { data } = await supabase.from('empresas').select(campos).eq('id', opcoes.empresaId).maybeSingle()
        achada = data
    }
    if (!achada && opcoes.assinaturaId) {
        const { data } = await supabase.from('empresas').select(campos).eq('stripe_subscription_id', opcoes.assinaturaId).maybeSingle()
        achada = data
    }
    if (!achada && opcoes.clienteId && !ctx.teste) {
        const { data } = await supabase.from('empresas').select(campos).eq('stripe_customer_id', opcoes.clienteId).maybeSingle()
        achada = data
    }
    if (achada && ctx.teste && !ehEmpresaDeTeste(achada)) {
        console.error(`⛔ Aviso do MODO TESTE apontando para empresa real ${achada.id}. Ignorado.`)
        return null
    }
    return achada
}

async function atualizar(empresaId: string, campos: Record<string, unknown>, ctx: Contexto) {
    const { error } = await supabase.from('empresas').update(campos).eq('id', empresaId)
    if (error) throw new Error(`Falha ao atualizar a empresa ${empresaId}: ${error.message}`)
    console.log(`✅ ${ctx.teste ? '[TESTE] ' : ''}Empresa ${empresaId}:`, JSON.stringify(campos))
}

// Grava a situação da assinatura na empresa (vale para criada/alterada/paga)
async function gravarAssinatura(ctx: Contexto, sub: any, empresaIdDoCheckout?: string | null) {
    // Assinatura criada pelo nosso checkout traz o id da empresa nos metadados
    const empresaIdInformado = empresaIdDoCheckout || sub?.metadata?.empresa_id || null
    const empresa = await acharEmpresa(ctx, {
        empresaId: empresaIdInformado,
        assinaturaId: sub.id,
        clienteId: idDe(sub.customer),
    })
    if (!empresa) {
        console.error(`⚠️ Assinatura ${sub.id} sem empresa ligada (cliente ${idDe(sub.customer)}). Nada gravado.`)
        return
    }
    // Uma assinatura antiga não pode sobrescrever a atual da empresa
    if (empresa.stripe_subscription_id && empresa.stripe_subscription_id !== sub.id && empresaIdInformado !== empresa.id) {
        console.log(`Ignorado: assinatura ${sub.id} não é a atual da empresa ${empresa.id} (${empresa.stripe_subscription_id}).`)
        return
    }

    const status = String(sub.status) // active, trialing, past_due, unpaid, canceled, incomplete...
    const campos: Record<string, unknown> = {
        stripe_subscription_id: sub.id,
        stripe_customer_id: idDe(sub.customer),
        subscription_status: status,
        current_period_end: fimDoPeriodo(sub),
    }
    const preco = precoDe(sub, ctx)
    if (preco) campos.subscription_price_id = preco

    if (status === 'active' || status === 'trialing') {
        campos.grace_period_end = null
    } else if (status === 'past_due' || status === 'unpaid') {
        // Prazo de tolerância conta do primeiro aviso de atraso
        if (!empresa.grace_period_end) campos.grace_period_end = new Date(Date.now() + DIAS_TOLERANCIA * 86400000).toISOString()
    } else if (status === 'canceled' || status === 'incomplete_expired') {
        campos.grace_period_end = null
    }
    await atualizar(empresa.id, campos, ctx)
}

// Confere o aviso. Real: assinatura digital com o segredo do destino real (sem exceção).
// Teste: assinatura com o segredo de teste, se bater; senão busca o MESMO aviso na Stripe pela API
// com a chave de teste e usa a versão que veio de lá (aviso inventado não existe na Stripe e é recusado).
async function verificarAviso(body: string, assinatura: string): Promise<{ event: any; ctx: Contexto }> {
    try {
        const event = await stripeReal.webhooks.constructEventAsync(body, assinatura, SEGREDO_REAL)
        return { event, ctx: { teste: false, stripe: stripeReal } }
    } catch (errReal) {
        if (!stripeTeste) throw errReal
        let recebido: any
        try { recebido = JSON.parse(body) } catch { throw errReal }
        // Aviso do modo real nunca entra pelo caminho de teste
        if (recebido?.livemode !== false || typeof recebido?.id !== 'string') throw errReal
        if (SEGREDO_TESTE) {
            try {
                const event = await stripeTeste.webhooks.constructEventAsync(body, assinatura, SEGREDO_TESTE)
                return { event, ctx: { teste: true, stripe: stripeTeste } }
            } catch { /* segredo de teste ausente ou diferente: confere pela API abaixo */ }
        }
        const event = await stripeTeste.events.retrieve(recebido.id)
        if (event.livemode) throw new Error('Aviso real no caminho de teste')
        return { event, ctx: { teste: true, stripe: stripeTeste } }
    }
}

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature') || ''

    try {
        const body = await req.text()
        let event: any
        let ctx: Contexto

        try {
            ({ event, ctx } = await verificarAviso(body, signature))
            console.log(`✅ Evento verificado${ctx.teste ? ' (MODO TESTE)' : ''}: ${event.type}`)
        } catch (err: any) {
            console.error(`⚠️ Falha na assinatura: ${err.message}`)
            return new Response(`Erro de Assinatura: ${err.message}`, { status: 400 })
        }

        const obj: any = event.data.object

        switch (event.type) {
            // Pagamento do checkout concluído: liga a assinatura à empresa de quem pagou
            case 'checkout.session.completed': {
                if (obj.mode !== 'subscription' || !obj.subscription) break
                const empresaId = obj.client_reference_id || obj.metadata?.empresa_id || null
                const sub = await ctx.stripe.subscriptions.retrieve(idDe(obj.subscription)!)
                if (!empresaId) console.warn(`Checkout ${obj.id} sem empresa_id; tentando pela assinatura/cliente.`)
                await gravarAssinatura(ctx, sub, empresaId)
                break
            }

            // Assinatura criada/alterada (troca de plano, renovação, atraso, reativação)
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await gravarAssinatura(ctx, obj)
                break

            // Assinatura encerrada (cancelada na Stripe ou por falta de pagamento)
            case 'customer.subscription.deleted': {
                const empresa = await acharEmpresa(ctx, { assinaturaId: obj.id })
                if (!empresa) {
                    console.log(`Cancelamento da assinatura ${obj.id}: nenhuma empresa usa essa assinatura. Nada a fazer.`)
                    break
                }
                await atualizar(empresa.id, { subscription_status: 'canceled', grace_period_end: null, current_period_end: fimDoPeriodo(obj) }, ctx)
                break
            }

            // Cobrança da renovação paga: confirma ativo e o novo vencimento
            case 'invoice.paid':
            case 'invoice.payment_succeeded': {
                const subId = idDe(obj.subscription ?? obj.parent?.subscription_details?.subscription)
                if (!subId) break
                await gravarAssinatura(ctx, await ctx.stripe.subscriptions.retrieve(subId))
                break
            }

            // Cobrança recusada: marca atraso e abre o prazo de tolerância
            case 'invoice.payment_failed': {
                const subId = idDe(obj.subscription ?? obj.parent?.subscription_details?.subscription)
                if (!subId) break
                const empresa = await acharEmpresa(ctx, { assinaturaId: subId })
                if (!empresa) break
                const campos: Record<string, unknown> = { subscription_status: 'past_due' }
                if (!empresa.grace_period_end) campos.grace_period_end = new Date(Date.now() + DIAS_TOLERANCIA * 86400000).toISOString()
                await atualizar(empresa.id, campos, ctx)
                break
            }

            default:
                console.log(`Evento ignorado: ${event.type}`)
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
    } catch (err: any) {
        console.error(err)
        // 500 faz a Stripe tentar de novo mais tarde
        return new Response(err.message, { status: 500 })
    }
})

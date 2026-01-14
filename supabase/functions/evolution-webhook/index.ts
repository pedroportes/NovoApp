import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const bodyText = await req.text()
        console.log('Raw body:', bodyText.substring(0, 100))

        let payload
        try {
            payload = JSON.parse(bodyText)
        } catch (e) {
            console.error('JSON parse fail')
            return new Response('Invalid JSON', { status: 400 })
        }

        // 1. Validar Evento
        const eventType = payload.event
        if (eventType !== 'messages.upsert') {
            return new Response('Ignored event', { status: 200 })
        }

        const data = payload.data
        const instanceName = payload.instance
        if (!data || !data.key) return new Response('Invalid data', { status: 200 })
        if (data.key.fromMe) return new Response('fromMe', { status: 200 })

        const messageText = data.message?.conversation ||
            data.message?.extendedTextMessage?.text ||
            data.message?.imageMessage?.caption

        if (!messageText) return new Response('No text', { status: 200 })
        const remoteJid = data.key.remoteJid

        // TESTE PING
        if (messageText.toUpperCase().trim() === 'PING') {
            const evoUrl = Deno.env.get('EVOLUTION_API_URL')
            const evoKey = Deno.env.get('EVOLUTION_API_KEY')
            if (evoUrl && evoKey) {
                const url = `${evoUrl.replace(/\/$/, '')}/message/sendText/${instanceName}`
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
                    body: JSON.stringify({
                        number: remoteJid.split('@')[0],
                        textMessage: { text: 'PONG! 🏓 Online!' }
                    })
                })
            }
            return new Response('PONG_OK', { status: 200 })
        }

        // Fluxo Normal
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        console.log('Fetching config for instance:', instanceName)
        const { data: config, error: configError } = await supabase.from('configuracoes_bot').select('*').eq('whatsapp_instance_name', instanceName).single()

        if (configError || !config) {
            console.error('Bot config not found:', configError)
            return new Response('No config', { status: 200 })
        }

        console.log('Using empresa_id:', config.empresa_id)

        // RAG Logic (Simplified for now to avoid crashes)
        let context = ""
        try {
            const genAI = new GoogleGenerativeAI(Deno.env.get('VITE_GEMINI_API_KEY')!)
            const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" })
            const emb = await embeddingModel.embedContent(messageText)

            const { data: docs } = await supabase.rpc('match_documents', {
                query_embedding: emb.embedding.values,
                match_threshold: 0.2,
                match_count: 5,
                filter_empresa_id: config.empresa_id
            })
            context = docs?.map((d: any) => d.conteudo).join('\n---\n') || ''
            console.log('RAG context chunks:', docs?.length || 0)
        } catch (e) {
            console.error('RAG failed:', e.message)
        }

        const genAI = new GoogleGenerativeAI(Deno.env.get('VITE_GEMINI_API_KEY')!)
        const model = genAI.getGenerativeModel({ model: "gemini-pro" })
        const prompt = `${config.system_prompt}\n\nCONTEXTO:\n${context}\n\nPergunta: ${messageText}`
        const result = await model.generateContent(prompt)
        const text = (await result.response).text()

        let evoUrl = Deno.env.get('EVOLUTION_API_URL') || ""
        const evoKey = Deno.env.get('EVOLUTION_API_KEY')

        // FORCE HTTP workaround for SSL issue
        if (evoUrl.startsWith('https://')) {
            console.log('Forcing HTTP due to SSL issues')
            evoUrl = evoUrl.replace('https://', 'http://')
        }

        if (evoUrl && evoKey) {
            const url = `${evoUrl.replace(/\/$/, '')}/message/sendText/${instanceName}`
            console.log('Final Send URL:', url)
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
                body: JSON.stringify({
                    number: remoteJid.split('@')[0],
                    textMessage: { text: text }
                })
            })
            console.log('Evolution response:', res.status)
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 })

    } catch (e) {
        console.error('CRITICAL:', e.message)
        return new Response(`FATAL_ERROR: ${e.message}`, { status: 500 })
    }
})

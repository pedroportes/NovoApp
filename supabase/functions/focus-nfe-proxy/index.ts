import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Validação de Autenticação Supabase
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ ok: false, status: 401, data: { message: 'Missing Authorization header' } }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return new Response(
                JSON.stringify({ ok: false, status: 401, data: { message: 'Unauthorized: Invalid Supabase session' } }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // 2. Validação dos Parâmetros
        const { url, method, body, token } = await req.json()

        if (!url || !method || !token) {
            return new Response(
                JSON.stringify({
                    ok: false,
                    status: 400,
                    data: { message: 'Missing required fields: url, method, token' }
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // 3. Whitelist Anti-SSRF (Permitir apenas domínios oficiais da Focus NF-e)
        const parsedUrl = new URL(url)
        const allowedHosts = ['api.focusnfe.com.br', 'homologacao.focusnfe.com.br']
        if (!allowedHosts.includes(parsedUrl.hostname) || parsedUrl.protocol !== 'https:') {
            return new Response(
                JSON.stringify({ ok: false, status: 403, data: { message: 'Forbidden: URL destination is not allowed' } }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        const auth = btoa(`${token}:`)

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        })

        const responseText = await response.text()
        let responseData
        try {
            responseData = JSON.parse(responseText)
        } catch {
            responseData = responseText
        }

        return new Response(JSON.stringify({
            ok: response.ok,
            status: response.status,
            data: responseData,
            debug: {
                authSent: `Basic ${auth}`,
                urlSent: url
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({
            ok: false,
            status: 500,
            data: { message: error.message }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

        if (!response.ok) {
            const errMsg = (responseData && typeof responseData === 'object')
                ? (responseData.mensagem || responseData.message || responseData.erro || JSON.stringify(responseData).slice(0, 300))
                : String(responseData).slice(0, 300)
            console.log(`[focus-nfe-proxy] ${method} ${url} -> status ${response.status} | erro: ${errMsg}`)
        }

        return new Response(JSON.stringify({
            ok: response.ok,
            status: response.status,
            data: responseData
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.log(`[focus-nfe-proxy] ERROR: ${error.message}`)
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

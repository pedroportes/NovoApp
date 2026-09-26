import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const { image, text } = body

        if (!image && !text) {
            throw new Error('Image base64 data or text is required')
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY')
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured in Supabase secrets')
        }

        const prompt = `
            Você é um assistente do FlowDrain especializado em desentupidoras.
            Seu objetivo é extrair os dados de um cliente para cadastro a partir de uma ficha manuscrita, print de tela do WhatsApp ou mensagem de texto.

            ATENÇÃO:
            - Extraia: nome, telefone (whatsapp com ddd se tiver), cep, logradouro (rua/av), numero, complemento, bairro, cidade, uf.
            - Retorne estritamente um JSON com este formato (valores null se não encontrar):
            {
              "nome": string | null,
              "telefone": string | null,
              "cep": string | null,
              "logradouro": string | null,
              "numero": string | null,
              "complemento": string | null,
              "bairro": string | null,
              "cidade": string | null,
              "uf": string | null
            }
        `

        const parts: any[] = [{ text: prompt }]

        if (text) {
            parts.push({ text: `Mensagem/Texto a analisar:\n${text}` })
        } else if (image) {
            let base64Data = image
            let mimeType = 'image/jpeg'

            if (image.startsWith('data:')) {
                const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
                if (matches) {
                    mimeType = matches[1]
                    base64Data = matches[2]
                } else {
                    base64Data = image.split(',')[1] || image
                }
            }

            parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            })
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            })
        })

        const geminiData = await response.json()

        if (!response.ok) {
            console.error('Gemini API Error:', geminiData)
            throw new Error(geminiData.error?.message || 'Erro na API do Google Gemini')
        }

        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        if (!rawText) {
            throw new Error('Nenhum dado retornado pela IA')
        }

        const parsedData = JSON.parse(rawText)

        return new Response(JSON.stringify(parsedData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})

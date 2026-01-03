// Setup:
// 1. Create a new Edge Function: supabase functions new process-handwriting
// 2. Set the secret: supabase secrets set OPENAI_API_KEY=your_api_key
// 3. Deploy: supabase functions deploy process-handwriting

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
        const { image } = await req.json()

        if (!image) {
            throw new Error('Image base64 data is required')
        }

        const apiKey = Deno.env.get('OPENAI_API_KEY')
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY not set')
        }

        // Remove header do base64 se existir (ex: data:image/jpeg;base64,)
        // OpenAI expects just the data URI scheme or URL usually, but for base64 inside content, 
        // we can pass the data URI directly.
        // Let's ensure it has the prefix for OpenAI or use the base64 string depending on format.
        // OpenAI Chat Completion with images accepts data URLs.

        let imageUrl = image;
        if (!image.startsWith('data:image')) {
            // If it's just raw base64, assume jpeg for simplicity or detect?
            // Client sends raw base64 usually? Let's check previous code.
            // Previous code stripped it: const base64Data = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
            // So client might send with or without. Let's make sure we have a proper Data URL.
            imageUrl = `data:image/jpeg;base64,${image}`
        }

        const prompt = `
      Analise esta imagem de uma ficha de cadastro manuscrita.
      Extraia os seguintes dados e retorne APENAS um JSON válido.
      Se um campo não estiver legível ou presente, retorne null.
      
      Estrutura do JSON:
      {
        "nome": string | null,
        "telefone": string | null (apenas números),
        "cep": string | null (apenas números),
        "logradouro": string | null,
        "numero": string | null,
        "complemento": string | null,
        "bairro": string | null,
        "cidade": string | null,
        "uf": string | null
      }
    `

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageUrl
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 300,
                response_format: { type: "json_object" }
            })
        })

        const openaiData = await response.json()

        if (!response.ok) {
            console.error('OpenAI Error:', openaiData)
            throw new Error(openaiData.error?.message || 'Erro na API da OpenAI')
        }

        const content = openaiData.choices[0].message.content
        const data = JSON.parse(content)

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Return 200 to allow client to read the error message
        })
    }
})

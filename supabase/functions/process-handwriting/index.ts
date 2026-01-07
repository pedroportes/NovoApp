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

        let imageUrl = image;
        if (!image.startsWith('data:')) {
            // Se vier sem prefixo, assume jpeg (mais comum) ou tenta detectar
            imageUrl = `data:image/jpeg;base64,${image}`
        }

        const prompt = `
            Analise esta imagem de uma nota ou ficha manuscrita.
            Seu objetivo é extrair os dados de um cliente para cadastro.

            ATENÇÃO CRÍTICA PARA O NOME:
            1. O nome do cliente pode estar indicado por setas (ex: "-> Flávio"), rótulos ("Nome:", "Cliente:") ou estar em destaque.
            2. Se houver algo como "R: Endereço -> Nome", extraia o Nome separadamente.
            3. Procure por nomes próprios (ex: Flávio, João, Maria, Empresa X).

            Extraia também:
            - Telefone (Whatsapp)
            - Endereço Completo: Logradouro (Rua/Av), Número, Complemento, Bairro, Cidade, UF, CEP.

            Retorne estritamente um JSON com este formato (valores null se não encontrar):
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
                max_tokens: 400,
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

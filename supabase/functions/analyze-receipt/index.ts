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
        const { image } = await req.json()

        // Validate image presence
        if (!image) {
            return new Response(
                JSON.stringify({ error: 'Image base64 data is required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const apiKey = Deno.env.get('OPENAI_API_KEY')
        if (!apiKey) {
            console.error('OPENAI_API_KEY is missing')
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        // Ensure Data URL format
        let imageUrl = image;
        if (!image.startsWith('data:image')) {
            imageUrl = `data:image/jpeg;base64,${image}`
        }

        const prompt = `
            Você é um assistente financeiro especializado em reembolso de despesas técnicas.
            Analise a imagem deste comprovante/nota fiscal e extraia os dados.
            
            Retorne APENAS um JSON válido com a seguinte estrutura:
            {
                "descricao": string, // Um título curto, ex: "Almoço Restaurante X", "Abastecimento Posto Y"
                "valor": string, // O valor total em formato numérico string, ex: "50.00"
                "categoria": "combustivel" | "alimentacao" | "material" | "outros" // Escolha a melhor categoria
            }
            
            Regras para Categoria:
            - Posto de gasolina, etanol, diesel -> "combustivel"
            - Restaurante, lanchonete, mercado, comida -> "alimentacao"
            - Peças, ferramentas, equipamentos -> "material"
            - Qualquer outra coisa -> "outros"

            Se não conseguir identificar algum campo, tente inferir. Se impossível, deixe null.
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
            return new Response(
                JSON.stringify({ error: openaiData.error?.message || 'OpenAI API Error' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        const content = openaiData.choices[0].message.content
        const data = JSON.parse(content)

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Edge Function Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

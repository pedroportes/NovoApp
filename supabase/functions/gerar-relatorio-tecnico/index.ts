// Redige os textos do Relatório Técnico de Serviço a partir do que o técnico marcou/anotou.
// A IA só reescreve em linguagem técnica formal: não cria fatos, medidas, causas, normas nem garantia.
// Secret necessário (já usado por process-handwriting): OPENAI_API_KEY
// Deploy: npx supabase functions deploy gerar-relatorio-tecnico

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const allowedOrigins = [
    'https://app.gerenciaservicos.com.br',
    'http://localhost:5173',
    'http://localhost:4173'
]

function corsHeaders(origin: string | null) {
    return {
        'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Vary': 'Origin'
    }
}

const REGRAS = `Você é um redator técnico de uma empresa de desentupimento e inspeção de redes hidrossanitárias no Brasil.
Sua tarefa é transformar as marcações e anotações do técnico em textos formais para um Relatório Técnico de Serviço entregue ao cliente.

REGRAS OBRIGATÓRIAS:
1. Use SOMENTE os fatos presentes nos dados recebidos. Nunca invente medidas, quantidades, horários, causas, materiais, equipamentos, defeitos ou resultados.
2. Nunca cite normas técnicas (ABNT/NBR etc.), leis, prazos de garantia ou valores.
3. Se um dado não foi informado, não o mencione. Se não houver base para um campo, devolva string vazia "".
4. Linguagem: português do Brasil, formal, impessoal, técnica e objetiva, em terceira pessoa ("Constatou-se", "Foi executado"). Frases curtas.
5. Não use exageros nem linguagem de venda. Não afirme certeza sobre causas marcadas como prováveis: use "provável", "indícios de".
6. Não repita o nome do cliente nem dados de cadastro nos textos.

Responda APENAS com um JSON com estas chaves (todas strings, exceto "legendas" que é uma lista de strings na mesma ordem das fotos recebidas):
{
  "relato_cliente": "motivo do chamado reescrito de forma formal (a partir do relato informado)",
  "constatacoes": "descrição técnica do que foi observado no local, com base nos pontos afetados, causas prováveis e anotações",
  "verificacao": "descrição da verificação realizada ao término e da situação final",
  "recomendacoes_outras": "recomendações adicionais que decorram diretamente das anotações do técnico (não repita as recomendações já marcadas)",
  "limitacoes": "limitações e observações citadas pelo técnico (trechos não acessados, restrições, fora do escopo)",
  "legendas": ["legenda formal e curta para cada foto, baseada apenas no momento e na descrição informada"]
}`

serve(async (req) => {
    const headers = corsHeaders(req.headers.get('origin'))
    if (req.method === 'OPTIONS') return new Response('ok', { headers })

    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })

    try {
        // 1. Somente usuário logado
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) return json({ error: 'Não autenticado' }, 401)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return json({ error: 'Sessão inválida' }, 401)

        const apiKey = Deno.env.get('OPENAI_API_KEY')
        if (!apiKey) return json({ error: 'OPENAI_API_KEY não configurada' }, 500)

        // 2. Monta apenas os fatos necessários (sem dados pessoais do cliente)
        const { dados } = await req.json()
        if (!dados || typeof dados !== 'object') return json({ error: 'Dados do relatório ausentes' }, 400)

        const fatos = {
            tipo_imovel: dados.cliente?.tipo_imovel === 'Outro' ? dados.cliente?.tipo_imovel_outro : dados.cliente?.tipo_imovel,
            tipo_atendimento: dados.atendimento?.tipo,
            relato_cliente: dados.atendimento?.relato_cliente,
            pontos_afetados: [...(dados.diagnostico?.pontos || []).filter((p: string) => p !== 'Outro'), dados.diagnostico?.ponto_outro].filter(Boolean),
            causas_provaveis: [...(dados.diagnostico?.causas || []).filter((c: string) => c !== 'Outra'), dados.diagnostico?.causa_outra].filter(Boolean),
            anotacoes_do_tecnico: dados.diagnostico?.anotacoes_tecnico,
            metodos: [...(dados.servico?.metodos || []).filter((m: string) => m !== 'Outro método'), dados.servico?.metodo_outro].filter(Boolean),
            equipamentos: dados.servico?.equipamentos,
            extensao_alcancada_m: dados.servico?.extensao_m,
            duracao: dados.servico?.duracao,
            videoinspecao: dados.videoinspecao?.realizada ? {
                trecho: dados.videoinspecao.trecho,
                extensao_m: dados.videoinspecao.extensao_m,
                condicoes: [...(dados.videoinspecao.condicoes || []).filter((c: string) => c !== 'Outra'), dados.videoinspecao.condicao_outra].filter(Boolean)
            } : 'não realizada',
            situacao_final: dados.resultado?.situacao,
            verificacao_informada: dados.resultado?.verificacao,
            recomendacoes_ja_marcadas: dados.recomendacoes?.marcadas || [],
            limitacoes_informadas: dados.limitacoes,
            fotos: (dados.fotos || []).map((f: any) => ({ momento: f.momento, descricao_do_tecnico: f.legenda || '' }))
        }

        // 3. Chamada à OpenAI com resposta estruturada
        const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o',
                temperature: 0.2,
                max_tokens: 1200,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: REGRAS },
                    { role: 'user', content: `Dados do atendimento (JSON):\n${JSON.stringify(fatos, null, 2)}` }
                ]
            })
        })

        const corpo = await resposta.json()
        if (!resposta.ok) {
            console.error('OpenAI:', corpo)
            return json({ error: corpo.error?.message || 'Erro na IA' }, 502)
        }

        const texto = JSON.parse(corpo.choices[0].message.content)
        const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
        const qtdFotos = fatos.fotos.length
        const legendas = Array.isArray(texto.legendas) ? texto.legendas.map(str).slice(0, qtdFotos) : []

        return json({
            relato_cliente: str(texto.relato_cliente),
            constatacoes: str(texto.constatacoes),
            verificacao: str(texto.verificacao),
            recomendacoes_outras: str(texto.recomendacoes_outras),
            limitacoes: str(texto.limitacoes),
            legendas
        })
    } catch (error) {
        console.error(error)
        return json({ error: (error as Error).message }, 500)
    }
})

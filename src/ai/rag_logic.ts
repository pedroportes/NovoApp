import { createClient } from '@supabase/supabase-js'

// ------------------------------------------------------------------
// CONFIGURAÇÃO
// ------------------------------------------------------------------
// Idealmente, estas funções devem rodar no Backend (Supabase Edge Functions)
// para proteger sua API Key da OpenAI/Gemini.
// Este arquivo serve como referência de IMPLEMENTAÇÃO LÓGICA.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY! // Nunca exponha isso no front!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ------------------------------------------------------------------
// TAREFA 1: GERAR EMBEDDINGS (Ingestão de Dados)
// ------------------------------------------------------------------

export async function generateEmbedding(text: string) {
    // Exemplo usando OpenAI (pode substituir por Gemini)
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: text.replace(/\n/g, ' ')
        })
    })

    const result = await response.json()
    return result.data[0].embedding as number[]
}

export async function ingestDocument(content: string, metadata: any) {
    console.log('🧠 Gerando embedding para o documento...')
    const embedding = await generateEmbedding(content)

    console.log('💾 Salvando no Supabase...')
    const { error } = await supabase
        .from('documentos_conhecimento')
        .insert({
            content,
            metadata,
            embedding
        })

    if (error) console.error('Erro ao salvar documento:', error)
    else console.log('✅ Documento indexado com sucesso!')
}

// ------------------------------------------------------------------
// TAREFA 2: BUSCA CONTEXTUAL (RAG)
// ------------------------------------------------------------------

export async function searchContext(query: string) {
    // 1. Gera embedding da pergunta do usuário
    const queryEmbedding = await generateEmbedding(query)

    // 2. Chama a RPC do Supabase para busca vetorial
    const { data: documents, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.78, // Ajuste a sensibilidade (0 a 1)
        match_count: 5          // Quantos trechos de contexto retornar
    })

    if (error) {
        console.error('Erro na busca vetorial:', error)
        return ""
    }

    // 3. Concatena os trechos encontrados
    const contextText = documents.map((doc: any) => doc.content).join('\n---\n')
    return contextText
}

// ------------------------------------------------------------------
// TAREFA 3: FUNÇÃO DE CHAT (O Cérebro)
// ------------------------------------------------------------------

export async function askFlowDrainAI(userQuestion: string) {
    console.log('🤔 Usuário perguntou:', userQuestion)

    // 1. Busca contexto relevante
    const context = await searchContext(userQuestion)

    if (!context) {
        return "Desculpe, não encontrei informações sobre isso na minha base de conhecimento."
    }

    // 2. Monta o Prompt para o LLM (Gemini ou GPT)
    const systemPrompt = `
    Você é o assistente virtual inteligente do FlowDrain SaaS.
    Use o contexto abaixo para responder à pergunta do usuário.
    Se a resposta não estiver no contexto, diga que não sabe, não invente.
    
    Contexto:
    ${context}
  `

    // 3. Chama o LLM (Exemplo genérico)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userQuestion }
            ]
        })
    })

    const result = await response.json()
    return result.choices[0].message.content
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai"

serve(async (req) => {

    // Helper Log
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const logDb = async (msg: string, meta: any = {}) => {
        try {
            // Trim meta if too large
            const cleanMeta = JSON.parse(JSON.stringify(meta, (k, v) => (typeof v === 'string' && v.length > 500) ? v.substring(0, 500) + '...' : v))
            await supabase.from('app_logs').insert({ message: msg, meta: cleanMeta, level: 'info' })
        } catch (e) { console.error('Log failed', e) }
    }

    try {
        // 1. Validate Method
        if (req.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 })
        }

        // 2. Auth
        const url = new URL(req.url)
        const clientToken = req.headers.get('Client-Token') || url.searchParams.get('client_token')

        await logDb('Z-API Hook Start', { method: req.method })

        if (!clientToken) return new Response('Unauthorized: Missing Client-Token', { status: 401 })

        const { data: config, error: configError } = await supabase
            .from('configuracoes_bot')
            .select('*')
            .eq('z_api_client_token', clientToken)
            .single()

        if (configError || !config) {
            await logDb('Config Load Fail', { error: configError })
            return new Response('Unauthorized: Invalid Token', { status: 401 })
        }

        // 3. Parse Incoming Message
        const body = await req.json()
        const msgText = body.text?.message || body.message || ''
        const senderPhone = body.phone
        const messageId = body.messageId || body.id || 'unknown'

        // Z-API sends status messages too, ignore them
        if (!body.phone) {
            return new Response(JSON.stringify({ ignored: true, reason: 'no_phone' }), { headers: { "Content-Type": "application/json" } })
        }

        await logDb(`Received msg from ${senderPhone}`, { msgText })

        // 3.1 HANDLE HUMAN INTERVENTION (Sent by Me)
        if (body.isFromMe) {
            await logDb('Human Intervention detected', { msgText })
            // Save to history as 'attendant' to trigger pause logic for future user messages
            if (msgText) {
                await supabase.from('chat_historico').insert({
                    empresa_id: config.empresa_id,
                    contact_phone: senderPhone,
                    role: 'attendant',
                    content: msgText, // Can be empty if it's an image/audio, but Z-API usually sends text rep
                    status: 'processed',
                    message_id_zapi: messageId
                })
            }
            return new Response(JSON.stringify({ success: true, type: 'human_intervention_recorded' }), { headers: { "Content-Type": "application/json" } })
        }

        if (body.isGroup || !msgText) {
            return new Response(JSON.stringify({ ignored: true }), { headers: { "Content-Type": "application/json" } })
        }

        // 4. BUFFER LOGIC START ----------------------------------------------------------------
        // Insert 'pending' message
        const { error: insertError } = await supabase.from('chat_historico').insert({
            empresa_id: config.empresa_id,
            contact_phone: senderPhone,
            role: 'user',
            content: msgText,
            status: 'pending',
            message_id_zapi: messageId
        })

        if (insertError) {
            await logDb('Error buffering message', { error: insertError })
        }

        // WAIT 15 SECONDS (Buffer)
        console.log(`Waiting 15s buffer for ${senderPhone}...`)
        // await logDb('Waiting buffer...') 
        await new Promise(resolve => setTimeout(resolve, 15000))

        // Check recent activity to see if we should yield execution
        const { data: latestPending } = await supabase
            .from('chat_historico')
            .select('created_at')
            .eq('empresa_id', config.empresa_id)
            .eq('contact_phone', senderPhone)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (latestPending) {
            const latestTime = new Date(latestPending.created_at).getTime()
            const now = Date.now()
            const age = now - latestTime

            // If the youngest message is less than 13s old, yield.
            if (age < 13000) {
                await logDb('Yielded to buffer', { age })
                return new Response(JSON.stringify({ status: 'yielded_to_buffer' }), { headers: { "Content-Type": "application/json" } })
            }
        }

        // BUFFER END: We are the chosen one.
        await logDb('Processing Buffer Batch', { phone: senderPhone })

        // 5. PAUSE LOGIC (Check for recent Attendant message) -----------------------------------
        // Check if there is any message from 'attendant' in the last 15 minutes
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

        const { data: recentHumanMsg } = await supabase
            .from('chat_historico')
            .select('id')
            .eq('empresa_id', config.empresa_id)
            .eq('contact_phone', senderPhone)
            .eq('role', 'attendant')
            .gt('created_at', fifteenMinutesAgo)
            .limit(1)

        if (recentHumanMsg && recentHumanMsg.length > 0) {
            await logDb('Paused by Human Intervention')

            // Mark all pending messages as 'ignored_by_pause' so they don't get stuck or reprocessed
            await supabase
                .from('chat_historico')
                .update({ status: 'ignored_by_pause' })
                .eq('empresa_id', config.empresa_id)
                .eq('contact_phone', senderPhone)
                .eq('status', 'pending')

            return new Response(JSON.stringify({ status: 'paused_by_human_intervention' }), { headers: { "Content-Type": "application/json" } })
        }

        // 6. AGGREGATE And PROCESS -------------------------------------------------------------
        const { data: batchMessages } = await supabase
            .from('chat_historico')
            .select('id, content')
            .eq('empresa_id', config.empresa_id)
            .eq('contact_phone', senderPhone)
            .eq('status', 'pending')
            .order('created_at', { ascending: true })

        if (!batchMessages || batchMessages.length === 0) return new Response('No messages', { status: 200 })

        const consolidatedText = batchMessages.map((m: any) => m.content).join('\n')

        // Mark as processed
        await supabase
            .from('chat_historico')
            .update({ status: 'processed' })
            .in('id', batchMessages.map((m: any) => m.id))


        // 7. RAG & HISTORY ---------------------------------------------------------------------
        const { data: docs } = await supabase.from('conhecimento_ia').select('conteudo').eq('empresa_id', config.empresa_id).limit(10)
        const contextText = docs?.map((d: any) => d.conteudo).join('\n\n') || ''

        const { data: history } = await supabase
            .from('chat_historico')
            .select('role, content')
            .eq('empresa_id', config.empresa_id)
            .eq('contact_phone', senderPhone)
            .neq('status', 'pending')
            .neq('status', 'ignored_by_pause')
            .neq('content', '{"tool":%') // Filter out raw tool calls from simple history
            .order('created_at', { ascending: false })
            .limit(15)

        const historyText = history?.reverse().map((h: any) => {
            const roleName = h.role === 'user' ? 'Cliente' : (h.role === 'model' ? 'Bot' : 'Atendente Humano');
            if (h.content.startsWith('TOOL_RESULT:')) {
                return `Sistema (Ação Anterior): ${h.content}`
            }
            return `${roleName}: ${h.content}`
        }).join('\n') || ''

        // 8. AGENT LOOP (Re-Act) ---------------------------------------------------------------
        await logDb('Starting Agent Loop')

        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '')
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        const systemPrompt = config.system_prompt || "Você é um assistente útil e direto."

        const toolsInstructions = `
        DATA E HORA ATUAL: ${now}

        FERRAMENTAS DISPONÍVEIS:
        Você pode executar ações no banco de dados. Responda APENAS um JSON: { "tool": "NOME", "args": { ... } }

        - consultar_cliente(telefone: string): Retorna dados cadastrais.
        - verificar_agenda(data: string): Retorna agendamentos do dia (YYYY-MM-DD).
        - consultar_meus_agendamentos(telefone: string): Retorna agendamentos futuros do cliente (incluindo técnico e status).
        - agendar_servico(data: string, horario: string, descricao: string, cliente_nome?: string): Cria agendamento.
           * data: YYYY-MM-DD
           * horario: HH:mm
           * descricao: Resumo do serviço
           * cliente_nome: Nome do cliente
        
        REGRAS CRÍTICAS:
        1. Se o cliente perguntar algo que exige dados, USE A FERRAMENTA.
        2. IMPORTANTE: Se a ferramenta retornar "Erro", VOCÊ DEVE PEDIR DESCULPAS E INFORMAR O ERRO. NÃO DIGA QUE AGENDOU SE DEU ERRO.
        3. Para agendar, execute a ferramenta e aguarde o "SUCESSO" no retorno.
        4. Se cliente perguntar "Quem é o técnico?", use consultar_meus_agendamentos.
        
        DIRETRIZES DE RESPOSTA (IMPORTANTE):
        - Seja extremamente natural e humano. Use emojis 😉.
        - Ao confirmar agendamento, diga algo como: "Perfeito! Agendei para o dia X às Y horas. O técnico [Nome] vai te atender."
        - NUNCA mostre IDs técnicos (UUIDs nonsense) para o usuário. Isso é feio.
        - Tente responder com perguntas para continuar a conversa se fizer sentido.
        `

        let currentIteration = 0
        const maxIterations = 3
        let finalResponse = ""
        let conversationContext = `
        ${systemPrompt}
        ${toolsInstructions}
        
        BASE DE CONHECIMENTO:
        ${contextText}

        HISTÓRICO:
        ${historyText}
        
        MENSAGEM ATUAL:
        ${consolidatedText}
        `

        // Temporary history for this execution loop
        let loopHistory = ""

        while (currentIteration < maxIterations) {
            currentIteration++
            const prompt = conversationContext + loopHistory
            await logDb(`Iteration ${currentIteration}`, { promptLength: prompt.length })

            const result = await model.generateContent(prompt)
            const textResponse = result.response.text().trim()

            await logDb(`Iteration ${currentIteration} Response`, { textResponse })

            // Check if response is a JSON Tool Call
            let toolCall = null
            try {
                const jsonMatch = textResponse.match(/\{[\s\S]*"tool"[\s\S]*\}/)
                if (jsonMatch) toolCall = JSON.parse(jsonMatch[0])
            } catch (e) { }

            if (toolCall && toolCall.tool) {
                console.log(`Tool Execution Detected: ${toolCall.tool}`)
                let toolResult = ""

                try {
                    await logDb(`Executing Tool: ${toolCall.tool}`, { args: toolCall.args })

                    if (toolCall.tool === 'consultar_cliente') {
                        const phoneToSearch = toolCall.args?.phone || toolCall.args?.telefone || senderPhone
                        const { data: clientData, error: clientError } = await supabase
                            .from('clientes')
                            .select('id, nome_razao, endereco, cidade, whatsapp')
                            .eq('empresa_id', config.empresa_id)
                            .ilike('whatsapp', `%${phoneToSearch.replace(/\D/g, '').slice(-8)}%`)
                            .limit(1)

                        if (clientError) throw clientError
                        toolResult = clientData && clientData.length > 0
                            ? `Cliente Encontrado: ${JSON.stringify(clientData[0])}`
                            : "Cliente não encontrado no banco de dados."

                    } else if (toolCall.tool === 'verificar_agenda') {
                        const date = toolCall.args?.data || toolCall.args?.date
                        if (!date) toolResult = "Erro: Data obrigatória."
                        else {
                            const startOfDay = `${date} 00:00:00`
                            const endOfDay = `${date} 23:59:59`
                            const { data: scheduleData, error: scheduleError } = await supabase
                                .from('ordens_servico')
                                .select('data_agendamento, status')
                                .eq('empresa_id', config.empresa_id)
                                .gte('data_agendamento', startOfDay)
                                .lte('data_agendamento', endOfDay)
                                .neq('status', 'cancelado')

                            if (scheduleError) throw scheduleError
                            const appointments = scheduleData?.map((o: any) => o.data_agendamento).join(', ') || "Nenhum agendamento."
                            toolResult = `Agendamentos em ${date}: ${appointments}.`
                        }
                    } else if (toolCall.tool === 'consultar_meus_agendamentos') {
                        let phoneInput = toolCall.args?.phone || toolCall.args?.telefone

                        // Sanity check: if model hallucinates placeholders
                        if (phoneInput && (phoneInput === 'string' || phoneInput.length < 5)) {
                            await logDb('Warning: Model hallucinated phone placeholders', { input: phoneInput })
                            phoneInput = null
                        }

                        const phoneToSearch = phoneInput || senderPhone

                        // 1. Get client ID first (safer)
                        const { data: clientData } = await supabase
                            .from('clientes')
                            .select('id, nome_razao')
                            .eq('empresa_id', config.empresa_id)
                            .ilike('whatsapp', `%${phoneToSearch.replace(/\D/g, '').slice(-8)}%`) // Last 8 digits
                            .limit(1)
                            .maybeSingle()

                        if (!clientData) {
                            toolResult = `Cliente não encontrado pelo telefone ${phoneToSearch}. Tente confirmar o número cadastrado.`
                        } else {
                            // 2. Fetch future OSs with technician details
                            const { data: orders, error: osError } = await supabase
                                .from('ordens_servico')
                                .select(`
                                    id, data_agendamento, status, descricao, previsao_chegada,
                                    tecnico:usuarios ( nome_completo )
                                `)
                                .eq('empresa_id', config.empresa_id)
                                .eq('cliente_id', clientData.id)
                                .gte('data_agendamento', new Date().toISOString()) // Only future
                                .order('data_agendamento', { ascending: true })

                            if (osError) throw osError

                            if (!orders || orders.length === 0) {
                                toolResult = `Cliente ${clientData.nome_razao} encontrado, mas nenhum agendamento futuro localizado.`
                            } else {
                                // Format friendly
                                const formatted = orders.map((os: any) => {
                                    const tech = os.tecnico?.nome_completo || 'Técnico Responsável'
                                    const dateObj = new Date(os.data_agendamento)
                                    const dateStr = dateObj.toLocaleDateString('pt-BR')
                                    const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                    return `📅 ${dateStr} às ${timeStr} | 👷 ${tech} | Status: ${os.status}`
                                }).join('\n')
                                toolResult = `Seus Agendamentos Encontrados:\n${formatted}`
                            }
                        }

                    } else if (toolCall.tool === 'agendar_servico') {
                        const { data: date, horario, descricao, cliente_nome } = toolCall.args
                        const dateTimeStr = `${date}T${horario}:00`

                        // 1. Client
                        const { data: clientData } = await supabase
                            .from('clientes')
                            .select('id, nome_razao')
                            .eq('empresa_id', config.empresa_id)
                            .ilike('whatsapp', `%${senderPhone.replace(/\D/g, '').slice(-8)}%`)
                            .limit(1)
                            .single()

                        const clientId = clientData?.id || null
                        const finalClientName = clientData?.nome_razao || cliente_nome || senderPhone

                        // 2. Find Technician Defaults (First active technician or admin found)
                        const { data: techData } = await supabase
                            .from('usuarios')
                            .select('id, nome_completo')
                            .eq('empresa_id', config.empresa_id)
                            .eq('active', true)
                            .limit(1)
                            .maybeSingle()

                        const techId = techData?.id || null
                        const techName = techData?.nome_completo || 'Técnico Responsável'

                        // 3. Insert PENDING
                        const { data: newOs, error: insertError } = await supabase
                            .from('ordens_servico')
                            .insert({
                                empresa_id: config.empresa_id,
                                cliente_id: clientId,
                                cliente_nome: finalClientName,
                                tecnico_id: techId, // Assign Tech
                                data_agendamento: dateTimeStr,
                                descricao: descricao || 'Agendamento via Bot',
                                status: 'PENDENTE',
                                previsao_chegada: dateTimeStr
                            })
                            .select()
                            .single()

                        if (insertError) throw insertError

                        toolResult = `SUCESSO: Agendado para ${date} às ${horario}. ID: ${newOs.id}. Técnico Atribuído: ${techName}. INSTRUÇÃO AO MODELO: Responda confirmando o agendamento com data, hora e o nome do técnico (${techName}). NÃO mostre o ID UUID.`

                    } else {
                        toolResult = "Ferramenta desconhecida."
                    }
                } catch (err: any) {
                    console.error("Tool Error:", err)
                    toolResult = `Erro na execução da ferramenta: ${err.message}`
                    await logDb('Tool Error', { toolResult })
                }

                loopHistory += `\n\n[ASSISTENTE]: ${textResponse}\n[SISTEMA - Resultado da Ferramenta]: ${toolResult}\n`

            } else {
                finalResponse = textResponse
                break
            }
        }

        if (!finalResponse) finalResponse = "Desculpe, tive um erro interno e não consegui processar."

        await logDb('AI Response Generated', { finalResponse })

        // 9. Split and Send Logic
        const parts = finalResponse.split(/---|(?:\r?\n){2,}/).map(s => s.trim()).filter(s => s)
        const zApiUrl = `https://api.z-api.io/instances/${config.z_api_instance_id}/token/${config.z_api_token}/send-text`

        for (const part of parts) {
            if (!part || (part.startsWith('{') && part.includes('"tool":'))) continue

            const delay = Math.min(7000, Math.max(3000, part.length * 60))
            await new Promise(r => setTimeout(r, delay))

            await fetch(zApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Client-Token': config.z_api_client_token
                },
                body: JSON.stringify({ phone: senderPhone, message: part })
            })
        }

        await supabase.from('chat_historico').insert({
            empresa_id: config.empresa_id,
            contact_phone: senderPhone,
            role: 'model',
            content: finalResponse,
            status: 'processed'
        })

        await logDb('Done')
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })

    } catch (error: any) {
        console.error(error)
        try { await logDb('FATAL', { msg: error.message }) } catch (e) { }
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
    }
})


import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { BotConfig, NormalizedMessage } from './types.ts';
import { WhatsAppAdapter } from './whatsapp-adapter.ts';

export class BotIntelligence {
    private static supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    private static supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    private static geminiKey = Deno.env.get('GEMINI_API_KEY') || "";

    private static splitMessage(text: string, maxLength: number): string[] {
        const parts: string[] = [];
        let remaining = text;
        while (remaining.length > 0) {
            if (remaining.length <= maxLength) { parts.push(remaining); break; }
            let breakPoint = -1;
            const searchRange = remaining.substring(0, maxLength);
            const lastPeriod = Math.max(searchRange.lastIndexOf('. '), searchRange.lastIndexOf('! '), searchRange.lastIndexOf('? '));
            if (lastPeriod > maxLength * 0.5) { breakPoint = lastPeriod + 1; }
            else {
                const lastComma = Math.max(searchRange.lastIndexOf(', '), searchRange.lastIndexOf('\n'));
                if (lastComma > maxLength * 0.3) { breakPoint = lastComma + 1; }
                else { breakPoint = searchRange.lastIndexOf(' '); if (breakPoint === -1) breakPoint = maxLength; }
            }
            parts.push(remaining.substring(0, breakPoint).trim());
            remaining = remaining.substring(breakPoint).trim();
        }
        return parts;
    }

    private static cleanResponse(text: string): string {
        let cleaned = text;
        cleaned = cleaned.replace(/```\w*\n?/g, '').replace(/```/g, '');
        // Remover JSON tool calls vazados
        cleaned = cleaned.replace(/\{[\s\S]*"tool"[\s\S]*\}/g, '');
        cleaned = cleaned.replace(/\{[\s\S]*"consultar_cliente"[\s\S]*\}/g, '');
        cleaned = cleaned.replace(/\{[\s\S]*"agendar_servico"[\s\S]*\}/g, '');
        cleaned = cleaned.replace(/\{[\s\S]*"verificar_agenda"[\s\S]*\}/g, '');
        cleaned = cleaned.replace(/\{[\s\S]*"consultar_meus_agendamentos"[\s\S]*\}/g, '');
        // Remover prefixos
        cleaned = cleaned.replace(/\[ASSISTENTE\]:\s*/gi, '');
        cleaned = cleaned.replace(/\[SISTEMA\]:\s*/gi, '');
        cleaned = cleaned.replace(/\[BOT\]:\s*/gi, '');
        cleaned = cleaned.replace(/^(Bot|Graça|Assistente|Graca):\s*/gim, '');
        // Remover emojis
        cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]/gu, '');
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        return cleaned.trim();
    }

    private static async callGeminiWithRetry(model: any, prompt: string, maxRetries: number = 3, logDb?: (msg: string, meta?: any) => Promise<void>): Promise<string> {
        const delays = [2000, 5000, 10000];
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                return result.response.text().trim();
            } catch (error: any) {
                const isRateLimit = error.message?.includes('429') || error.message?.includes('Resource exhausted');
                if (isRateLimit && attempt < maxRetries - 1) {
                    const delay = delays[attempt] || 10000;
                    if (logDb) await logDb(`Gemini Retry ${attempt + 1} in ${delay}ms`);
                    await new Promise(r => setTimeout(r, delay));
                } else { throw error; }
            }
        }
        throw new Error('Max retries exceeded');
    }

    static async processMessage(message: NormalizedMessage, config: BotConfig): Promise<void> {
        const supabase = createClient(this.supabaseUrl, this.supabaseKey);
        const logDb = async (msg: string, meta: any = {}) => { try { await supabase.from('app_logs').insert({ message: msg, meta: meta, level: 'info' }); } catch (e) { } };
        
        try {
            const senderPhone = message.from;
            const msgText = message.body;
            const messageId = message.messageId;
            if (message.isGroup || !msgText) return;
            
            await logDb(`Processing: ${senderPhone}`, { msgText });
            await supabase.from('chat_historico').insert({ empresa_id: config.empresa_id, contact_phone: senderPhone, role: 'user', content: msgText, status: 'pending', message_id_zapi: messageId });
            
            // Buffer de 8 segundos
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            const { data: latestPending } = await supabase.from('chat_historico').select('created_at').eq('empresa_id', config.empresa_id).eq('contact_phone', senderPhone).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).single();
            if (latestPending) { const age = Date.now() - new Date(latestPending.created_at).getTime(); if (age < 6000) { await logDb('Yielded to buffer'); return; } }
            
            // TRAVA DE 15 MINUTOS - Checar se atendente humano respondeu
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            const { data: recentHumanMsg } = await supabase.from('chat_historico').select('id, content').eq('empresa_id', config.empresa_id).eq('contact_phone', senderPhone).eq('role', 'attendant').gt('created_at', fifteenMinutesAgo).limit(1);
            
            if (recentHumanMsg && recentHumanMsg.length > 0) {
                await logDb('BOT PAUSADO - Atendente humano ativo', { lastHumanMsg: recentHumanMsg[0].content?.substring(0, 50) });
                await supabase.from('chat_historico').update({ status: 'ignored_human_active' }).eq('empresa_id', config.empresa_id).eq('contact_phone', senderPhone).eq('status', 'pending');
                return; // NAO RESPONDE - Atendente humano assumiu
            }
            
            const { data: batchMessages } = await supabase.from('chat_historico').select('id, content').eq('empresa_id', config.empresa_id).eq('contact_phone', senderPhone).eq('status', 'pending').order('created_at', { ascending: true });
            if (!batchMessages || batchMessages.length === 0) return;
            const consolidatedText = batchMessages.map((m: any) => m.content).join('\n');
            await supabase.from('chat_historico').update({ status: 'processed' }).in('id', batchMessages.map((m: any) => m.id));
            
            const { data: docs } = await supabase.from('conhecimento_ia').select('conteudo').eq('empresa_id', config.empresa_id).limit(10);
            const contextText = docs?.map((d: any) => d.conteudo).join('\n\n') || '';
            const { data: history } = await supabase.from('chat_historico').select('role, content').eq('empresa_id', config.empresa_id).eq('contact_phone', senderPhone).neq('status', 'pending').neq('status', 'ignored_human_active').order('created_at', { ascending: false }).limit(15);
            const historyText = history?.reverse().map((h: any) => { const roleName = h.role === 'user' ? 'Cliente' : 'Atendente'; return `${roleName}: ${h.content}`; }).join('\n') || '';
            
            await logDb('Starting AI');
            const genAI = new GoogleGenerativeAI(this.geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const systemPrompt = config.system_prompt || "Voce e um assistente util.";
            const toolsInstructions = `DATA: ${now}\nTELEFONE: ${senderPhone}\nResponda APENAS texto simples. Se precisar ferramenta, responda APENAS JSON puro.\nFERRAMENTAS:\n- consultar_cliente()\n- verificar_agenda(data)\n- consultar_meus_agendamentos()\n- agendar_servico(data, horario, descricao, cliente_nome, endereco)`;
            
            let currentIteration = 0; const maxIterations = 3; let finalResponse = ""; let loopHistory = "";
            const basePrompt = `${systemPrompt}\n${toolsInstructions}\nCONTEXTO: ${contextText}\nHISTORICO: ${historyText}\nMENSAGEM: ${consolidatedText}`;
            
            while (currentIteration < maxIterations) {
                currentIteration++;
                const prompt = basePrompt + loopHistory;
                const textResponse = await this.callGeminiWithRetry(model, prompt, 3, logDb);
                await logDb(`Iter ${currentIteration}`, { response: textResponse.substring(0, 200) });

                const trimmed = textResponse.trim();
                const isOnlyToolCall = trimmed.startsWith('{') || trimmed.startsWith('```');
                
                let toolCall = null;
                try { const m = textResponse.match(/\{[\s\S]*"tool"[\s\S]*\}/); if (m) toolCall = JSON.parse(m[0]); } catch (e) { }

                if (toolCall && !isOnlyToolCall && loopHistory.length > 0) {
                    const before = textResponse.split(/\{[\s\S]*"tool"/)[0].trim();
                    if (before.length > 20) { finalResponse = this.cleanResponse(before); break; }
                }

                if (toolCall && toolCall.tool) {
                    let result = "";
                    try {
                        if (toolCall.tool === 'consultar_cliente') { 
                            const phone = toolCall.args?.telefone || senderPhone; 
                            const { data: c } = await supabase.from('clientes').select('nome_razao, endereco').eq('empresa_id', config.empresa_id).ilike('whatsapp', `%${phone.replace(/\D/g, '').slice(-8)}%`).limit(1); 
                            result = c?.length ? `Cliente: ${c[0].nome_razao}, End: ${c[0].endereco || 'nao informado'}` : "Nao cadastrado."; 
                        }
                        else if (toolCall.tool === 'verificar_agenda') { 
                            const d = toolCall.args?.data; 
                            const { data: s } = await supabase.from('ordens_servico').select('data_agendamento').eq('empresa_id', config.empresa_id).gte('data_agendamento', `${d} 00:00:00`).lte('data_agendamento', `${d} 23:59:59`).neq('status', 'cancelado'); 
                            result = `${s?.length || 0} agendamentos em ${d}`; 
                        }
                        else if (toolCall.tool === 'consultar_meus_agendamentos') { 
                            const phone = senderPhone; 
                            const { data: c } = await supabase.from('clientes').select('id, nome_razao').eq('empresa_id', config.empresa_id).ilike('whatsapp', `%${phone.replace(/\D/g, '').slice(-8)}%`).maybeSingle(); 
                            if (c) { 
                                const { data: o } = await supabase.from('ordens_servico').select('data_agendamento, descricao, endereco, status').eq('cliente_id', c.id).gte('data_agendamento', new Date().toISOString()).order('data_agendamento').limit(5); 
                                result = o?.length ? o.map((x: any) => `${new Date(x.data_agendamento).toLocaleDateString('pt-BR')} - ${x.descricao || 'servico'} - ${x.status}`).join('; ') : 'Sem agendamentos futuros.'; 
                            } else result = 'Cliente nao cadastrado.'; 
                        }
                        else if (toolCall.tool === 'agendar_servico') {
                            const { data: d, horario: h, descricao: desc, cliente_nome: nome, endereco: end } = toolCall.args || {};
                            const dt = `${d}T${h}:00`;
                            const { data: c } = await supabase.from('clientes').select('id, nome_razao, endereco').eq('empresa_id', config.empresa_id).ilike('whatsapp', `%${senderPhone.replace(/\D/g, '').slice(-8)}%`).maybeSingle();
                            const { data: t } = await supabase.from('usuarios').select('id').eq('empresa_id', config.empresa_id).eq('active', true).limit(1).maybeSingle();
                            const { error } = await supabase.from('ordens_servico').insert({ empresa_id: config.empresa_id, cliente_id: c?.id, cliente_nome: nome || c?.nome_razao || senderPhone, tecnico_id: t?.id, data_agendamento: dt, descricao: desc || 'Agendamento WhatsApp', observacoes: desc, endereco: end || c?.endereco, status: 'PENDENTE' });
                            result = error ? `Erro: ${error.message}` : `Agendado ${d} as ${h}.`;
                        }
                    } catch (e: any) { result = `Erro: ${e.message}`; }
                    loopHistory += `\nResultado: ${result}\n`;
                } else { finalResponse = this.cleanResponse(textResponse); break; }
            }
            
            if (!finalResponse) finalResponse = "Desculpa, tive um probleminha. Pode repetir?";
            
            // Limpar qualquer JSON residual
            finalResponse = this.cleanResponse(finalResponse);
            
            await logDb('Final response', { response: finalResponse.substring(0, 100) });
            
            if (finalResponse.length > 300) {
                const parts = this.splitMessage(finalResponse, 300);
                for (let i = 0; i < parts.length; i++) {
                    if (i > 0) await new Promise(r => setTimeout(r, 3000));
                    await WhatsAppAdapter.sendMessage({ to: senderPhone, message: parts[i], config, logger: logDb });
                }
            } else {
                await WhatsAppAdapter.sendMessage({ to: senderPhone, message: finalResponse, config, logger: logDb });
            }
            
            await supabase.from('chat_historico').insert({ empresa_id: config.empresa_id, contact_phone: senderPhone, role: 'model', content: finalResponse, status: 'processed' });
        } catch (e: any) { await logDb('FATAL', { error: e.message }); }
    }
}

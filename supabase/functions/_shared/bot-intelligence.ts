
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
            const searchRange = remaining.substring(0, maxLength);
            const lastPeriod = Math.max(searchRange.lastIndexOf('. '), searchRange.lastIndexOf('! '), searchRange.lastIndexOf('? '));
            let breakPoint = lastPeriod > maxLength * 0.5 ? lastPeriod + 1 : searchRange.lastIndexOf(' ');
            if (breakPoint === -1) breakPoint = maxLength;
            parts.push(remaining.substring(0, breakPoint).trim());
            remaining = remaining.substring(breakPoint).trim();
        }
        return parts;
    }

    // LIMPEZA ULTRA AGRESSIVA v39
    private static cleanResponse(text: string): string {
        let cleaned = text;
        
        // Remover blocos JSON completos
        cleaned = cleaned.replace(/\{[\s\S]*?\}/g, '');
        
        // Remover chaves soltas { ou }
        cleaned = cleaned.replace(/[{}]/g, '');
        
        // Remover blocos markdown
        cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
        cleaned = cleaned.replace(/`[^`]*`/g, '');
        
        // Remover prefixos
        cleaned = cleaned.replace(/\[ASSISTENTE\]:?\s*/gi, '');
        cleaned = cleaned.replace(/\[SISTEMA\]:?\s*/gi, '');
        cleaned = cleaned.replace(/\[BOT\]:?\s*/gi, '');
        cleaned = cleaned.replace(/^(Bot|Gra[cç]a|Assistente):\s*/gim, '');
        
        // Remover mencoes a ferramentas e termos tecnicos
        cleaned = cleaned.replace(/consultar_cliente|consultar_meus_agendamentos|agendar_servico|verificar_agenda/gi, '');
        cleaned = cleaned.replace(/ferramenta|tool|"tool"|"ferramenta"|args|json/gi, '');
        
        // Remover linhas que parecem codigo (comeca com espacos/tabs)
        cleaned = cleaned.replace(/^[\t ]{2,}.*$/gm, '');
        
        // Remover emojis
        cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]/gu, '');
        
        // Limpar espacos e quebras
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        cleaned = cleaned.replace(/  +/g, ' ');
        cleaned = cleaned.replace(/^\s*\n/gm, '');
        
        return cleaned.trim();
    }

    private static async callGemini(model: any, prompt: string): Promise<string> {
        const delays = [2000, 5000, 10000];
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                return result.response.text().trim();
            } catch (error: any) {
                if ((error.message?.includes('429') || error.message?.includes('exhausted')) && attempt < 2) {
                    await new Promise(r => setTimeout(r, delays[attempt]));
                } else throw error;
            }
        }
        throw new Error('Max retries');
    }

    static async processMessage(message: NormalizedMessage, config: BotConfig): Promise<void> {
        const supabase = createClient(this.supabaseUrl, this.supabaseKey);
        const logDb = async (msg: string, meta: any = {}) => { try { await supabase.from('app_logs').insert({ message: msg, meta, level: 'info' }); } catch (e) { } };
        
        try {
            const senderPhone = message.from;
            const msgText = message.body;
            if (message.isGroup || !msgText) return;
            
            await logDb(`v40 Processing: ${senderPhone}`);
            
            // VERIFICAR BLACKLIST - Contatos bloqueados
            const { data: bloqueado } = await supabase
                .from('contatos_bloqueados')
                .select('id')
                .eq('empresa_id', config.empresa_id)
                .eq('telefone', senderPhone)
                .maybeSingle();
            
            if (bloqueado) {
                await logDb('Blocked contact - skipping', { phone: senderPhone });
                return; // Não responde a contatos bloqueados
            }
            
            await supabase.from('chat_historico').insert({ empresa_id: config.empresa_id, contact_phone: senderPhone, role: 'user', content: msgText, status: 'pending', message_id_zapi: message.messageId });
            
            await new Promise(r => setTimeout(r, 8000));
            
            const { data: latestPending } = await supabase.from('chat_historico').select('created_at').eq('empresa_id', config.empresa_id).eq('contact_phone', senderPhone).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).single();
            if (latestPending && Date.now() - new Date(latestPending.created_at).getTime() < 6000) return;
            
            const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            const { data: humanMsg } = await supabase.from('chat_historico').select('id').eq('empresa_id', config.empresa_id).eq('contact_phone', senderPhone).eq('role', 'attendant').gt('created_at', fifteenMinAgo).limit(1);
            if (humanMsg?.length) {
                await supabase.from('chat_historico').update({ status: 'ignored_human' }).eq('empresa_id', config.empresa_id).eq('contact_phone', senderPhone).eq('status', 'pending');
                return;
            }
            
            const { data: batch } = await supabase.from('chat_historico').select('id, content').eq('empresa_id', config.empresa_id).eq('contact_phone', senderPhone).eq('status', 'pending').order('created_at');
            if (!batch?.length) return;
            const consolidatedText = batch.map((m: any) => m.content).join('\n');
            await supabase.from('chat_historico').update({ status: 'processed' }).in('id', batch.map((m: any) => m.id));
            
            const { data: docs } = await supabase.from('conhecimento_ia').select('conteudo').eq('empresa_id', config.empresa_id).limit(5);
            const contextText = docs?.map((d: any) => d.conteudo).join('\n') || '';
            
            const { data: history } = await supabase.from('chat_historico').select('role, content').eq('empresa_id', config.empresa_id).eq('contact_phone', senderPhone).neq('status', 'pending').order('created_at', { ascending: false }).limit(10);
            const historyText = history?.reverse().map((h: any) => `${h.role === 'user' ? 'Cliente' : 'Atendente'}: ${h.content}`).join('\n') || '';
            
            const genAI = new GoogleGenerativeAI(this.geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const systemPrompt = config.system_prompt || "Voce e um assistente";
            const toolsInstructions = `DATA: ${now}\nTELEFONE: ${senderPhone}\nResponda APENAS texto natural. Se precisar dados, responda SO JSON puro: {"tool":"nome","args":{}}\nFERRAMENTAS: consultar_cliente(), verificar_agenda(data), consultar_meus_agendamentos(), agendar_servico(data,horario,descricao,cliente_nome,endereco)`;
            
            let finalResponse = '';
            let loopHistory = '';
            const basePrompt = `${systemPrompt}\n${toolsInstructions}\nCONTEXTO: ${contextText}\nHISTORICO: ${historyText}\nMENSAGEM: ${consolidatedText}`;
            
            for (let i = 0; i < 3; i++) {
                const textResponse = await this.callGemini(model, basePrompt + loopHistory);
                await logDb(`Iter ${i+1}`, { resp: textResponse.substring(0, 100) });
                
                const trimmed = textResponse.trim();
                if (trimmed.startsWith('{')) {
                    try {
                        const toolCall = JSON.parse(trimmed);
                        let result = '';
                        
                        if (toolCall.tool === 'consultar_cliente') {
                            const { data: c } = await supabase.from('clientes').select('nome_razao, endereco').eq('empresa_id', config.empresa_id).ilike('whatsapp', `%${senderPhone.slice(-8)}%`).limit(1);
                            result = c?.length ? `Cliente: ${c[0].nome_razao}, Endereco: ${c[0].endereco || 'nao informado'}` : 'Nao cadastrado';
                        } else if (toolCall.tool === 'verificar_agenda') {
                            const d = toolCall.args?.data;
                            const { data: s } = await supabase.from('ordens_servico').select('id').eq('empresa_id', config.empresa_id).gte('data_agendamento', `${d} 00:00:00`).lte('data_agendamento', `${d} 23:59:59`).neq('status', 'cancelado');
                            result = `${s?.length || 0} agendamentos em ${d}`;
                        } else if (toolCall.tool === 'consultar_meus_agendamentos') {
                            const { data: c } = await supabase.from('clientes').select('id, nome_razao').eq('empresa_id', config.empresa_id).ilike('whatsapp', `%${senderPhone.slice(-8)}%`).maybeSingle();
                            if (c) {
                                const { data: o } = await supabase.from('ordens_servico').select('data_agendamento, descricao, status').eq('cliente_id', c.id).gte('data_agendamento', new Date().toISOString()).order('data_agendamento').limit(5);
                                result = o?.length ? o.map((x: any) => `${new Date(x.data_agendamento).toLocaleDateString('pt-BR')} - ${x.descricao || 'servico'} (${x.status})`).join('; ') : 'Sem agendamentos futuros';
                            } else result = 'Cliente nao encontrado';
                        } else if (toolCall.tool === 'agendar_servico') {
                            const { data: d, horario: h, descricao: desc, cliente_nome: nome, endereco: end } = toolCall.args || {};
                            const { data: c } = await supabase.from('clientes').select('id, nome_razao, endereco').eq('empresa_id', config.empresa_id).ilike('whatsapp', `%${senderPhone.slice(-8)}%`).maybeSingle();
                            
                            // BUSCAR PROPRIETARIO/ADMIN como tecnico padrao (nao qualquer um)
                            const { data: owner } = await supabase.from('usuarios').select('id, nome_completo').eq('empresa_id', config.empresa_id).eq('cargo', 'admin').eq('active', true).limit(1).maybeSingle();
                            
                            const { error } = await supabase.from('ordens_servico').insert({
                                empresa_id: config.empresa_id,
                                cliente_id: c?.id,
                                cliente_nome: nome || c?.nome_razao || senderPhone,
                                tecnico_id: owner?.id || null,
                                data_agendamento: `${d}T${h}:00`,
                                descricao: desc || 'Via WhatsApp',
                                endereco: end || c?.endereco,
                                status: 'PENDENTE'
                            });
                            result = error ? `Erro: ${error.message}` : `Agendado ${d} as ${h}`;
                        }
                        loopHistory += `\nSistema: ${result}\n`;
                    } catch (e) { finalResponse = this.cleanResponse(textResponse); break; }
                } else {
                    finalResponse = this.cleanResponse(textResponse);
                    break;
                }
            }
            
            if (!finalResponse) finalResponse = 'Desculpa, tive um probleminha. Pode repetir?';
            finalResponse = this.cleanResponse(finalResponse);
            if (finalResponse.length < 5) finalResponse = 'Desculpa, tive um probleminha. Pode repetir?';
            
            await logDb('Final v39', { resp: finalResponse.substring(0, 80) });
            
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
        } catch (e: any) { await logDb('FATAL v39', { error: e.message }); }
    }
}

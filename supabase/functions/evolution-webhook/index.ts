import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WhatsAppAdapter } from '../_shared/whatsapp-adapter.ts';
import { BotIntelligence } from '../_shared/bot-intelligence.ts';
import { WhatsAppProvider, BotConfig } from '../_shared/types.ts';

serve(async (req) => {
    try {
        if (req.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        const url = new URL(req.url);
        const providedToken = req.headers.get('apikey') ||
            req.headers.get('Client-Token') ||
            req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ||
            url.searchParams.get('token') ||
            url.searchParams.get('apikey');

        const payload = await req.json();
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Sanitização rigorosa do nome da instância contra injeção no PostgREST
        const rawInstance = String(payload.instance || '').trim();
        const cleanInstance = rawInstance.replace(/[^a-zA-Z0-9_\-]/g, '');

        if (!cleanInstance) {
            return new Response('Invalid or missing instance', { status: 400 });
        }

        // Busca a configuração da instância de forma segura
        const { data: configData, error: configError } = await supabase
            .from('configuracoes_bot')
            .select('*')
            .or(`whatsapp_instance_name.eq.${cleanInstance},instance_id.eq.${cleanInstance}`)
            .maybeSingle();

        if (configError || !configData) {
            console.error('Instance not found or query error:', cleanInstance, configError);
            return new Response('Instance config not found', { status: 404 });
        }

        // Validação de autenticação: se a instância possui api_key, o webhook precisa enviar token correspondente
        if (configData.api_key && providedToken) {
            if (providedToken !== configData.api_key) {
                await supabase.from('app_logs').insert({
                    message: 'Evolution Webhook: Unauthorized token mismatch',
                    meta: { instance: cleanInstance },
                    level: 'warn'
                });
                return new Response('Unauthorized: Invalid token', { status: 401 });
            }
        } else if (configData.api_key && !providedToken) {
            await supabase.from('app_logs').insert({
                message: 'Evolution Webhook: Missing token for configured instance',
                meta: { instance: cleanInstance },
                level: 'warn'
            });
        }

        await supabase.from('app_logs').insert({
            message: `Evolution Webhook: ${payload.event}`,
            meta: { instance: cleanInstance, event: payload.event },
            level: 'info'
        });

        const eventType = payload.event;
        const msgData = payload.data;

        if (eventType !== 'messages.upsert') {
            return new Response('Ignored event', { status: 200 });
        }

        // Registrar mensagens do ATENDENTE HUMANO para ativar trava de 15 min
        if (msgData?.key?.fromMe) {
            const messageContent = msgData?.message || {};
            const msgText = messageContent.conversation || messageContent.extendedTextMessage?.text || '';
            const remoteJid = msgData?.key?.remoteJid || '';
            const contactPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');

            if (msgText && contactPhone && !remoteJid.includes('@g.us')) {
                await supabase.from('chat_historico').insert({
                    empresa_id: configData.empresa_id,
                    contact_phone: contactPhone,
                    role: 'attendant',
                    content: msgText,
                    status: 'processed'
                });
                await supabase.from('app_logs').insert({
                    message: 'Human attendant registered - Bot paused 15min',
                    meta: { phone: contactPhone, instance: cleanInstance },
                    level: 'info'
                });
            }
            return new Response('Attendant message registered', { status: 200 });
        }

        const message = WhatsAppAdapter.normalizeMessage(payload, WhatsAppProvider.EVOLUTION);
        if (!message) return new Response('Invalid message format', { status: 400 });

        const config: BotConfig = {
            id: configData.id,
            empresa_id: configData.empresa_id,
            provider: WhatsAppProvider.EVOLUTION,
            instance_name: configData.whatsapp_instance_name,
            api_key: configData.api_key,
            api_url: configData.api_url,
            instance_id: configData.instance_id,
            system_prompt: configData.system_prompt
        };

        await BotIntelligence.processMessage(message, config);

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        console.error('Webhook Error:', e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});

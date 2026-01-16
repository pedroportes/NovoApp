
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WhatsAppAdapter } from '../_shared/whatsapp-adapter.ts';
import { BotIntelligence } from '../_shared/bot-intelligence.ts';
import { WhatsAppProvider, BotConfig } from '../_shared/types.ts';

serve(async (req) => {
    try {
        const payload = await req.json();
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        
        await supabase.from('app_logs').insert({ message: `Evolution Webhook v37: ${payload.event}`, meta: { instance: payload.instance, event: payload.event }, level: 'info' });

        const eventType = payload.event;
        const msgData = payload.data;

        if (eventType !== 'messages.upsert') {
            return new Response('Ignored event', { status: 200 });
        }

        // IMPORTANTE: Registrar mensagens do ATENDENTE HUMANO para ativar trava de 15 min
        if (msgData?.key?.fromMe) {
            const messageContent = msgData?.message || {};
            const msgText = messageContent.conversation || messageContent.extendedTextMessage?.text || '';
            const remoteJid = msgData?.key?.remoteJid || '';
            const contactPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
            
            if (msgText && contactPhone && !remoteJid.includes('@g.us')) {
                const instanceName = payload.instance;
                const { data: configData } = await supabase
                    .from('configuracoes_bot')
                    .select('empresa_id')
                    .or(`whatsapp_instance_name.eq."${instanceName}",instance_id.eq."${instanceName}"`)
                    .maybeSingle();
                
                if (configData) {
                    await supabase.from('chat_historico').insert({
                        empresa_id: configData.empresa_id,
                        contact_phone: contactPhone,
                        role: 'attendant',
                        content: msgText,
                        status: 'processed'
                    });
                    await supabase.from('app_logs').insert({ message: 'Human attendant registered - Bot paused 15min', meta: { phone: contactPhone }, level: 'info' });
                }
            }
            return new Response('Attendant message registered', { status: 200 });
        }

        const message = WhatsAppAdapter.normalizeMessage(payload, WhatsAppProvider.EVOLUTION);
        if (!message) return new Response('Invalid message format', { status: 400 });

        const instanceName = message.to;
        const { data: configData, error: configError } = await supabase
            .from('configuracoes_bot')
            .select('*')
            .or(`whatsapp_instance_name.eq."${instanceName}",instance_id.eq."${instanceName}"`)
            .maybeSingle();

        if (configError || !configData) {
            console.error('Instance not found:', instanceName);
            return new Response('Instance config not found', { status: 404 });
        }

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

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        console.error('Webhook Error:', e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});

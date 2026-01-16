
import { WhatsAppProvider, NormalizedMessage, BotConfig, SendMessageParams } from './types.ts';

export class WhatsAppAdapter {
    static normalizeMessage(rawData: any, provider: WhatsAppProvider): NormalizedMessage | null {
        try {
            if (provider === WhatsAppProvider.ZAPI) return this.normalizeZAPIMessage(rawData);
            else if (provider === WhatsAppProvider.EVOLUTION) return this.normalizeEvolutionMessage(rawData);
            return null;
        } catch (error) { console.error('Normalize error:', error); return null; }
    }
    private static normalizeZAPIMessage(data: any): NormalizedMessage {
        const isGroup = data.isGroup || false;
        const from = isGroup ? (data.phone || data.participant) : data.phone;
        return { messageId: data.messageId || data.id, from: from, to: (data.instanceId || (data as any).instance) || '', body: data.text?.message || data.message || '', timestamp: data.momment || Date.now(), isGroup: isGroup, participantPhone: isGroup ? data.phone : undefined, messageType: 'text' };
    }
    private static normalizeEvolutionMessage(data: any): NormalizedMessage {
        const msgData = data.data || data;
        const key = msgData.key || {};
        const messageContent = msgData.message || {};
        const remoteJid = key.remoteJid || '';
        const isGroup = remoteJid.includes('@g.us');
        const from = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
        let body = messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.imageMessage?.caption || '';
        return { messageId: key.id, from: from, to: data.instance || msgData.instanceId || '', body: body, timestamp: (msgData.messageTimestamp || Date.now() / 1000) * 1000, isGroup: isGroup, participantPhone: key.participant ? key.participant.replace('@s.whatsapp.net', '') : undefined, messageType: 'text' };
    }
    static async sendMessage(params: SendMessageParams & { logger?: (msg: string, meta?: any) => Promise<void> }): Promise<boolean> {
        const { to, message, config, delay, logger } = params;
        if (delay) await new Promise(r => setTimeout(r, delay));
        try {
            if (config.provider === WhatsAppProvider.ZAPI) return await this.sendViaZAPI(to, message, config, logger);
            else if (config.provider === WhatsAppProvider.EVOLUTION) return await this.sendViaEvolution(to, message, config, logger);
            return false;
        } catch (e: any) { if (logger) await logger('WhatsAppAdapter Global Error', { error: e.message }); return false; }
    }
    private static async sendViaZAPI(to: string, message: string, config: any, logger?: (msg: string, meta?: any) => Promise<void>): Promise<boolean> {
        let url = config.api_url;
        if (!url && config.z_api_instance_id && config.z_api_token) url = `https://api.z-api.io/instances/${config.z_api_instance_id}/token/${config.z_api_token}/send-text`;
        if (!url) throw new Error('Z-API URL not configured');
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Client-Token': config.z_api_client_token || '' }, body: JSON.stringify({ phone: to, message: message }) });
        return res.ok;
    }
    private static async sendViaEvolution(to: string, message: string, config: any, logger?: (msg: string, meta?: any) => Promise<void>): Promise<boolean> {
        try {
            let baseUrl = config.api_url || '';
            if (!baseUrl) throw new Error('Evolution API URL is missing');
            baseUrl = baseUrl.replace(/\/$/, '');
            if (baseUrl.startsWith('http://')) baseUrl = baseUrl.replace('http://', 'https://');
            const instanceName = config.instance_id || config.instance_name;
            const url = `${baseUrl}/message/sendText/${instanceName}`;
            const apiKey = config.api_key;
            if (logger) await logger('Evolution: Preparing request (v37)', { url, instanceName });
            const payload = { number: to.replace(/\D/g, ''), text: message, delay: 1200, linkPreview: false };
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': apiKey || '' }, body: JSON.stringify(payload) });
            if (!response.ok) { const errorText = await response.text(); if (logger) await logger('Evolution: Error', { status: response.status, error: errorText }); return false; }
            if (logger) await logger('Evolution: Success (v37)');
            return true;
        } catch (error: any) { if (logger) await logger('Evolution: Fatal', { error: error.message }); return false; }
    }
}

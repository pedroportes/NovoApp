
export enum WhatsAppProvider {
    ZAPI = 'zapi',
    EVOLUTION = 'evolution'
}

export interface NormalizedMessage {
    messageId: string;
    from: string;
    to: string;
    body: string;
    timestamp: number;
    isGroup: boolean;
    participantPhone?: string;
    messageType: 'text' | 'image' | 'audio' | 'video' | 'document';
    mediaUrl?: string;
    senderName?: string;
}

export interface BotConfig {
    id: string;
    empresa_id: string;
    provider: WhatsAppProvider;
    instance_name: string;
    api_key?: string;
    api_url?: string;
    instance_id?: string;
    z_api_token?: string;
    z_api_client_token?: string;
    z_api_instance_id?: string;
    system_prompt?: string;
}

export interface SendMessageParams {
    to: string;
    message: string;
    config: BotConfig;
    delay?: number;
}

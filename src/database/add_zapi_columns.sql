-- Migration: Add Z-API columns to configuracoes_bot
-- Adiciona campos para armazenar credenciais da instância Z-API

ALTER TABLE public.configuracoes_bot
ADD COLUMN IF NOT EXISTS z_api_instance_id TEXT,
ADD COLUMN IF NOT EXISTS z_api_token TEXT,
ADD COLUMN IF NOT EXISTS z_api_client_token TEXT;

COMMENT ON COLUMN public.configuracoes_bot.z_api_instance_id IS 'ID da Instância Z-API';
COMMENT ON COLUMN public.configuracoes_bot.z_api_token IS 'Token da Instância Z-API';
COMMENT ON COLUMN public.configuracoes_bot.z_api_client_token IS 'Client Token para segurança do Webhook (header Client-Token)';

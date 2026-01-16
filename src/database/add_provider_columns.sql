-- Add provider support to configuracoes_bot table
-- We use IF NOT EXISTS to prevent errors if run multiple times
-- Defaults to 'zapi' to maintain compatibility with existing records

ALTER TABLE configuracoes_bot 
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'zapi',
ADD COLUMN IF NOT EXISTS api_url text, -- Generic API URL (for Evolution)
ADD COLUMN IF NOT EXISTS api_key text, -- Generic API Key (for Evolution)
ADD COLUMN IF NOT EXISTS instance_id text; -- Generic Instance ID (for Evolution)

-- Create index for faster lookups by provider
CREATE INDEX IF NOT EXISTS idx_configuracoes_bot_provider ON configuracoes_bot(provider);

-- Update detailed comment
COMMENT ON COLUMN configuracoes_bot.provider IS 'Provider do WhatsApp: zapi ou evolution';

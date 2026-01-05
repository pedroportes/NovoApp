-- Add location tracking columns to usuarios table
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ultimo_update timestamptz DEFAULT NULL;

-- Enable Realtime for usuarios table (if not already enabled globally)
-- Note: This usually needs to be done via Supabase Dashboard > Database > Replication
-- But we can try setting the publication if we have permissions
-- ALTER PUBLICATION supabase_realtime ADD TABLE usuarios;

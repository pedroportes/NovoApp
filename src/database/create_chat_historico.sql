CREATE TABLE IF NOT EXISTS public.chat_historico (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) NOT NULL,
    contact_phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    status TEXT DEFAULT 'processed', -- 'pending' para buffer
    message_id_zapi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_historico_processing ON public.chat_historico(empresa_id, contact_phone, status);
CREATE INDEX IF NOT EXISTS idx_chat_historico_lookup ON public.chat_historico(empresa_id, contact_phone, created_at DESC);

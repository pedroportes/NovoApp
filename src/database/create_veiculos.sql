-- Create veiculos table
CREATE TABLE IF NOT EXISTS public.veiculos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    placa VARCHAR(20) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    ano INTEGER,
    cor VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(empresa_id, placa)
);

-- Enable RLS
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view vehicles from their company" ON public.veiculos;
CREATE POLICY "Users can view vehicles from their company" ON public.veiculos
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can insert vehicles" ON public.veiculos;
CREATE POLICY "Admins can insert vehicles" ON public.veiculos
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.usuarios WHERE empresa_id = veiculos.empresa_id AND cargo = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update vehicles" ON public.veiculos;
CREATE POLICY "Admins can update vehicles" ON public.veiculos
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM public.usuarios WHERE empresa_id = veiculos.empresa_id AND cargo = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can delete vehicles" ON public.veiculos;
CREATE POLICY "Admins can delete vehicles" ON public.veiculos
    FOR DELETE USING (
        auth.uid() IN (
            SELECT id FROM public.usuarios WHERE empresa_id = veiculos.empresa_id AND cargo = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;

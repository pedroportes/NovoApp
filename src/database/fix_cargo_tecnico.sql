-- ===================================================
-- CORRIGIR CARGO DO TÉCNICO
-- ===================================================

-- 1. Verificar o cargo atual
SELECT id, email, cargo, empresa_id
FROM public.usuarios
WHERE email = 'pedrosportesfinal@gmail.com';

-- 2. CORRIGIR: Alterar cargo para 'tecnico'
UPDATE public.usuarios
SET cargo = 'tecnico'
WHERE email = 'pedrosportesfinal@gmail.com';

-- 3. Confirmar correção
SELECT id, email, cargo, empresa_id
FROM public.usuarios
WHERE email = 'pedrosportesfinal@gmail.com';

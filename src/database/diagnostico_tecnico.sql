-- ===================================================
-- SCRIPT DE DIAGNÓSTICO E CORREÇÃO
-- ===================================================

-- 1. Verificar se a função existe
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'create_technician_user';

-- 2. Listar técnicos criados recentemente (últimos 5)
SELECT 
    u.email,
    u.created_at as criado_em_auth,
    p.id as tem_perfil,
    p.cargo,
    p.empresa_id
FROM auth.users u
LEFT JOIN public.usuarios p ON u.id = p.id
WHERE u.created_at > NOW() - INTERVAL '1 hour'
ORDER BY u.created_at DESC
LIMIT 5;

-- 3. Se você vir um técnico com perfil NULL, execute este FIX:
-- (Substitua 'EMAIL_DO_TECNICO' pelo email real que apareceu acima)

/*
DO $$
DECLARE
    tech_id UUID;
    admin_empresa UUID;
BEGIN
    -- Pega ID do técnico sem perfil
    SELECT id INTO tech_id
    FROM auth.users
    WHERE email = 'EMAIL_DO_TECNICO';  -- SUBSTITUA AQUI
    
    -- Pega empresa_id do admin logado
    SELECT empresa_id INTO admin_empresa
    FROM public.usuarios
    WHERE cargo = 'admin'
    LIMIT 1;
    
    -- Cria perfil se não existir
    INSERT INTO public.usuarios (
        id,
        empresa_id,
        cargo,
        nome,
        email,
        commission_rate,
        base_salary
    ) VALUES (
        tech_id,
        admin_empresa,
        'tecnico',
        'Técnico Teste',
        'EMAIL_DO_TECNICO',  -- SUBSTITUA AQUI
        10.0,
        2000.0
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Perfil criado para técnico %', tech_id;
END $$;
*/

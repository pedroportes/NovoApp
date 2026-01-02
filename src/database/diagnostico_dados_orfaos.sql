-- ===================================================
-- DIAGNÓSTICO: Identificar dados sem empresa_id correto
-- ===================================================

-- 1. LISTAR TODAS AS EMPRESAS
SELECT 
    id as empresa_id,
    nome as empresa_nome,
    created_at
FROM empresas
ORDER BY created_at;

-- 2. LISTAR USUÁRIOS E SUAS EMPRESAS
SELECT 
    u.id,
    u.email,
    u.nome_completo as nome,
    u.cargo,
    u.empresa_id,
    e.nome as empresa_nome
FROM usuarios u
LEFT JOIN empresas e ON u.empresa_id = e.id
ORDER BY u.created_at DESC;

-- 3. IDENTIFICAR USUÁRIOS SEM EMPRESA (ÓRFÃOS)
SELECT 
    id,
    email,
    nome_completo,
    cargo,
    empresa_id
FROM usuarios
WHERE empresa_id IS NULL
   OR empresa_id NOT IN (SELECT id FROM empresas);

-- 4. LISTAR CLIENTES E SUAS EMPRESAS
SELECT 
    c.id,
    c.nome_razao,
    c.empresa_id,
    e.nome as empresa_nome
FROM clientes c
LEFT JOIN empresas e ON c.empresa_id = e.id
ORDER BY c.created_at DESC
LIMIT 20;

-- 5. IDENTIFICAR CLIENTES SEM EMPRESA OU COM EMPRESA ERRADA
SELECT 
    id,
    nome_razao,
    empresa_id
FROM clientes
WHERE empresa_id IS NULL
   OR empresa_id NOT IN (SELECT id FROM empresas);

-- ===================================================
-- CORREÇÃO: Atribuir empresa_id correto
-- ===================================================

-- OPÇÃO A: Se você tem APENAS 1 empresa, atribui todos a ela
/*
DO $$
DECLARE
    main_empresa_id UUID;
BEGIN
    -- Pega o ID da primeira/única empresa
    SELECT id INTO main_empresa_id FROM empresas LIMIT 1;
    
    -- Atualiza usuários órfãos
    UPDATE usuarios
    SET empresa_id = main_empresa_id
    WHERE empresa_id IS NULL OR empresa_id NOT IN (SELECT id FROM empresas);
    
    -- Atualiza clientes órfãos
    UPDATE clientes
    SET empresa_id = main_empresa_id
    WHERE empresa_id IS NULL OR empresa_id NOT IN (SELECT id FROM empresas);
    
    RAISE NOTICE 'Dados atualizados para empresa %', main_empresa_id;
END $$;
*/

-- OPÇÃO B: Se você tem VÁRIAS empresas, me diga quantas você tem
-- que eu crio um script específico para distribuir corretamente

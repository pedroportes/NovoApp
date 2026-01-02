-- =====================================================
-- CRIAR EMPRESA E ADMIN (VERSÃO CORRIGIDA)
-- =====================================================

-- ⚠️ EXECUTE CADA PASSO SEPARADAMENTE!

-- =====================================================
-- PASSO 1: CRIAR EMPRESA (execute isto primeiro)
-- =====================================================

INSERT INTO empresas (id, nome, cpf_cnpj, telefone, email, endereco)
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',  -- ID fixo para facilitar
    'Minha Desentupidora',                    -- MUDE AQUI: Nome da empresa
    '12.345.678/0001-90',                     -- MUDE AQUI: CNPJ
    '(41) 99999-9999',                        -- MUDE AQUI: Telefone
    'contato@minhaempresa.com',               -- MUDE AQUI: Email empresa
    'Rua Principal, 123'                      -- MUDE AQUI: Endereço
);

-- Verificar se criou:
SELECT * FROM empresas;

-- =====================================================
-- PASSO 2: CRIAR ADMIN NO AUTH.USERS (execute segundo)
-- =====================================================

-- Habilitar pgcrypto se necessário
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Criar usuário no auth
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '11111111-2222-3333-4444-555555555555',  -- ID fixo do admin
    'authenticated',
    'authenticated',
    'admin@minhaempresa.com',                 -- MUDE AQUI: Email login
    crypt('senha123', gen_salt('bf')),        -- MUDE AQUI: Senha
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Meu Nome"}'::jsonb,        -- MUDE AQUI: Seu nome
    false,
    NOW(),
    NOW()
);

-- =====================================================
-- PASSO 3: CRIAR PERFIL NA TABELA USUARIOS (execute terceiro)
-- =====================================================

INSERT INTO usuarios (
    id,
    empresa_id,
    cargo,
    nome,
    email
) VALUES (
    '11111111-2222-3333-4444-555555555555',  -- Mesmo ID do auth
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',  -- ID da empresa (passo 1)
    'admin',
    'Meu Nome',                               -- MUDE AQUI: Seu nome
    'admin@minhaempresa.com'                  -- MUDE AQUI: Email (igual passo 2)
);

-- =====================================================
-- PASSO 4: VERIFICAR SE DEU CERTO
-- =====================================================

SELECT 
    u.email,
    u.nome,
    u.cargo,
    e.nome as empresa
FROM usuarios u
JOIN empresas e ON u.empresa_id = e.id;

-- ✅ Se aparecer seu email, nome, cargo=admin e empresa, FUNCIONOU!
-- Agora pode fazer login em http://localhost:5173/login

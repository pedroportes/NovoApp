-- =====================================================
-- LIMPEZA COMPLETA - TODAS AS TABELAS
-- =====================================================

-- ⚠️ ATENÇÃO: Este script DELETA TUDO!

-- Deletar na ordem correta (das dependências para as principais)

-- PASSO 1: Deletar financeiro_fluxo (referencia usuarios)
DELETE FROM financeiro_fluxo;

-- PASSO 2: Deletar despesas de técnicos (referencia usuarios)
DELETE FROM despesas_tecnicos;

-- PASSO 3: Deletar ordens de serviço (referencia clientes)
DELETE FROM ordens_servico;

-- PASSO 4: Deletar clientes
DELETE FROM clientes;

-- PASSO 5: Deletar serviços (se existir)
DO $$
BEGIN
    DELETE FROM servicos;
EXCEPTION WHEN undefined_table THEN
    NULL; -- Tabela não existe, ok
END $$;

-- PASSO 6: Deletar usuários
DELETE FROM usuarios;

-- PASSO 7: Deletar empresas
DELETE FROM empresas;

-- PASSO 8: Limpar auth.users
DO $$
BEGIN
    DELETE FROM auth.users;
    RAISE NOTICE '✅ Limpeza concluída!';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Aviso: % - OK', SQLERRM;
END $$;

-- PASSO 9: Verificar
SELECT 
    (SELECT COUNT(*) FROM empresas) as empresas,
    (SELECT COUNT(*) FROM usuarios) as usuarios,
    (SELECT COUNT(*) FROM clientes) as clientes,
    (SELECT COUNT(*) FROM ordens_servico) as ordens,
    (SELECT COUNT(*) FROM despesas_tecnicos) as despesas,
    (SELECT COUNT(*) FROM financeiro_fluxo) as financeiro;

-- ✅ Tudo zerado? Execute criar_empresa_admin.sql

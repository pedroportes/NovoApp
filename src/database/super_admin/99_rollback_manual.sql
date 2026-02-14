-- 99_rollback_manual.sql
-- REVERSÃO TOTAL DAS ALTERAÇÕES DO SUPER ADMIN.
-- Execute APENAS se precisar desfazer tudo.

-- 1. Reverter Policies RLS (Restaurar condições originais sem Super Admin)
-- NOTA: Você deve executar o script inverso do "03_update_rls.sql" se tiver aplicado.
-- Abaixo, um exemplo genérico para reverter a tabela "empresas". Repita para outras se necessário.
-- DROP POLICY IF EXISTS "Allow all for authenticated" ON public.empresas;
-- CREATE POLICY "Allow all for authenticated" ON public.empresas FOR ALL USING (auth.role() = 'authenticated');
-- (Ajuste conforme suas policies originais exatas)

-- 2. Remover a função auxiliar
DROP FUNCTION IF EXISTS public.is_super_admin();

-- 3. Remover a coluna is_super_admin
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS is_super_admin;

-- 4. Restaurar obrigatoriedade de empresa_id (OPCIONAL - Cuidado se tiver usuários com NULL)
-- Apenas execute se tiver certeza que nenhum usuário ficou com empresa_id NULL indevidamente.
-- UPDATE public.usuarios SET empresa_id = [ID_PADRAO] WHERE empresa_id IS NULL;
-- ALTER TABLE public.usuarios ALTER COLUMN empresa_id SET NOT NULL;

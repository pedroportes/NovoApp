-- 03_update_rls.sql
-- Atualiza as políticas de segurança (RLS) para permitir acesso total ao Super Admin.
-- OBS: As políticas originais foram preservadas e adicionado "OR public.is_super_admin()".

-- ==============================================================================
-- TABELA: usuarios
-- ==============================================================================

-- 1. Leitura segura de usuarios
DROP POLICY IF EXISTS "Leitura segura de usuarios" ON public.usuarios;
CREATE POLICY "Leitura segura de usuarios" ON public.usuarios
FOR SELECT USING (
  (empresa_id = ((auth.jwt() ->> 'empresa_id'::text))::uuid) 
  OR (id = auth.uid())
  OR public.is_super_admin() -- ADICIONADO
);

-- ==============================================================================
-- TABELA: clientes
-- ==============================================================================

-- 2. Clientes visíveis por empresa (SELECT)
DROP POLICY IF EXISTS "Clientes visíveis por empresa" ON public.clientes;
CREATE POLICY "Clientes visíveis por empresa" ON public.clientes
FOR SELECT USING (
  (empresa_id IN ( SELECT usuarios.empresa_id FROM usuarios WHERE (usuarios.id = auth.uid())))
  OR public.is_super_admin() -- ADICIONADO
);

-- 3. Atualizar clientes da empresa (UPDATE)
DROP POLICY IF EXISTS "Atualizar clientes da empresa" ON public.clientes;
CREATE POLICY "Atualizar clientes da empresa" ON public.clientes
FOR UPDATE USING (
  (empresa_id IN ( SELECT usuarios.empresa_id FROM usuarios WHERE (usuarios.id = auth.uid())))
  OR public.is_super_admin() -- ADICIONADO
);

-- 4. Excluir clientes da empresa (DELETE)
DROP POLICY IF EXISTS "Excluir clientes da empresa" ON public.clientes;
CREATE POLICY "Excluir clientes da empresa" ON public.clientes
FOR DELETE USING (
  (empresa_id IN ( SELECT usuarios.empresa_id FROM usuarios WHERE (usuarios.id = auth.uid())))
  OR public.is_super_admin() -- ADICIONADO
);

-- 5. Criar clientes na empresa (INSERT)
DROP POLICY IF EXISTS "Criar clientes na empresa" ON public.clientes;
CREATE POLICY "Criar clientes na empresa" ON public.clientes
FOR INSERT WITH CHECK (
  (empresa_id IN ( SELECT usuarios.empresa_id FROM usuarios WHERE (usuarios.id = auth.uid())))
  OR public.is_super_admin() -- ADICIONADO
);


-- ==============================================================================
-- TABELA: ordens_servico
-- ==============================================================================

-- 6. Users can view service orders from their company (SELECT)
DROP POLICY IF EXISTS "Users can view service orders from their company" ON public.ordens_servico;
CREATE POLICY "Users can view service orders from their company" ON public.ordens_servico
FOR SELECT USING (
  (empresa_id = ( SELECT usuarios.empresa_id FROM usuarios WHERE (usuarios.id = auth.uid())))
  OR public.is_super_admin() -- ADICIONADO
);

-- 7. Users can update service orders from their company (UPDATE)
DROP POLICY IF EXISTS "Users can update service orders from their company" ON public.ordens_servico;
CREATE POLICY "Users can update service orders from their company" ON public.ordens_servico
FOR UPDATE USING (
  (empresa_id = ( SELECT usuarios.empresa_id FROM usuarios WHERE (usuarios.id = auth.uid())))
  OR public.is_super_admin() -- ADICIONADO
);

-- 8. Users can delete service orders from their company (DELETE)
DROP POLICY IF EXISTS "Users can delete service orders from their company" ON public.ordens_servico;
CREATE POLICY "Users can delete service orders from their company" ON public.ordens_servico
FOR DELETE USING (
  (empresa_id = ( SELECT usuarios.empresa_id FROM usuarios WHERE (usuarios.id = auth.uid())))
  OR public.is_super_admin() -- ADICIONADO
);

-- 9. Users can create service orders for their company (INSERT)
DROP POLICY IF EXISTS "Users can create service orders for their company" ON public.ordens_servico;
CREATE POLICY "Users can create service orders for their company" ON public.ordens_servico
FOR INSERT WITH CHECK (
  (empresa_id = ( SELECT usuarios.empresa_id FROM usuarios WHERE (usuarios.id = auth.uid())))
  OR public.is_super_admin() -- ADICIONADO
);


-- ==============================================================================
-- TABELA: financeiro_fluxo
-- ==============================================================================

-- 10. fluxo_all (ALL)
DROP POLICY IF EXISTS "fluxo_all" ON public.financeiro_fluxo;
CREATE POLICY "fluxo_all" ON public.financeiro_fluxo
FOR ALL USING (
  (empresa_id IN ( SELECT usuarios.empresa_id FROM usuarios WHERE (usuarios.id = auth.uid())))
  OR public.is_super_admin() -- ADICIONADO
);

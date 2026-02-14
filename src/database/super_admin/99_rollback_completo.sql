-- 99_ROLLBACK_COMPLETO.sql
-- Gerado em: 2026-02-14 09:30 BRT
-- REVERTE TODAS as alterações do Super Admin executadas nesta sessão.
-- EXECUTE APENAS SE ALGO QUEBRAR.

-- =============================================
-- 1. Restaurar empresa_id do Pedro Portes
-- =============================================
UPDATE public.usuarios
SET empresa_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
WHERE email = 'pedrosportes@gmail.com';

-- =============================================
-- 2. Remover função is_super_admin()
-- =============================================
DROP FUNCTION IF EXISTS public.is_super_admin();

-- =============================================
-- 3. Restaurar policies ORIGINAIS (SEM is_super_admin)
-- =============================================

-- USUARIOS
DROP POLICY IF EXISTS "Leitura segura de usuarios" ON public.usuarios;
CREATE POLICY "Leitura segura de usuarios" ON public.usuarios
FOR SELECT USING ((empresa_id = ((auth.jwt() ->> 'empresa_id'::text))::uuid) OR (id = auth.uid()));

-- CLIENTES
DROP POLICY IF EXISTS "Clientes visíveis por empresa" ON public.clientes;
CREATE POLICY "Clientes visíveis por empresa" ON public.clientes
FOR SELECT USING (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "Atualizar clientes da empresa" ON public.clientes;
CREATE POLICY "Atualizar clientes da empresa" ON public.clientes
FOR UPDATE USING (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "Excluir clientes da empresa" ON public.clientes;
CREATE POLICY "Excluir clientes da empresa" ON public.clientes
FOR DELETE USING (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "Criar clientes na empresa" ON public.clientes;
CREATE POLICY "Criar clientes na empresa" ON public.clientes
FOR INSERT WITH CHECK (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

-- ORDENS_SERVICO
DROP POLICY IF EXISTS "Users can view service orders from their company" ON public.ordens_servico;
CREATE POLICY "Users can view service orders from their company" ON public.ordens_servico
FOR SELECT USING (empresa_id = (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "Users can update service orders from their company" ON public.ordens_servico;
CREATE POLICY "Users can update service orders from their company" ON public.ordens_servico
FOR UPDATE USING (empresa_id = (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete service orders from their company" ON public.ordens_servico;
CREATE POLICY "Users can delete service orders from their company" ON public.ordens_servico
FOR DELETE USING (empresa_id = (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "Users can create service orders for their company" ON public.ordens_servico;
CREATE POLICY "Users can create service orders for their company" ON public.ordens_servico
FOR INSERT WITH CHECK (empresa_id = (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

-- FINANCEIRO_FLUXO
DROP POLICY IF EXISTS "fluxo_all" ON public.financeiro_fluxo;
CREATE POLICY "fluxo_all" ON public.financeiro_fluxo
FOR ALL USING (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "financeiro_admin_tudo" ON public.financeiro_fluxo;
CREATE POLICY "financeiro_admin_tudo" ON public.financeiro_fluxo
FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE usuarios.id = auth.uid() AND usuarios.cargo = 'admin'::text));

DROP POLICY IF EXISTS "financeiro_tecnico_proprio" ON public.financeiro_fluxo;
CREATE POLICY "financeiro_tecnico_proprio" ON public.financeiro_fluxo
FOR SELECT USING (usuario_id = auth.uid());

-- EMPRESAS
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.empresas;
CREATE POLICY "Allow all for authenticated" ON public.empresas
FOR ALL USING (auth.role() = 'authenticated'::text);

-- SERVICOS
DROP POLICY IF EXISTS "Empresa pode ver seus servicos" ON public.servicos;
CREATE POLICY "Empresa pode ver seus servicos" ON public.servicos
FOR SELECT USING (empresa_id = (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "Empresa pode criar seus servicos" ON public.servicos;
CREATE POLICY "Empresa pode criar seus servicos" ON public.servicos
FOR INSERT WITH CHECK (empresa_id = (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "Empresa pode atualizar seus servicos" ON public.servicos;
CREATE POLICY "Empresa pode atualizar seus servicos" ON public.servicos
FOR UPDATE USING (empresa_id = (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "Empresa pode deletar seus servicos" ON public.servicos;
CREATE POLICY "Empresa pode deletar seus servicos" ON public.servicos
FOR DELETE USING (empresa_id = (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

-- DESPESAS_TECNICOS
DROP POLICY IF EXISTS "Despesas permissions" ON public.despesas_tecnicos;
CREATE POLICY "Despesas permissions" ON public.despesas_tecnicos
FOR ALL USING (empresa_id = ((auth.jwt() ->> 'empresa_id'::text))::uuid);

DROP POLICY IF EXISTS "Technicians manage own expenses" ON public.despesas_tecnicos;
CREATE POLICY "Technicians manage own expenses" ON public.despesas_tecnicos
FOR ALL USING (tecnico_id = auth.uid());

DROP POLICY IF EXISTS "despesas_insert" ON public.despesas_tecnicos;
CREATE POLICY "despesas_insert" ON public.despesas_tecnicos
FOR INSERT WITH CHECK (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "Admins view all expenses" ON public.despesas_tecnicos;
CREATE POLICY "Admins view all expenses" ON public.despesas_tecnicos
FOR SELECT USING ((empresa_id = get_my_company_id()) AND is_admin());

DROP POLICY IF EXISTS "despesas_select" ON public.despesas_tecnicos;
CREATE POLICY "despesas_select" ON public.despesas_tecnicos
FOR SELECT USING (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "despesas_update" ON public.despesas_tecnicos;
CREATE POLICY "despesas_update" ON public.despesas_tecnicos
FOR UPDATE USING (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

-- HISTORICO_COMISSOES
DROP POLICY IF EXISTS "comissoes_all" ON public.historico_comissoes;
CREATE POLICY "comissoes_all" ON public.historico_comissoes
FOR ALL USING (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

-- VEICULOS
DROP POLICY IF EXISTS "Veiculos permissions" ON public.veiculos;
CREATE POLICY "Veiculos permissions" ON public.veiculos
FOR ALL USING (empresa_id = ((auth.jwt() ->> 'empresa_id'::text))::uuid);

DROP POLICY IF EXISTS "Users can view vehicles from their company" ON public.veiculos;
CREATE POLICY "Users can view vehicles from their company" ON public.veiculos
FOR SELECT USING (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

DROP POLICY IF EXISTS "Admins can insert vehicles" ON public.veiculos;
CREATE POLICY "Admins can insert vehicles" ON public.veiculos
FOR INSERT WITH CHECK (auth.uid() IN (SELECT usuarios.id FROM usuarios WHERE usuarios.empresa_id = veiculos.empresa_id AND usuarios.cargo = 'admin'::text));

DROP POLICY IF EXISTS "Admins can update vehicles" ON public.veiculos;
CREATE POLICY "Admins can update vehicles" ON public.veiculos
FOR UPDATE USING (auth.uid() IN (SELECT usuarios.id FROM usuarios WHERE usuarios.empresa_id = veiculos.empresa_id AND usuarios.cargo = 'admin'::text));

DROP POLICY IF EXISTS "Admins can delete vehicles" ON public.veiculos;
CREATE POLICY "Admins can delete vehicles" ON public.veiculos
FOR DELETE USING (auth.uid() IN (SELECT usuarios.id FROM usuarios WHERE usuarios.empresa_id = veiculos.empresa_id AND usuarios.cargo = 'admin'::text));

-- CONFIGURACOES_BOT
DROP POLICY IF EXISTS "Empresas podem ver suas proprias configuracoes" ON public.configuracoes_bot;
CREATE POLICY "Empresas podem ver suas proprias configuracoes" ON public.configuracoes_bot
FOR SELECT USING ((auth.uid() IN (SELECT empresas.dono_id FROM empresas WHERE empresas.id = configuracoes_bot.empresa_id)) OR (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid())));

DROP POLICY IF EXISTS "Empresas podem inserir suas proprias configuracoes" ON public.configuracoes_bot;
CREATE POLICY "Empresas podem inserir suas proprias configuracoes" ON public.configuracoes_bot
FOR INSERT WITH CHECK ((auth.uid() IN (SELECT empresas.dono_id FROM empresas WHERE empresas.id = configuracoes_bot.empresa_id)) OR (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid())));

DROP POLICY IF EXISTS "Empresas podem atualizar suas proprias configuracoes" ON public.configuracoes_bot;
CREATE POLICY "Empresas podem atualizar suas proprias configuracoes" ON public.configuracoes_bot
FOR UPDATE USING ((auth.uid() IN (SELECT empresas.dono_id FROM empresas WHERE empresas.id = configuracoes_bot.empresa_id)) OR (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid())));

-- CONHECIMENTO_IA
DROP POLICY IF EXISTS "Empresas podem ver seu proprio conhecimento" ON public.conhecimento_ia;
CREATE POLICY "Empresas podem ver seu proprio conhecimento" ON public.conhecimento_ia
FOR SELECT USING ((auth.uid() IN (SELECT empresas.dono_id FROM empresas WHERE empresas.id = conhecimento_ia.empresa_id)) OR (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid())));

DROP POLICY IF EXISTS "Empresas podem inserir seu proprio conhecimento" ON public.conhecimento_ia;
CREATE POLICY "Empresas podem inserir seu proprio conhecimento" ON public.conhecimento_ia
FOR INSERT WITH CHECK ((auth.uid() IN (SELECT empresas.dono_id FROM empresas WHERE empresas.id = conhecimento_ia.empresa_id)) OR (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid())));

DROP POLICY IF EXISTS "Empresas podem deletar seu proprio conhecimento" ON public.conhecimento_ia;
CREATE POLICY "Empresas podem deletar seu proprio conhecimento" ON public.conhecimento_ia
FOR DELETE USING ((auth.uid() IN (SELECT empresas.dono_id FROM empresas WHERE empresas.id = conhecimento_ia.empresa_id)) OR (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid())));

-- CONTATOS_BLOQUEADOS
DROP POLICY IF EXISTS "Usuarios veem bloqueados da sua empresa" ON public.contatos_bloqueados;
CREATE POLICY "Usuarios veem bloqueados da sua empresa" ON public.contatos_bloqueados
FOR ALL USING (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

-- NOTAS_FISCAIS_LOG
DROP POLICY IF EXISTS "Usuarios veem logs da sua empresa" ON public.notas_fiscais_log;
CREATE POLICY "Usuarios veem logs da sua empresa" ON public.notas_fiscais_log
FOR ALL USING (empresa_id IN (SELECT usuarios.empresa_id FROM usuarios WHERE usuarios.id = auth.uid()));

-- AFILIADOS
DROP POLICY IF EXISTS "Admin visualiza todos afiliados" ON public.afiliados;
CREATE POLICY "Admin visualiza todos afiliados" ON public.afiliados FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Afiliados veem apenas seus dados" ON public.afiliados;
CREATE POLICY "Afiliados veem apenas seus dados" ON public.afiliados FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin insere afiliados" ON public.afiliados;
CREATE POLICY "Admin insere afiliados" ON public.afiliados FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin edita todos afiliados" ON public.afiliados;
CREATE POLICY "Admin edita todos afiliados" ON public.afiliados FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Afiliados atualizam seus dados" ON public.afiliados;
CREATE POLICY "Afiliados atualizam seus dados" ON public.afiliados FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin deleta afiliados" ON public.afiliados;
CREATE POLICY "Admin deleta afiliados" ON public.afiliados FOR DELETE USING (is_admin());

-- AFILIADOS_CLIQUES
DROP POLICY IF EXISTS "Afiliados veem seus cliques" ON public.afiliados_cliques;
CREATE POLICY "Afiliados veem seus cliques" ON public.afiliados_cliques
FOR SELECT USING (afiliado_id IN (SELECT afiliados.id FROM afiliados WHERE afiliados.user_id = auth.uid()));

-- =============================================
-- FIM DO ROLLBACK
-- =============================================

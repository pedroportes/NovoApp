-- =============================================================================
-- FUNÇÕES DE LÓGICA DO SISTEMA DE AFILIADOS FLOWDRAIN
-- Data: 2026-02-10
-- Descrição: Funções para automatizar comissões, vendas e cancelamentos.
-- =============================================================================

-- 1. FUNÇÃO: INCREMENTAR VENDAS DO AFILIADO (Ao criar nova venda)
CREATE OR REPLACE FUNCTION public.incrementar_vendas_afiliado()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza contadores na tabela de afiliados
    UPDATE public.afiliados
    SET 
        total_vendas = total_vendas + 1,
        total_comissoes_geradas = total_comissoes_geradas + NEW.valor_comissao,
        total_comissoes_pendentes = total_comissoes_pendentes + NEW.valor_comissao,
        updated_at = NOW()
    WHERE id = NEW.afiliado_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para disparar ao inserir nova venda
DROP TRIGGER IF EXISTS trg_incrementar_venda ON public.afiliados_vendas;
CREATE TRIGGER trg_incrementar_venda
AFTER INSERT ON public.afiliados_vendas
FOR EACH ROW
EXECUTE FUNCTION public.incrementar_vendas_afiliado();


-- 2. FUNÇÃO: REGISTRAR COMISSÃO RECORRENTE (Chamada via Cron ou Webhook Stripe)
-- Esta função deve ser chamada quando uma renovação de assinatura ocorre.
CREATE OR REPLACE FUNCTION public.registrar_comissao_recorrente(
    p_stripe_subscription_id TEXT,
    p_valor_assinatura DECIMAL,
    p_valor_comissao DECIMAL
)
RETURNS VOID AS $$
DECLARE
    v_venda_id UUID;
    v_afiliado_id UUID;
BEGIN
    -- Busca a venda original ativa
    SELECT id, afiliado_id INTO v_venda_id, v_afiliado_id
    FROM public.afiliados_vendas
    WHERE stripe_subscription_id = p_stripe_subscription_id
      AND status = 'ativa'
      AND tipo_comissao = 'recorrente';

    IF v_venda_id IS NOT NULL THEN
        -- Atualiza acumulados na venda
        UPDATE public.afiliados_vendas
        SET 
            total_meses_ativos = total_meses_ativos + 1,
            total_comissao_gerada = total_comissao_gerada + p_valor_comissao,
            updated_at = NOW()
        WHERE id = v_venda_id;

        -- Atualiza acumulados no afiliado
        UPDATE public.afiliados
        SET 
            total_comissoes_geradas = total_comissoes_geradas + p_valor_comissao,
            total_comissoes_pendentes = total_comissoes_pendentes + p_valor_comissao,
            updated_at = NOW()
        WHERE id = v_afiliado_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. FUNÇÃO: MARCAR VENDA CANCELADA (Webhook Stripe 'customer.subscription.deleted')
CREATE OR REPLACE FUNCTION public.marcar_venda_cancelada(
    p_stripe_subscription_id TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.afiliados_vendas
    SET 
        status = 'cancelada',
        data_cancelamento = NOW(),
        updated_at = NOW()
    WHERE stripe_subscription_id = p_stripe_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. FUNÇÃO: REGISTRAR CLIQUE (Para uso no Frontend/Edge Function)
-- Facilita o registro de cliques de forma segura
CREATE OR REPLACE FUNCTION public.registrar_clique_afiliado(
    p_codigo_afiliado TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL,
    p_utm_source TEXT DEFAULT NULL,
    p_utm_medium TEXT DEFAULT NULL,
    p_utm_campaign TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_afiliado_id UUID;
    v_clique_id UUID;
BEGIN
    -- Busca ID do afiliado pelo código
    SELECT id INTO v_afiliado_id FROM public.afiliados WHERE codigo_afiliado = p_codigo_afiliado;

    IF v_afiliado_id IS NULL THEN
        RETURN NULL; -- Afiliado não encontrado
    END IF;

    -- Insere o clique
    INSERT INTO public.afiliados_cliques (
        afiliado_id, ip_address, user_agent, referrer, 
        utm_source, utm_medium, utm_campaign
    ) VALUES (
        v_afiliado_id, p_ip_address, p_user_agent, p_referrer,
        p_utm_source, p_utm_medium, p_utm_campaign
    ) RETURNING id INTO v_clique_id;

    -- Incrementa contador no afiliado
    UPDATE public.afiliados
    SET total_cliques = total_cliques + 1
    WHERE id = v_afiliado_id;

    RETURN v_clique_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

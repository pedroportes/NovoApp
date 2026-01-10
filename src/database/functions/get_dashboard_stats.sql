CREATE OR REPLACE FUNCTION get_dashboard_stats(p_empresa_id UUID)
RETURNS TABLE (
    total_revenue NUMERIC,
    monthly_revenue NUMERIC,
    active_services BIGINT,
    total_clients BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Total Revenue (All time, non-cancelled OS)
        COALESCE((
            SELECT SUM(valor_total)
            FROM ordens_servico
            WHERE empresa_id = p_empresa_id
            AND status NOT IN ('CANCELADO', 'cancelado')
        ), 0) as total_revenue,

        -- Monthly Revenue (Current Month, non-cancelled OS)
        COALESCE((
            SELECT SUM(valor_total)
            FROM ordens_servico
            WHERE empresa_id = p_empresa_id
            AND status NOT IN ('CANCELADO', 'cancelado')
            AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
        ), 0) as monthly_revenue,

        -- Active Services (Not completed or cancelled)
        (
            SELECT COUNT(*)
            FROM ordens_servico
            WHERE empresa_id = p_empresa_id
            AND status NOT IN ('CONCLUIDO', 'concluido', 'CANCELADO', 'cancelado', 'FINALIZADO', 'finalizado')
        ) as active_services,

        -- Total Clients
        (
            SELECT COUNT(*)
            FROM clientes
            WHERE empresa_id = p_empresa_id
        ) as total_clients;
END;
$$ LANGUAGE plpgsql;

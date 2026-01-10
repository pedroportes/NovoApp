DO $$
DECLARE
    empresa_uuid UUID := '6896f98f-0d23-412c-bc7a-ea97189c2c9e';
    i INT;
BEGIN
    FOR i IN 0..5 LOOP
        INSERT INTO financeiro_fluxo (empresa_id, descricao, valor, tipo, data, status, categoria)
        VALUES
            (empresa_uuid, 'Serviço Residencial - Cliente A', (random() * 1000 + 500)::Numeric(10,2), 'RECEITA', (CURRENT_DATE - (i || ' month')::INTERVAL)::DATE, 'pago', 'Serviços'),
            (empresa_uuid, 'Manutenção Comercial - Cliente B', (random() * 3000 + 1000)::Numeric(10,2), 'RECEITA', (CURRENT_DATE - (i || ' month')::INTERVAL + INTERVAL '5 days')::DATE, 'pago', 'Serviços'),
            (empresa_uuid, 'Venda de Kit Reparo', (random() * 400 + 50)::Numeric(10,2), 'RECEITA', (CURRENT_DATE - (i || ' month')::INTERVAL + INTERVAL '12 days')::DATE, 'pago', 'Vendas'),
            (empresa_uuid, 'Contrato Mensal - Condomínio X', 2500.00, 'RECEITA', (CURRENT_DATE - (i || ' month')::INTERVAL + INTERVAL '20 days')::DATE, 'pago', 'Contratos');
    END LOOP;
END $$;

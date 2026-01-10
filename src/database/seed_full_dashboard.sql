DO $$
DECLARE
    v_empresa_id UUID;
    v_cliente_id UUID;
    v_tecnico_id UUID;
    i INT;
BEGIN
    -- 1. Identify Target Company
    SELECT empresa_id INTO v_empresa_id
    FROM public.usuarios
    WHERE email = 'pedrosportes@gmail.com'
    LIMIT 1;

    IF v_empresa_id IS NULL THEN
        RAISE NOTICE 'No company found for pedrosportes@gmail.com';
        RETURN;
    END IF;

    -- 2. Ensure a Client Exists
    SELECT id INTO v_cliente_id FROM public.clientes WHERE empresa_id = v_empresa_id LIMIT 1;
    
    IF v_cliente_id IS NULL THEN
        -- Create dummy client
        v_cliente_id := gen_random_uuid();
        INSERT INTO public.clientes (id, nome_razao, empresa_id, email, created_at)
        VALUES (v_cliente_id, 'Cliente Demo', v_empresa_id, 'demo@cliente.com', NOW());
    END IF;

    -- 3. Get Technician (Self)
    SELECT id INTO v_tecnico_id FROM public.usuarios WHERE email = 'pedrosportes@gmail.com';

    -- 4. Seed Service Orders (For Top Cards - Revenue)
    -- Insert 3 completed OS for CURRENT MONTH to ensure "Faturamento (Este Mês)" is not 0
    FOR i IN 1..3 LOOP
        INSERT INTO public.ordens_servico (
            id, empresa_id, cliente_id, tecnico_id, status, valor_total, created_at, descricao, cliente_nome, updated_at
        ) VALUES (
            gen_random_uuid(),
            v_empresa_id, 
            v_cliente_id, 
            v_tecnico_id, 
            'CONCLUIDO', 
            (random() * 500 + 300)::numeric(10,2), 
            NOW(), 
            'Manutenção Demo ' || i, 
            'Cliente Demo',
            NOW()
        );
    END LOOP;

    -- 5. Seed Financial Flow (For Chart - History)
    -- Insert data for the last 6 months
    FOR i IN 0..5 LOOP
        INSERT INTO public.financeiro_fluxo (
            id, empresa_id, descricao, valor, tipo, data_lancamento, status, categoria, created_at
        ) VALUES
            (gen_random_uuid(), v_empresa_id, 'Serviço Mensal A - ' || i, (random() * 2000 + 1000)::Numeric(10,2), 'RECEITA', (CURRENT_DATE - (i || ' month')::INTERVAL)::DATE, 'pago', 'Serviços', NOW()),
            (gen_random_uuid(), v_empresa_id, 'Venda Extra B - ' || i, (random() * 1000 + 500)::Numeric(10,2), 'RECEITA', (CURRENT_DATE - (i || ' month')::INTERVAL + INTERVAL '14 days')::DATE, 'pago', 'Vendas', NOW());
    END LOOP;

END $$;

-- Function to get service order publicly by UUID (Secure Link)
CREATE OR REPLACE FUNCTION get_service_order_for_print(p_os_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to bypass RLS
AS $$
DECLARE
    v_os record;
    v_client record;
    v_company record;
    v_result json;
BEGIN
    -- Fetch OS (Try to find it)
    SELECT * INTO v_os FROM ordens_servico WHERE id = p_os_id;
    
    IF v_os IS NULL THEN
        RETURN NULL;
    END IF;

    -- Fetch Client associated with OS
    IF v_os.cliente_id IS NOT NULL THEN
        SELECT * INTO v_client FROM clientes WHERE id = v_os.cliente_id;
    END IF;

    -- Fetch Company associated with OS
    IF v_os.empresa_id IS NOT NULL THEN
        SELECT * INTO v_company FROM empresas WHERE id = v_os.empresa_id;
    END IF;

    -- Build the result JSON
    v_result := json_build_object(
        'os', row_to_json(v_os),
        'client', row_to_json(v_client),
        'company', row_to_json(v_company)
    );

    RETURN v_result;
END;
$$;

-- Grant access to BOTH anon (public links) and authenticated (logged users)
GRANT EXECUTE ON FUNCTION get_service_order_for_print TO anon, authenticated;

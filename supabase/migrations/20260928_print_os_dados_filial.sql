-- 28/09/2026: impressão de OS/recibo
-- 1. O fallback usava colunas inexistentes (empresas_marcas.empresa_id / matriz) e quebrava o recibo de OS sem filial.
-- 2. Devolvia a linha inteira de "empresas" (com tokens Focus/Webmania) para quem abrisse o link: agora só dados de cabeçalho.
CREATE OR REPLACE FUNCTION public.get_service_order_for_print(p_os_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_os record;
    v_client record;
    v_company json;
    v_brand record;
    v_brand_id uuid;
BEGIN
    SELECT * INTO v_os FROM ordens_servico WHERE id = p_os_id;
    IF v_os IS NULL THEN
        RETURN NULL;
    END IF;

    IF v_os.cliente_id IS NOT NULL THEN
        SELECT * INTO v_client FROM clientes WHERE id = v_os.cliente_id;
    END IF;

    -- Só os dados de cabeçalho da empresa (nada de tokens/assinatura Stripe)
    IF v_os.empresa_id IS NOT NULL THEN
        SELECT json_build_object(
            'id', e.id, 'nome', e.nome, 'razao_social', e.razao_social, 'cnpj', e.cnpj, 'telefone', e.telefone,
            'email', coalesce(e.email_contato, e.email), 'site', e.site, 'logo_url', coalesce(e.logo_url, e.logotipo_url),
            'assinatura_url', e.assinatura_url, 'endereco', e.endereco, 'numero', e.numero, 'complemento', e.complemento,
            'bairro', e.bairro, 'cidade', e.cidade, 'estado', e.estado, 'cep', e.cep
        ) INTO v_company FROM empresas e WHERE e.id = v_os.empresa_id;
    END IF;

    -- Filial que atendeu: primeiro a da OS; se não houver, a do cliente
    v_brand_id := COALESCE(v_os.marca_id, v_client.marca_id);
    IF v_brand_id IS NOT NULL THEN
        SELECT * INTO v_brand FROM empresas_marcas WHERE id = v_brand_id;
    END IF;

    -- Sem filial nem na OS nem no cliente: usa a primeira filial da empresa (ordem do cadastro)
    IF v_brand IS NULL AND v_os.empresa_id IS NOT NULL THEN
        SELECT * INTO v_brand FROM empresas_marcas WHERE empresa_matriz_id = v_os.empresa_id ORDER BY ordem NULLS LAST, created_at LIMIT 1;
    END IF;

    RETURN json_build_object(
        'os', row_to_json(v_os),
        'client', row_to_json(v_client),
        'company', v_company,
        'brand', CASE WHEN v_brand IS NULL THEN NULL ELSE row_to_json(v_brand) END
    );
END;
$function$;

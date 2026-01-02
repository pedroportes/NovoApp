-- Migration: Automate Financials on OS Completion

-- 1. Create Function to Handle OS Completion
CREATE OR REPLACE FUNCTION public.handle_os_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_percentual_comissao NUMERIC;
    v_valor_comissao NUMERIC;
BEGIN
    -- Check if status changed from anything else to 'CONCLUIDO'
    IF NEW.status = 'CONCLUIDO' AND (OLD.status IS DISTINCT FROM 'CONCLUIDO') THEN
        
        -- A. Handle Commission Generation
        IF NEW.tecnico_id IS NOT NULL THEN
            -- Get Technician's Commission Rate
            SELECT percentual_comissao
            INTO v_percentual_comissao
            FROM public.usuarios
            WHERE id = NEW.tecnico_id;
            
            -- Default to 0 if null
            v_percentual_comissao := COALESCE(v_percentual_comissao, 0);
            
            -- Calculate Commission Value
            v_valor_comissao := (NEW.valor_total * v_percentual_comissao) / 100;
            
            -- Insert into historico_comissoes
            INSERT INTO public.historico_comissoes (
                empresa_id,
                tecnico_id,
                ordem_servico_id,
                valor_comissao,
                percentual_aplicado,
                status_pagamento,
                created_at
            ) VALUES (
                NEW.empresa_id,
                NEW.tecnico_id,
                NEW.id,
                v_valor_comissao,
                v_percentual_comissao,
                'a_pagar',
                NOW()
            );
        END IF;

        -- B. Handle Financial Revenue Entry
        INSERT INTO public.financeiro_fluxo (
            empresa_id,
            tipo,
            valor,
            descricao,
            categoria,
            status,
            data_lancamento,
            created_at
        ) VALUES (
            NEW.empresa_id,
            'ENTRADA',
            NEW.valor_total,
            'Receita de OS #' || SUBSTRING(NEW.id::text, 1, 8),
            'Serviços',
            'PENDENTE', -- Financial entry starts as pending until actual payment confirmation
            NOW(),
            NOW()
        );

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS on_os_status_change ON public.ordens_servico;

CREATE TRIGGER on_os_status_change
    AFTER UPDATE ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_os_completion();

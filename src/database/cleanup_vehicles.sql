
-- LIMPEZA DE VEÍCULOS DUPLICADOS

-- Como você não consegue ver os veículos no painel do Supabase (provavelmente por causa de permissão RLS),
-- Vamos rodar um comando para apagar TODOS os veículos dessa placa específica e começar do zero.

DELETE FROM public.veiculos WHERE placa = 'AYT6231';
DELETE FROM public.veiculos WHERE placa = 'AYT6273';

-- Se quiser limpar TUDO para garantir:
-- DELETE FROM public.veiculos;

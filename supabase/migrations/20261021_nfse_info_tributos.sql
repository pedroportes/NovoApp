-- Linha dos totais aproximados dos tributos (Lei 12.741/2012) nas informações complementares da NFS-e.
-- NULL = usa o texto padrão (Federais 13,45%; Estaduais 0,00%; Municipais 4,76%); texto vazio = não manda a linha.
-- Aplicar arquivo por arquivo: npx supabase db query --linked --file <este arquivo> (não usar db push).
alter table public.empresa_nfse_config add column if not exists info_tributos text;

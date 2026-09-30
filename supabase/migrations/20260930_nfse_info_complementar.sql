-- Informações complementares da NFS-e (quadro do DANFSe; Contora: service.additional_info -> xInfComp)
-- info_complementar: vai em toda nota. info_complementar_retencao: só quando o cliente retém o ISS.
-- {aliquota} é trocado pela alíquota do ISS da nota (ex.: 2,00%).
alter table public.empresa_nfse_config
    add column if not exists info_complementar text,
    add column if not exists info_complementar_retencao text;

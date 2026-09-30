-- Local da prestação da NFS-e: quando ligado, a nota sai com a cidade do endereço do cliente
-- (service.incidence_city_code na Contora → <cLocPrestacao> da DPS nacional).
-- Desligado (padrão) = cidade da sede da empresa, como sempre foi.
alter table public.empresa_nfse_config
    add column if not exists local_prestacao_cliente boolean not null default false;

comment on column public.empresa_nfse_config.local_prestacao_cliente is
    'NFS-e: usar a cidade do endereço do cliente como local da prestação (ISS devido nesse município, LC 116 art. 3º).';

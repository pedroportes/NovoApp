-- ISS retido pelo cliente (tomador): quando ligado, toda NFS-e desse cliente sai com
-- "ISS retido" (o cliente paga o ISS direto à prefeitura e desconta do valor).
-- Padrão: não retém (o ISS vai no DAS do prestador).
alter table public.clientes
    add column if not exists iss_retido boolean not null default false;

comment on column public.clientes.iss_retido is
    'NFS-e: o cliente retém o ISS na fonte (iss_withheld). Normalmente só empresas.';

-- Local onde o serviço foi feito, quando é diferente do endereço do cadastro do cliente.
-- Ex.: empresa registrada em SC (endereço do tomador na nota) e serviço feito em São José dos Pinhais
-- (local da prestação da NFS-e = onde o ISS é devido, LC 116/2003 art. 3º, VII, subitem 7.10).
-- NULL = serviço no endereço do cliente (como sempre foi).
-- Formato: {"cep","endereco","numero","bairro","cidade","uf","codigo_municipio"} (codigo_municipio = IBGE 7 dígitos)
alter table public.ordens_servico
    add column if not exists local_servico jsonb;

comment on column public.ordens_servico.local_servico is
    'Endereço onde o serviço foi feito, quando diferente do cadastro do cliente. Vira o local da prestação da NFS-e. NULL = endereço do cliente.';

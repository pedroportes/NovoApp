# AGENTS.md - Diretrizes do Projeto FlowDrain e Memória Completa

## 🚨 CONTEXTO CRÍTICO E REGRAS INEGOCIÁVEIS DO PROJETO

### 1. O que é este projeto
- **FlowDrain**: Sistema de Gestão / Micro-SaaS para Desentupidoras e Limpa Fossas.
- **Desenvolvedor / Dono**: Pedro (desentupidora em Curitiba e Região Metropolitana).
- **Ambiente de Desenvolvimento Local**: O código ativo que roda e compila fica em `C:\Users\pedro\NovoApp` (`http://localhost:5173/`).
- **Política de Deploy**: **NUNCA** fazer push para Git/GitHub ou Vercel sem autorização explícita de Pedro. Todo o desenvolvimento é testado localmente primeiro.
- **Tenant Ativo de Pedro**: `empresa_id = '58f0512e-8a00-4c31-ba32-f67f9b9ddcbe'` (usuário autenticado oficial e Super Admin: `pedrosportes@gmail.com`).

---

## 2. As 7 Empresas e Marcas Canônicas do Grupo de Pedro (`empresas_marcas`)

Todos os dados foram validados diretamente com os sites oficiais e com o cofre de memórias de Pedro (`G:\Meu Drive\Minhas memorias Claude\Minhas Memorias\Sites`).

| # | Empresa / Filial | UUID `marca_id` | CNPJ | Telefone / WhatsApp | Endereço Canônico | CEP | Chave PIX | Logotipo Oficial | Cor |
| :-: | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| **1** | **Desentupidora Hidro Curitiba** (Matriz) | `2c6b7aee-3453-49f6-88a5-f09879f8aafb` | `38.057.542/0002-54` | (41) 3540-0220 | R. Primeiro de Maio, 1515 - Sala 2, Xaxim, Curitiba - PR | `81820-340` | `38.057.542/0002-54` | `brand_logo_hidro_curitiba.png` | `#10b981` (Verde) |
| **2** | **Desentupidora São José** | `1372b5a0-b28e-4d8c-a1d6-75d6a47b0553` | `11.479.559/0001-62` | (41) 3053-1111 | R. Barão do Cerro Azul, 3059 - Cruzeiro, São José dos Pinhais - PR | `83025-140` | `4130531111` | `brand_logo_sao_jose.png` | `#06b6d4` (Ciano) |
| **3** | **Desentupidora Curitibana** | `93bd1248-9bcd-4e69-9d13-5569ae63db03` | `65.067.931/0001-52` | (41) 98425-7179 | R. Anne Frank, 844 - Lj 04 - Hauer, Curitiba - PR | `81610-020` | `41984257179` | `brand_logo_curitibana.png` | `#3b82f6` (Azul) |
| **4** | **Desentupidora Nossa Cidade** | `fdf65712-50c5-4b71-a754-eac3a9eb4b5d` | `65.067.931/0001-52` | (41) 98740-8021 | R. Leonardo Novicki, 260 - Lj 01 - Cajuru, Curitiba - PR | `82930-548` | `41987408021` | `brand_logo_nossa_cidade.jpg` | `#f59e0b` (Laranja) |
| **5** | **Desentupidora Aqui Perto** | `7fb4a63b-1dae-4f74-89bd-aa2e3bb917d4` | `65.067.931/0001-52` | (41) 98541-9537 | R. Roberto Cichon, 42 - Sala 4 - Cristo Rei, Curitiba - PR | `80050-580` | `41985419537` | `brand_logo_aqui_perto.png` | `#8b5cf6` (Roxo) |
| **6** | **O Desentupidor** (Parceiro) | `e0de0000-0000-0000-0000-000000000003` | `11.479.559/0001-62` | (41) 98765-1579 | R. Prof. João da Costa Viana, 417 - São José dos Pinhais - PR | `83035-000` | `11479559000162` | `brand_logo_o_desentupidor.jpg` | `#0284c7` (Azul Esc.) |
| **7** | **Desentupidora Batel** | `e0de0000-0000-0000-0000-000000000004` | `22.348.863/0002-78` | (41) 3797-5263 | Av. do Batel, 1230 - Batel, Curitiba - PR | `80420-090` | `22348863000278` | `brand_logo_batel.png` | `#14b8a6` (Teal) |

> **Nota sobre Logotipos**: Todos os logotipos oficiais estão armazenados com acesso público permanente no bucket do Supabase Storage `avatars/` (`https://dltqxfyrltgbudtzxzot.supabase.co/storage/v1/object/public/avatars/<nome_arquivo>`).

---

## 3. Técnicos Parceiros Registrados no Banco (`usuarios` e `auth.users`)
Todos configurados com **50% de comissão padrão** em `usuarios` e cadastrados com integridade referencial:

- **Pedro**: `a0da0000-0000-0000-0000-000000000015`
- **Pedro e Graça**: `a0da0000-0000-0000-0000-000000000001`
- **André**: `a0da0000-0000-0000-0000-000000000002`
- **Paulo**: `a0da0000-0000-0000-0000-000000000003`
- **Marcos**: `a0da0000-0000-0000-0000-000000000004`
- **Adão**: `a0da0000-0000-0000-0000-000000000005`
- **Jorge**: `a0da0000-0000-0000-0000-000000000006`
- **Marlon**: `a0da0000-0000-0000-0000-000000000007`
- **Murilo**: `a0da0000-0000-0000-0000-000000000008`
- **Danilo**: `a0da0000-0000-0000-0000-000000000009`
- **Marquinho**: `a0da0000-0000-0000-0000-000000000010`
- **Julio**: `a0da0000-0000-0000-0000-000000000011`
- **Odair**: `a0da0000-0000-0000-0000-000000000012`
- **Conrado**: `a0da0000-0000-0000-0000-000000000013`
- **Tiano**: `a0da0000-0000-0000-0000-000000000014`
- **Graça**: `de825d21-090a-4ddc-9f04-e142b3f6553a`

### Regra do Trigger de Comissão (`handle_os_completion`):
- Disparado automaticamente em `INSERT` e `UPDATE` quando `status = 'CONCLUIDO'`.
- Gera lançamento em `historico_comissoes` com `status_pagamento = 'a_pagar'` e 50% do valor.
- Serviços não concluídos (`orcamento`, `nao_feito_cancelado`) **NÃO** geram comissão.

---

## 4. Funcionalidades e Telas Concluídas (Fase 2):

1. **`BrandSwitcher.tsx` e Header (`MainLayout.tsx`)**:
   - Exibe o logotipo real da marca selecionada e sua cor no topo.
   - Lista dropdown com as 7 empresas ativas e visualização de logotipo e status Matriz/Filial.
   - Botão verde destacado `+ Nova OS` adicionado no cabeçalho desktop para acesso imediato.
2. **Abertura de Nova OS (`NewServiceOrder.tsx`)**:
   - Integrado com `useBrand()`.
   - Seletor de botões pills no topo para escolher qual empresa/filial está atendendo o cliente.
   - Pré-seleciona automaticamente a marca ativa no cabeçalho.
   - Grava `marca_id` no Supabase e no banco offline local.
3. **Impressão Dinâmica de Recibo e OS (`PrintServiceOrder.tsx` & `ServiceOrderPrint.tsx`)**:
   - A função RPC `get_service_order_for_print` no PostgreSQL faz `LEFT JOIN` com `empresas_marcas`.
   - Se a OS tiver `marca_id`, o recibo/PDF é gerado com o **Nome, CNPJ, Telefone, Endereço, Logotipo e Chave PIX** específicos da desentupidora prestadora.
4. **Tela de Configurações Multi-Marca (`Settings.tsx`)**:
   - O formulário de configurações da empresa é sincronizado em tempo real com a desentupidora selecionada no topo (ou pelos botões rápidos de filial logo acima do formulário).
   - Ao trocar de empresa, carrega instantaneamente: Logotipo, Assinatura digital, Nome, Razão Social, CNPJ, Telefone, E-mail, Site, CEP, Endereço, Número, Complemento, Bairro, Cidade, Chave PIX e Cor temática.
   - Ao clicar em "Salvar Alterações", atualiza `empresas_marcas` para aquela filial específica e mantém a Matriz sincronizada em `empresas`.
5. **Listagens Multi-Marca (`ServiceOrders.tsx`, `UnfinishedServices.tsx`, `Clients.tsx`)**:
   - Filtro por marca ativa em tempo real.
   - Badges coloridos indicando qual filial atendeu cada OS ou cliente.
   - Resolução dinâmica dos nomes dos 16 técnicos parceiros reais.
6. **Cadastro Inteligente com IA via WhatsApp (`Clients.tsx` & Edge Function `process-handwriting`)**:
   - A Edge Function `process-handwriting` foi aprimorada com `gpt-4o` multimodal para analisar tanto fichas manuscritas de papel quanto **prints/screenshots de conversas do WhatsApp** (lê nome do contato no topo, telefone, mensagens de endereço, número, bairro, cidade e CEP) e texto copiado.
   - O modal de Novo Cliente agora permite escolher foto/print da galeria (removido bloqueio que forçava câmera), colar print copiado com **Ctrl+V** ou colar a mensagem de texto do WhatsApp diretamente.

7. **Emissão e Cancelamento de NFS-e Oficial via Focus NFe (`focusNFeService.ts` & `ServiceOrders.tsx`)**:
   - **Ambiente de Produção**: Emissão de NFS-e 100% validada e autorizada pela Prefeitura de Mandirituba/PR (provedor Betha Sistemas).
   - **Conta Focus NFe**: Empresa ID `260588`, CNPJ `38.057.542/0001-73` (Desentupidora Hidro Curitiba).
   - **Regras de Negócio e Campos Validados**:
     - Endpoint: `https://api.focusnfe.com.br/v2/nfsen` (layout nacional DPS exigido para Mandirituba).
     - Alíquota do ISS: `percentual_aliquota_relativa_municipio: 2.0` e `aliquota: 2.0` (resolveu definitivamente o erro `E042`).
     - Simples Nacional: `codigo_opcao_simples_nacional: 2` (Optante Simples Nacional ME/EPP) e `regime_especial_tributacao: 0` (Nenhum).
     - Serviço: `codigo_tributacao_nacional_iss: '071001'` (6 dígitos), `codigo_nbs: '124021000'` (9 dígitos), `indicador_total_tributacao: '0'`, `tributacao_iss: 1`.
   - **Polling em Tempo Real**: Ao clicar para emitir, o SaaS consulta a cada 2,5s por até 10 tentativas, exibindo feedback em tempo real e abrindo o DANFSe PDF com QR Code automaticamente assim que autorizado.
   - **Cancelamento Direto pelo SaaS**: Implementado modal de cancelamento de NFS-e com justificativa obrigatória e chamada à API (`DELETE /v2/nfsen/{ref}`). Testado e comprovado com o cancelamento com efeito fiscal nulo das notas de teste nº 576, 577 e 578.
   - **Redesign dos Cards de Ordem de Serviço**:
     - Topo limpo e arejado: Mantém apenas o status da OS e a marca/hashtag, sem empilhamentos ou textos cortados.
     - Faixa horizontal dedicada da NFS-e: Exibe o status da nota (`🟢 NFS-e nº 579 EMITIDA`, `🟡 Em processamento...`, `🔴 Erro`, ou `⚪ Cancelada`), com botões diretos de `[📄 PDF]` e `[Cancelar]`.
   - **Sincronização Offline**: Atualizado `syncService.ts` para mapear todos os campos fiscais (`nfe_status`, `nfe_numero`, `nfe_ref`, `nfe_pdf_url`, `nfe_url_pdf`) no IndexedDB local (Dexie) e no Supabase.

8. **Central de Relatórios e Relatórios de Comissões em PDF com Filtros de Datas/Períodos (`Reports.tsx`, `FinancialClosing.tsx`, `TechnicianFinancialPrint.tsx`)**:
   - **Central de Relatórios (`/reports`)**:
     - 5 Abas Estratégicas: DRE & Lucro Líquido Real (Receita Bruta, Comissões 50%, Custos e Lucro Líquido por Filial), Fiscal & Contábil (NFS-e), Comissões da Equipe, Não Feitos & Motivos de Perda, e Bairros/Regiões Mais Rentáveis.
     - Suporte a filtros de períodos pré-definidos: 1ª Quinzena (01 a 15), 2ª Quinzena (16 ao fim), Este Mês, Mês Anterior, Últimos 30 Dias, 90 Dias, Ano Atual, Todo o Histórico e Personalizado (com inputs de data início e fim).
     - Botão verde de **"Baixar PDF no PC"** com exportação direta usando `html2canvas` + `jsPDF`.
   - **Extrato Oficial de Comissões em PDF (`TechnicianFinancialPrint.tsx` & `/print/comissoes/:techId`)**:
     - Cabeçalho dinâmico com identificação completa da desentupidora prestadora (Logotipo, CNPJ, Razão Social, Telefone) e exibição do período analisado (ex: `Período: 16/09/2026 até 30/09/2026 (2ª Quinzena)`).
     - Cards com Faturamento Bruto, Comissões (50%), Reembolsos de Despesas Aprovadas, Adiantamentos Descontados e Valor Líquido Total a Pagar.
     - Tabela detalhada das OSs com ID, Cliente, Data, Serviço Realizado, Faturamento e Valor da Comissão.
     - Bloco de Liquidação Financeira com Chave PIX, data de emissão e campos de assinatura formal (Técnico e Direção Financeira).
     - **Download Direto de PDF**: Botão destacado **"Baixar PDF no PC"** que gera e salva o arquivo `.pdf` (ex: `Extrato_Comissoes_André_2Quinzena.pdf`) direto na pasta Downloads do computador, além do botão de impressão tradicional e exportação `.CSV`.
     - Correção automática de parâmetros de URL: `?period=15d_1` e `?period=15d_2` inicializam datas automaticamente.
   - **Fechamento Financeiro com Períodos (`FinancialClosing.tsx`)**:
     - Barra de filtro por quinzena ou intervalo de datas personalizado diretamente na tela de acerto financeiro, recalculando o saldo a pagar em tempo real e permitindo abrir o PDF impresso já com o período selecionado.

---

## 4B. Sessão de 24/09/2026 (Claude Code) — o que foi feito e o que está PENDENTE

> Tudo local em `C:\Users\pedro\NovoApp`, **sem commit, sem push, sem deploy**. Antes de editar `Reports.tsx`, ler o arquivo (duas sessões mexeram nele).

### Correções na Central de Relatórios (`Reports.tsx`)
- **Limite de 1.000 linhas do Supabase**: a empresa tem ~1.962 OS; agora as OS e despesas são buscadas **em páginas** (antes "Todo o histórico"/"Ano" mostravam números errados).
- Filtro de **filial** aplicado em memória (troca instantânea). **Despesas não têm `marca_id`**: com filial selecionada, entram **rateadas** pelo faturamento da filial; tabela por filial tem coluna "Despesas (rateio)" e linha "Sem filial definida".
- "Não Feitos": motivos corrigidos (status são minúsculos: `orcamento`, `nao_feito_cancelado`, `nao_feito_outra_empresa`, `nao_feito_ja_realizado`). Conversão = concluídos ÷ (concluídos + não feitos).
- Períodos 1ª/2ª quinzena e personalizado funcionando; proteção contra resposta antiga do banco.
- Botão **PDF** da aba Comissões manda `period=custom&startDate&endDate` exatos ao extrato (antes `30d/90d/ano` viravam "todo o histórico").
- **Seletor de relatórios**: a fileira de abas virou **dropdown compacto com ícones e descrição** (no celular abre gaveta de baixo via `createPortal`). Item 8 = Relatórios Técnicos.

### Extrato / Acerto (`financialService.getTechnicianBalance`)
- **Regra do Pedro: comissões SEMPRE filtradas pela DATA DA OS** (não pela data em que a comissão foi criada). Paginado, datas no fuso de Brasília. O Acerto (`closeMonth`) agora paga só as comissões das OS do período.
- ⚠️ Datas "sem hora" estão gravadas como meia-noite UTC; convertendo para local voltam 1 dia — usar a parte `AAAA-MM-DD`.

### ⚠️ Dados com problema (PENDENTE — decisão do Pedro)
- **29 OS duplicadas** (ID `xxxxxxxx-0000-0000-0000-000000000000`, sem cliente, criadas meses depois, quase sempre com OUTRO técnico; ~R$ 21.538 contados em dobro). Backup em `NovoApp\backup_duplicadas_20260924\backup_antes_da_limpeza.json`; observação já gravada nas 29 OS originais. **Falta o Pedro rodar `backup_duplicadas_20260924\excluir_duplicadas.sql` no SQL Editor** (aborta se não forem exatamente 29 OS + 29 comissões). Total deve cair de 1.962 para 1.933. Origem desconhecida (não está no código do app — provável automação/importação externa).
- **Todas as 1.393 comissões estão `a_pagar`**; 327 do Pedro e Graça criadas juntas em 22/09/2026 23:02 (carga retroativa de 2024–2026). **33 comissões com R$ 0 / 0%**. O gatilho `handle_os_completion` não recalcula quando a OS troca de técnico/valor. **Não fazer "Acerto" até o Pedro definir a regra** (ex.: marcar como pago tudo antes de certa data).
- As 3 OS sem cliente e sem par (Agnaldo, Dona Maria Helena, Gih) são cadastro mal feito — deixar.

### Relatório Técnico de Serviço (laudo com IA para o cliente) — NOVO
- Baseado no esboço do Pedro (`Relatorio_Tecnico_Desentupimento.pdf` no Drive). Tabela `relatorios_tecnicos` (migração `supabase/migrations/20260924_relatorios_tecnicos.sql`) — **já criada no banco**.
- Edge Function `gerar-relatorio-tecnico` (OpenAI gpt-4o, exige login, IA só redige, nunca inventa medida/causa/norma/garantia) — **deploy pendente**: `npx supabase functions deploy gerar-relatorio-tecnico`.
- Rotas: `/relatorios-tecnicos` (lista + "Novo relatório" escolhendo OS ou em branco), `/relatorio-tecnico/:id` (editor com toques, ditado por voz, fotos, botão IA com selo "revise"), `/print/relatorio-tecnico/:id` (A4, só mostra o que foi marcado, marca d'água RASCUNHO, logo da marca, dados congelados na emissão, número RT-AAAA-0001).
- Arquivos: `src/pages/TechnicalReportEditor.tsx`, `TechnicalReportPrint.tsx`, `TechnicalReportsList.tsx`, `src/components/technical-report/TechnicalReportDocument.tsx`, `src/services/technicalReportService.ts`, `src/types/technicalReport.ts`.
- **Acesso fica na Central de Relatórios, NÃO nos cards de OS** (Pedro não gostou do botão no card — foi removido).
- Falta testar: salvar/emitir, IA ponta a ponta, impressão multi-página e fotos. Pedro disse que "tem coisas a arrumar ainda".

### Segurança (análise feita, NADA corrigido ainda)
1. RLS `"Access company users"` permite o usuário editar a própria linha (inclusive `is_super_admin`, `empresa_id`, `cargo`).
2. RPC `get_service_order_for_print` (anon) devolve a linha inteira de `empresas` (tokens Focus/Webmania).
3. Token de produção Focus fixo em `focusNFeService.ts` — **repo GitHub é público, não commitar esse arquivo assim**.
4. `VITE_GEMINI_API_KEY` exposta no navegador. 5. Senha fixa `FlowDrain 123` no stripe-webhook. 6. `npm audit`: jsPDF crítico.

### Preferências do Pedro (telas)
- Celular primeiro: nada de fileiras com rolagem lateral; seletores compactos com ícones. Não adicionar botões nos cards de OS. Documentos para cliente: formais e técnicos.

---

## 4C. Sessão de 25/09/2026 — Correção de Filtros, Extrato de Comissões, Cancelamento NFS-e e Deploy

1. **Responsividade Mobile & Seletor de Marcas do Topo (`MainLayout.tsx` & `BrandSwitcher.tsx`)**:
   - Corrigido z-index do cabeçalho mobile (`z-30`) evitando sobreposição do `<main>` sobre o seletor.
   - O seletor oficial de topo (`BrandSwitcher`) agora abre drawer com as 7 empresas e a visão "Todas as Marcas".
   - Removida barra duplicada de filtros que havia sido colocada no corpo das páginas (`Dashboard.tsx`, `Reports.tsx`, `ServiceOrders.tsx`, `Clients.tsx`, `UnfinishedServices.tsx`), mantendo o layout limpo e sem poluição.

2. **Modal de Cancelamento de NFS-e Oficial na Prefeitura (`ServiceOrders.tsx` & `focusNFeService.ts`)**:
   - Re-inserido o modal `<Dialog open={cancelModalOpen}>` com os dados da OS, cliente, valor, e referência fiscal.
   - Campo obrigatório de justificativa de cancelamento integrado com a API Focus NFe (`DELETE /v2/nfsen/{ref}`).
   - Testado e confirmado: cancelamento com efeito fiscal nulo da NFS-e de teste nº 580 (ref: `os_30d081521a34_1982`) respondido com status HTTP 200 `cancelado` pela prefeitura.

3. **Correção Crítica no Extrato de Comissões da Equipe (`Reports.tsx`, `TechnicianFinancialPrint.tsx` e `financialService.ts`)**:
   - **Problema resolvido**: Na Central de Relatórios (`/reports`), a tabela mostrava o número correto de atendimentos do período filtrado (ex: 7 atendimentos para Pedro e Graça, 6 para Paulo). Porém, ao clicar em "Extrato", a rota abria sem parâmetros de data e caía no modo "Todo o Histórico", exibindo todas as 328 OSs antigas.
   - **Solução implementada**: O botão "Extrato" agora repassa os parâmetros exatos do filtro ativo (`period`, `startDate`, `endDate` e `brandId`).
   - A tela de extrato e `financialService.getTechnicianBalance` agora aplicam essas datas e a filial, exibindo rigorosamente a quantidade de OSs e os valores que constam no relatório.

4. **Emissão de NFS-e Nacional**:
   - Validada a regra `isNacionalEmpresa` garantindo compatibilidade com cidades conveniadas ao padrão DPS nacional (`/v2/nfsen`).

---

## 4D. Sessão de 26/09/2026 — FlowDrain IA (Gemini Pro), Vercel e Ícones PWA

1. **Variáveis de Ambiente Frontend na Vercel**:
   - O aplicativo web é compilado com Vite diretamente na **Vercel**. Todas as variáveis que o frontend consome no navegador (`import.meta.env.VITE_*`) **precisam estar configuradas nas Environment Variables da Vercel** (`Settings > Environment Variables > VITE_GEMINI_API_KEY`).
   - Os Secrets de Functions do Supabase aplicam-se apenas às Edge Functions Deno no servidor Supabase, e não ao bundle React no browser.

2. **FlowDrain IA e Modelo Google Gemini (`aiService.ts`)**:
   - **Modelo Ativo**: `gemini-3.5-flash-lite` (as versões antigas `gemini-1.5-flash` e `2.0` foram descontinuadas pelo Google e retornam 404).
   - **Busca Híbrida**: O serviço agora consulta primeiro o banco via RPC `get_gemini_api_key` / `empresas.configs->'gemini_api_key'` e utiliza `import.meta.env.VITE_GEMINI_API_KEY` como fallback.
   - **Cache do PWA**: Como o app possui Service Worker offline (`vite-plugin-pwa`), mudanças críticas no bundle exigem que o usuário feche e limpe o cache / abra em aba anônima para que o Service Worker instale o bundle novo.

3. **Favicons e Identidade Visual PWA**:
   - Atualizados os favicons e ícones PWA do FlowDrain (`logo-flowdrain.jpg` e `favicon.ico`) substituindo ícones genéricos do Vite.



---

## 4E. Sessão de 27/09/2026 — Integração e Validação da Fiscal Contora (NFS-e)

1. **Laboratório Isolado de Testes (`ContoraLab.tsx` e rota `/teste-contora`):**
   - **Regra de ouro mantida:** Nenhum arquivo de produção (`src/pages/ServiceOrders.tsx` e `src/services/focusNFeService.ts`) foi alterado. O emissor oficial em produção continua sendo 100% a **Focus NFe**.
   - Criada a página de laboratório isolada `src/pages/admin/ContoraLab.tsx` e vinculada em `src/App.tsx` para testar toda a API da Fiscal Contora sem nenhum risco para a operação ativa.

2. **Empresa e Certificado Digital A1 na Contora:**
   - **Empresa Contora ID:** `ddba2acf-d7ae-42bc-8ed1-380939eebdc4`.
   - **Razão Social:** `GRACINHA DO CARMO GONCALVES LTDA` (Matriz Mandirituba).
   - **CNPJ:** `38.057.542/0001-73`.
   - **Inscrição Municipal:** `892830`.
   - **Município / IBGE:** Mandirituba / PR (`4114302`).
   - **Parâmetros Fiscais:** Código de Serviço `071001`, NBS `124021000` (9 dígitos), Alíquota ISS `2.0%`, Optante Simples Nacional.
   - **Certificado Digital A1:** Arquivo `GRACINHA_DO_CARMO_GONCALVES_LTDA_38057542000173... .pfx` enviado e validado com sucesso (ID `c3423ed6-80e9-41d9-bf31-4d6652697520`, validade até **01/09/2027**).

3. **Autenticação e Chaves de API na Contora:**
   - A Contora exige correspondência estrita entre o ambiente da empresa e o ambiente da chave (erro *"O ambiente da empresa deve ser igual ao ambiente da chave selecionada"*).
   - Criada chave de produção: `Errp Principal Produção` (Token: `[token removido — fica só no painel da Contora e no servidor; nunca versionar]`).
   - Empresa configurada no painel com `default_environment: producao`.

4. **Resultados dos Testes de Emissão:**
   - **Ambiente de Homologação:** Rejeitado pela Receita Federal com `E0037: O código do município emissor informado na DPS é inexistente no cadastro de convênio municipal do sistema nacional`. Mandirituba **não possui convênio ativo no ambiente de testes/homologação federal** (apenas em Produção, exatamente como ocorreu no Focus NFe).
   - **Ambiente de Produção:**
     - O primeiro despacho com `rps_number: 1` retornou `E999: Erro não catalogado` da prefeitura (Betha Sistemas), porque a empresa já emitiu centenas de notas no município (as últimas notas autorizadas na Focus foram nº 576 a 580) e a prefeitura rejeita duplicidade/recomeço da sequência 1.
     - Montado rascunho com a sequência correta: **RPS nº 581, Série 1** (Draft ID `bd87225f-2065-4184-a924-9e981949a5ea`).
     - Atualizado `ContoraLab.tsx` com campos dinâmicos no Card 4 para definir o `Nº RPS (Sequência)` e `Série` livremente.
   - **Status Fiscal Real:** Nenhuma NFS-e foi gerada na prefeitura (`nfse_number: null`), com **efeito fiscal ZERO**. Apenas foi consumido 1 evento de franquia de despacho no painel da Contora.

5. **Regras e Campos Esclarecidos com Pedro:**
   - **`cTribMun padrão`:** Deve ficar **EM BRANCO / VAZIO**. Não se aplica a Mandirituba (exigido apenas por municípios com tabela própria complementar, como RJ).
   - **`CSRT (Paraná)` e `CSC ID / CSC Token`:** **Não se aplicam a desentupidoras**. CSRT é da SEFAZ para notas de mercadorias (NF-e mod. 55), e CSC é para cupom de balcão (NFC-e mod. 65). Desentupidora emite exclusivamente NFS-e municipal (ISS).


---

## 4F. Sessão de 27/09/2026 (noite, Claude Code) — Contora FUNCIONANDO, Configurações em subpáginas, contas duplicadas

> Tudo local em `C:\Users\pedro\NovoApp`, **sem commit, sem push, sem deploy na Vercel**. No Supabase de produção foram criadas só 2 tabelas novas e 1 Edge Function (ver item 3). Backups dos arquivos alterados em `NovoApp/backup_settings_20260927/`.

### 1. Fiscal Contora — o erro foi resolvido (NFS-e AUTORIZADA)
- **NFS-e nº 1 (RPS 589) autorizada** pela Contora em 27/09 18:18 (Matriz 0001-73, R$ 1,00) e **cancelada** às 18:33 (nota de teste, Ambiente Nacional OK).
- **Configuração que funciona:** regime **Simples Nacional (ME/EPP)** + **inscrição municipal NÃO enviada** (`nfse_municipal_registration_in_cnc_producao = false`) + **% total de tributos do Simples = 2** (`total_tax_rate_sn`) em cada nota.
- Significado dos erros encontrados: **E0037** = homologação sem convênio em Mandirituba (usar produção); **E0120** = não mandar a IM pela Contora; **E0160** = situação no Simples divergente (a Receita confirmou que a empresa É optante); **E999** (para ME/EPP) = faltava o `total_tax_rate_sn`.
- O campo `nfse_simples_nacional_option` citado na documentação da Contora **não existe na API** (é ignorado). A situação no Simples vem do `tax_regime` da empresa.
- A numeração pela Contora (Sistema Nacional, chave `41143022…`) é **separada** da Focus (sistema da prefeitura, chave `41143021…`, notas 576–581).
- **Não clicar em "Salvar Alterações" no cadastro da empresa no console da Contora**: aquilo religou a IM uma vez.
- ⚠️ **Focus declara "Não optante" nas notas**: a tela da Focus grava regime "1" e o serviço repassa como `codigo_opcao_simples_nacional = 1`, que no padrão nacional é Não optante (ME/EPP = 3). A Receita confirmou que a empresa é optante. **Levar ao contador.** Não foi alterado (a Focus continua como estava).
- ⚠️ A Focus tem o CNPJ do prestador **fixo no código** (`38057542000173`): não serve para outros assinantes sem correção.
- Chamado **#88** aberto no suporte da Contora (pedido do retorno do E999 e da exclusão da empresa Xaxim `eac0aed9…`, cadastrada por engano, hoje Inativa).
- Laboratório `/teste-contora` (`src/pages/admin/ContoraLab.tsx`): fixo na Matriz, com quadro de erro, acompanhamento do status, cancelamento, download de PDF/XML e campo "% do Simples".

### 2. Configurações virou menu com subpáginas
- `/settings` = menu com 5 itens → `/settings/empresa`, `/settings/nota-fiscal`, `/settings/tecnicos`, `/settings/conta`, `/settings/aparencia` (rota `/settings/:secao` em `App.tsx`). Técnico continua vendo só "Meu Perfil". Menu lateral destaca "Configurações" nas subpáginas (`MainLayout.tsx`).
- Lógica de carregar/salvar de `Settings.tsx` **não mudou**, só o que aparece em cada subpágina.

### 3. Nota fiscal com 2 emissores (Focus ou Contora) — ETAPA 1 pronta
- Subpágina **Nota fiscal** (`src/components/nfse/ConfiguracaoNotaFiscal.tsx`): botões **Focus NFe / Fiscal Contora**. Focus mostra a tela antiga sem mudança. Contora mostra só **token, ambiente, % do Simples e Testar conexão** (empresa, certificado, IM e códigos ficam no painel da Contora).
- Banco (produção): tabelas **`empresa_nfse_config`** (emissor ativo, ambiente, CNPJ, % do Simples; RLS por empresa, técnico não altera) e **`empresa_nfse_segredos`** (token; **sem acesso pelo navegador**). Migração `supabase/migrations/20260927_empresa_nfse_config.sql`.
- ⚠️ **O histórico de migrações local e remoto está desencontrado: NÃO usar `npx supabase db push`** (aplicaria migrações antigas). Aplicar arquivo por arquivo com `npx supabase db query --linked --file <arquivo>`.
- Edge Function **`nfse-contora`** publicada (ações `carregar`, `salvar_token`, `testar`). O token é conferido na Contora e **nunca volta para o navegador**. Vercel não é necessária para tokens de assinante.
- A empresa do Pedro está com emissor **Fiscal Contora**, token salvo e "Pronto para emitir". **Falta preencher 2,00 no % do Simples e Salvar.**
- **ETAPA 2 (pendente): o botão de emitir/cancelar/PDF nas OS ainda usa SEMPRE a Focus**, mesmo com a Contora escolhida. Fazer o botão usar o emissor ativo.
- A FlowDrain IA (`aiService.ts`) ganhou o manual completo: menu de Configurações novo, passo a passo do cadastro na Contora e no FlowDrain, o que ignorar (CSRT, CSC, Responsável técnico) e tabela de erros.

### 4. Nome do cliente
- O campo certo do nome do cliente é **`clientes.nome_razao`** (usado pelo app todo; os outros assinantes só têm esse). `clientes.nome` é antigo, só preenchido na importação do Pedro.
- As OS guardam uma cópia do nome (`ordens_servico.cliente_nome`). Corrigido: os cards de OS mostram o nome atual do cadastro, e editar o cliente atualiza a cópia nas OS dele. O modal de cancelar NFS-e passou a usar `nome_razao`.
- Na NFS-e o tomador sai como está no `nome_razao` (ex.: "Andreia (Ambipar)"). Avaliar no futuro usar só a parte antes do parêntese.

### 5. Duas contas "Desentupidora Hidro Curitiba" no banco — SÓ REGISTRADO, nada alterado
- **Conta verdadeira (usada no dia a dia): `58f0512e-8a00-4c31-ba32-f67f9b9ddcbe`**: login pedrosportes@gmail.com, 18 usuários, 3.215 clientes, **1.932 OS**, 7 marcas (as do item 2 deste arquivo).
- **Conta de teste/cópia: `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`**: criada em 01/01/2026, logins de teste (pedrosportes2@gmail.com, pedrotecnico-de-teste@gmail.com, desentupidoracuritibana67w@gmail.com), 3.169 clientes (cópia antiga), **0 OS**, 7 marcas próprias com os mesmos nomes.
- No uso normal o Pedro **não vê** a conta de teste. Como super admin, o banco permite ler tudo, mas as telas filtram pela conta do usuário.
- ⚠️ Se um dia for excluir a cópia pelo Super Admin, **conferir o ID `aaaaaaaa…`**, porque as duas têm o mesmo nome. Fazer backup antes.

### 6. Segurança (pendente)
- O token de produção da Contora antigo (termina em `…PUqq`) ficou exposto nestes arquivos e no laboratório. **Criar um token novo na Contora, trocar na tela Nota fiscal ("Trocar") e apagar o antigo.** Estes arquivos vão para o GitHub público: não gravar tokens aqui.
- ⚠️ **27/09 à noite — erro na emissão pela Focus:** o commit `937c4d7c` (26/09 16:56, "adicionar email_destinatario") fez a Focus incluir o bloco `dest` no XML, e a prefeitura (Betha/Mandirituba) rejeitou com `Element dest: This element is not expected. Expected is finNFSe`. **A linha foi removida localmente** (volta ao código que emitiu a nota 581). O commit com a linha **está no GitHub (origin/master)**: a produção pode estar com o erro até subir a correção. Para mandar a nota por e-mail, usar outro caminho (ex.: botão Enviar/WhatsApp ou o e-mail do tomador), nunca `email_destinatario`.
- ✅ **27/09 ~19:50 — ETAPA 2 feita (local + função publicada):** o botão "Emitir NFS-e" das OS usa o emissor ativo. Com a Contora, a Edge Function `nfse-contora` (ações `emitir`, `status`, `cancelar`) cria e despacha a nota, grava o resultado na OS (`nfe_ref = "contora:<id>"`, `nfe_tipo = contora`, `nfe_chave`, `nfe_numero`, erro em `nfe_mensagem_erro`) e guarda o PDF no bucket público `comprovantes/nfse/<empresa>/<chave>.pdf` (os botões PDF e WhatsApp funcionam igual à Focus). Os códigos do serviço vêm do cadastro da empresa na Contora; o % do Simples vem de `empresa_nfse_config`. Notas antigas da Focus continuam pela Focus. Arquivos: `src/services/contoraNFSeService.ts` e `ServiceOrders.tsx`. Também foi cancelada a NFS-e nº 2 da Contora (emitida por outro agente, 19:43).


---

## 4G. ESTADO FINAL DE 27/09/2026 (20h) — NFS-e com 2 emissores FUNCIONANDO — LEIA ANTES DE MEXER EM NOTA FISCAL

> Resumo consolidado para qualquer agente (Claude Code, Antigravity/Gemini). As seções 4E e 4F contam o histórico; **esta é a versão que vale**.

### ✅ O que funciona hoje (testado em produção)
- **Emissão pela Fiscal Contora direto pelo card da OS**: NFS-e **nº 3** autorizada às 20:00 de 27/09 (OS `#1ee5cdb3`, cliente "Pedrinho teste", R$ 1,99, DANFSe com "Optante – ME/EPP", Ambiente Gerador: **Nacional**).
- **Emissão pela Focus NFe** (nota nº 584 autorizada às 19:36), depois de remover a linha `email_destinatario` (ver "Regras").
- **Cancelamento pela Contora** (notas nº 1 e nº 2 canceladas pelo Ambiente Nacional).
- **Cancelamento pela Focus: FALHANDO** ("erro_cancelamento – Não processado") nas notas **581 e 584** (cliente de teste "PEDRO Teste de NF", ainda **autorizadas**). Cancelar pelo portal da prefeitura (Betha/e-Nota Mandirituba) ou abrir chamado na Focus.

### 🧭 Como o sistema escolhe o emissor
- Tela **Configurações → Nota fiscal** (`/settings/nota-fiscal`, componente `src/components/nfse/ConfiguracaoNotaFiscal.tsx`):
  - Quadro verde fixo **"As OS emitem nota por: X"** = emissor em uso.
  - Abas **"Ver configuração de"** só mostram a configuração (NÃO trocam o emissor).
  - Trocar o emissor só pelo botão **"Passar a usar a …"**, que pede confirmação.
- Emissor em uso fica em **`empresa_nfse_config.provedor`** (`focus` | `contora`; sem linha = `focus`).
- O botão **"Emitir NFS-e"** da OS (`src/pages/ServiceOrders.tsx`, `handleQuickEmitNFe`):
  - Com `provedor = contora` → `ContoraNFSeService` (`src/services/contoraNFSeService.ts`) → Edge Function **`nfse-contora`** (ações `emitir`, `status`, `cancelar`).
  - Com `provedor = focus` → `FocusNFeService` (código antigo, sem mudança de lógica).
  - Nota já emitida é sempre consultada/cancelada no emissor onde foi feita: **`nfe_ref` começando com `contora:`** = Contora; senão Focus.
- Resultado gravado na OS pela Edge Function: `nfe_status`, `nfe_ref = "contora:<id>"`, `nfe_tipo = "contora"`, `nfe_numero`, `nfe_chave`, `nfe_emitida_em`, `nfe_mensagem_erro` (aparece **fixo** no card), `nfe_pdf_url`/`nfe_url_pdf` = PDF guardado no bucket público `comprovantes/nfse/<empresa_id>/<chave>.pdf` (botões PDF e WhatsApp funcionam igual à Focus).

### 🔐 Onde ficam os dados da Contora
- Tabela **`empresa_nfse_config`** (RLS por empresa; técnico só lê): `provedor`, `contora_ambiente`, `contora_cnpj`, `contora_empresa_id`, `contora_total_tax_rate_sn`.
- Tabela **`empresa_nfse_segredos`**: token da Contora. **Sem policy nenhuma**: só a Edge Function (service role) lê. O token **nunca** volta para o navegador. **Não precisa (e não deve) ir para a Vercel.**
- Empresa, certificado A1, IM e códigos do serviço ficam **no painel da Contora** (o assinante cadastra lá). A Edge Function lê os padrões da empresa na Contora (`nfse_service_code_default` → `national_tax_code`, CNAE, ISS, NBS).

### ⚙️ Configuração que FUNCIONA para a Matriz (CNPJ 38.057.542/0001-73, Mandirituba)
- Contora: `tax_regime = simples` (Optante ME/EPP), **IM NÃO enviada** (`nfse_municipal_registration_in_cnc_producao = false`), serviço 071001, CNAE 8129000, ISS 2%, NBS 124021000, cTribMun vazio.
- FlowDrain: emissor **Contora**, ambiente **Produção**, **% total de tributos do Simples = 2,00** (obrigatório para ME/EPP).
- Numeração da Contora (Sistema Nacional, chave `41143022…`) é **separada** da Focus (prefeitura, chave `41143021…`, notas 576–584).

### 🚫 Regras para agentes (NÃO QUEBRAR)
1. **Nunca usar `npx supabase db push`**: o histórico de migrações local e remoto está desencontrado. Aplicar SQL arquivo por arquivo: `npx supabase db query --linked --file <arquivo.sql>`.
2. **Nunca adicionar `email_destinatario` no payload da Focus**: cria o bloco `dest` e a prefeitura (Betha) rejeita ("Element dest… Expected is finNFSe").
3. **Nunca gravar tokens** (Contora `fct_…`, Focus) em AGENTS.md, GEMINI.md, código ou commits. O repositório é público.
4. **Não clicar em "Salvar Alterações" no cadastro da empresa no console da Contora** sem conferir depois: já religou a IM uma vez.
5. **Um agente por vez mexendo na Contora e nesta parte do código.** Em 27/09 dois agentes trabalharam ao mesmo tempo e um desfez configurações do outro (IM religada, notas de teste emitidas e esquecidas ativas).
6. **Toda nota de teste em produção vale de verdade**: cancelar logo depois (justificativa de 15 a 255 caracteres).
7. O campo certo do nome do cliente é **`clientes.nome_razao`** (o `nome` é antigo, só da importação). Na OS existe a cópia `ordens_servico.cliente_nome`: os cards mostram o nome do cadastro e editar o cliente atualiza a cópia.
8. **Duas empresas com o mesmo nome "Desentupidora Hidro Curitiba"** no banco: a verdadeira é **`58f0512e-8a00-4c31-ba32-f67f9b9ddcbe`**. A `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` é cópia de teste (0 OS). Não excluir nenhuma sem conferir o ID e fazer backup.

### ⚠️ Pendências
- **Focus declara "Não optante"** nas notas (grava regime "1" e manda `codigo_opcao_simples_nacional = 1`; no nacional ME/EPP = 3). A Receita confirmou que a empresa É optante. **Levar ao contador** antes de mexer.
- **Focus tem o CNPJ do prestador fixo no código** (`38057542000173`): não serve para assinantes sem correção.
- **Tokens expostos**: o da Contora (termina em `…PUqq`) e o da Focus (fixo em `focusNFeService.ts`, já no GitHub). **Gerar novos tokens nos painéis e trocar** (Contora: Configurações → Nota fiscal → "Trocar").
- Cancelar as notas **581 e 584** (Focus) pelo portal da prefeitura.
- Laboratório `/teste-contora` (`src/pages/admin/ContoraLab.tsx`) continua no app: útil para diagnóstico, mas pode ser removido depois.
- A FlowDrain IA (`src/services/aiService.ts`) já tem o manual completo (Configurações novas, passo a passo da Contora, erros comuns).
- Chamado #88 aberto no suporte da Contora (E999 e exclusão da empresa Xaxim `eac0aed9…`, cadastrada por engano).
- **Fechamento 27/09 20:10:** a NFS-e **nº 3** (Contora, OS #1ee5cdb3) foi **cancelada** às 20:04 pelo card da OS. No console da Contora o selo continua "Autorizado": o cancelamento aparece no "Histórico de tentativas" (Action: cancel, completed). Com as notas nº 1 e nº 2 foi igual. **Contora sem nenhuma nota ativa.** Cada assinante salva o próprio token em Configurações → Nota fiscal; ele vai para `empresa_nfse_segredos` da empresa dele e a Edge Function usa o token da empresa de quem está logado (sem Vercel, sem deploy).


---

## 4H. Sessão de 28/09/2026 (Claude Code) — Migração da planilha AppSheet, clientes duplicados, telefone padrão

> Banco de produção ALTERADO (com o OK do Pedro). Código só local, **sem commit/push**. Backups: NovoApp/backup_migracao_20260928/ (JSON de todas as tabelas + ntes_de_aplicar/ + planilha original em CSV).

### O que foi feito no banco (uma transação só, ackup_migracao_20260928/aplicar.sql)
- Fonte: planilha AppSheet 19NzyHN_bexDuGa2--kwmczIhPl2vQyRKWYJI3dZJhDc (abas **Novos** 2022–26 = OS, **Antigos** 2015–21, **Empresas** = código → empresa). Scripts: scripts/migracao_planilha/simular.py (só lê; gera simulacao.xlsx e plano.json) e plicar.py (gera o SQL).
- **Clientes**: 3.216 → **3.079**. 139 duplicados juntados (mesmo telefone ou mesmo nome+rua+número; fica o cadastro mais antigo e as OS passam para ele); 3 clientes de teste com o telefone do Pedro (41) 98450-1037 apagados; 140 endereços corrigidos; 13 com dois telefones grudados separados (2º vai na referência); todos os telefones no padrão.
- **OS**: 1.933 → **1.931** (6 de teste apagadas, 4 novas de 24–25/09). Nova coluna **ordens_servico.origem_id** = Id da linha da planilha (rodar de novo atualiza, não duplica). 23 OS da O Desentupidor: só vão para lá se o técnico foi o Paulo. Técnico: onde a planilha diz "Jorge e Pedro" ou "Pedro e Graça", fica assim (comissões acompanham).
- **Técnico novo "Jorge e Pedro"** 0da0000-0000-0000-0000-000000000016 (cadastro sem login, igual ao Pedro e Graça).
- **CNPJs**: Curitibana **57.717.453/0001-50**; São José **38.057.542/0001-73**.
- **Tabela nova historico_servicos_antigos** (1.739 serviços 2015–2021, 1.719 ligados a cliente). NÃO é baixada com o app: aparece só ao abrir o cliente (componente src/components/clients/HistoricoAntigo.tsx). RLS: leitura por empresa.

### Regras (NÃO QUEBRAR)
1. **Telefone sempre (41) 99999-9999 / (41) 3333-4444**: sem DDD → 41; celular antigo de 8 dígitos ganha o 9; tira +55 e 0 da frente. Função única ormatPhoneBR em src/lib/clientSpreadsheet.ts (mesma regra do simular.py); aplicada no formulário, no importador e no syncService.processClientSync.
2. **Cliente repetido = mesmo telefone (8 últimos dígitos, phoneKey)**. O cadastro mostra aviso ao digitar o telefone ("Este cliente já existe", com botões Abrir OS / Ver cadastro) e pede confirmação ao salvar.
3. No sistema antigo cada chamado recriava o cliente: **um cliente, várias OS**. Cada OS guarda sua empresa (um cliente pode ter OS de duas empresas).
4. Endereço sem número (loja grande, ex.: Atacadão) é normal: não tratar como erro.
5. Importação de clientes: tela /clients/import + planilha modelo (downloadClientTemplate). Compara com quem já existe e só completa campos vazios.

### Conferência depois de aplicar
- 0 OS ligadas a cliente de outra empresa; 0 OS concluídas sem comissão; 0 comissões com técnico diferente da OS; 0 clientes com o telefone de teste.
- 8 grupos com o mesmo telefone que são pessoas diferentes (não juntados de propósito).
- 5 OS sem empresa (O Desentupidor feitas por Pedro e já estavam sem empresa).

### ⚠️ Pendências (decisão do Pedro)
- **Restos antigos (anteriores a esta migração)**: 32 comissões (R$ 179,04, nenhuma paga) e 158 receitas "PENDENTE" (R$ 106.365,90) apontando para OS que não existem mais (sobras das OS duplicadas/antigas apagadas antes). Inflam a tela Financeiro. SQL pronto: ackup_migracao_20260928/limpar_restos_sem_OS.sql (a trava de segurança do agente bloqueou rodar sozinho).
- **Possíveis OS em dobro na própria planilha**: Rosa (18/10/2024, R$ 480) e Vanessa (19/11/2024, R$ 480), duas OS concluídas cada, mesmo Id. Lista em ackup_migracao_20260928/possiveis_OS_duplicadas.csv.
- **Assinaturas e fotos (442 OS)** estão no Google Drive (10 pastas "Novos_Images"): falta o Pedro indicar a pasta certa para copiar.
- A planilha ainda é usada: combinar a data a partir da qual tudo vai só no app. Rodar simular.py de novo pega as OS novas (pelo origem_id).
- Cliente "Pedrinho teste" (41) 98450-1097 (teste da Contora) continua no banco.
### 4H (continuação, 28/09 à noite) — limpeza + assinaturas e fotos
- **Limpeza autorizada pelo Pedro** (ackup_migracao_20260928/limpeza_28_09.sql): apagadas 32 comissões e 158 receitas de OS que não existem mais; apagado o cliente de teste "Pedrinho teste" (41) 98450-1097 e sua OS (NFS-e nº 3 Contora, cancelada). Resultado: **3.078 clientes, 1.930 OS, 1.362 comissões, 1.364 lançamentos**, nenhum resto sem OS.
- **Assinaturas e fotos da planilha** copiadas do Google Drive para o Storage público **vatars/os-planilha/<arquivo>** e ligadas às OS pelo origem_id (**393 OS com assinatura, 112 com fotos**; Imagem → fotos.antes, Imagem 2 → fotos.depois). Só preencheu OS sem assinatura/foto (não sobrescreve o que o app já tinha). Scripts: scripts/migracao_planilha/midias.py e midias_sql.py.
  - As imagens estavam em 3 pastas "Novos_Images" do Drive: ppsheet/data/Desentupidora-SeuPedro-6012555/Novos_Images (principal), ppsheet/data/DesentupidoraFabiola-6012555/Novos_Images e Meu Drive/Novos_Images. Cópias dos zips em ackup_migracao_20260928/midias/.
  - Não achados: 48c03240.Assinatura (OS de teste já apagada) e 1 vídeo.
- A planilha NÃO foi alterada (o Pedro ainda usa).
- ⚠️ Pendência antiga vista no teste: o recibo impresso da **Curitibana** mostra o endereço da matriz (Rua Primeiro de Maio, Xaxim), embora empresas_marcas tenha o endereço certo (Rua Anne Frank, 844). Problema da tela/RPC de impressão, não dos dados.
### 4H (final) — Recibos e extrato com os dados verdadeiros de cada filial
- **Erro**: o recibo (PrintServiceOrder.tsx) trocava só o nome da rua pela da filial e mantinha número, bairro, cidade e CEP da **matriz** (a Curitibana saía com o endereço do Xaxim). Valia para todas as filiais.
- **Correção**: endereço montado só com os dados da filial (src/lib/brandAddress.ts → enderecoDaMarca), usado no recibo/orçamento/contrato e no **extrato de comissões** (TechnicianFinancialPrint.tsx, que também tinha "Curitiba - PR" fixo e, sem filial, pegava "ordem = 1" do banco inteiro — quebrava por existirem 2 contas Hidro Curitiba).
- **Função get_service_order_for_print** (migração supabase/migrations/20260928_print_os_dados_filial.sql, aplicada): (1) o fallback usava colunas inexistentes (empresa_id/matriz em empresas_marcas) e quebrava recibo de OS sem filial; (2) devolvia a linha inteira de empresas (tokens Focus/Webmania) para quem abrisse o link — agora só dados de cabeçalho; (3) não altera mais a OS ao abrir o recibo.
- Conferido na tela: Curitibana, Hidro, Nossa Cidade, São José e O Desentupidor saem com endereço/CNPJ/telefone certos; extrato com e sem filial idem.
- Conferência contra a planilha (scripts/migracao_planilha/conferir.py): 1.929 OS sem nenhuma divergência de empresa/técnico/assinatura. 18 códigos repetidos na planilha conferidos à mão (5 assinaturas estavam nas duas OS do mesmo código → corrigido em midias_correcao_repetidos.sql).
- As 4 OS sem filial (O Desentupidor feitas por Pedro/Pedro e Graça, "ficam onde estavam") imprimem com a filial do **cliente**.
- **28/09 (último ajuste)**: as 3 OS sem filial feitas por Pedro e Graça (6ffadd4b, 84eb4289, 2da204ef) foram para a **Hidro Curitiba** (decisão do Pedro); a do Marcio/Translovato (a636f52f, técnico Paulo) foi para a **O Desentupidor**. Nenhuma OS sem filial.

### 4H (rechecagem + Empresa/Condomínio, 28/09 noite)
- **Rechecagem**: tudo zerado (OS sem filial/técnico/cliente de outra empresa, comissões e receitas órfãs ou em dobro). Consultas prontas: `backup_migracao_20260928/checagem.sql` e `detalhe.sql`.
- **Apagados com OK do Pedro** (`limpeza_rechecagem.sql`, backup `antes_limpeza_rechecagem.json`): cliente Igreja Universal repetido com DDD 81 (sem OS) e a 2ª OS em dobro da Rosa (48db2624) e da Vanessa (702d298c), com comissão e receita. `simular.py` tem `DOBRADAS` para não recriar. Ficou: 3.077 clientes, 1.928 OS, 1.360 comissões, 1.362 lançamentos.
- **Campo novo Empresa / Condomínio** (vale para todos os assinantes): tabela `empresas_condominios` (uma lista por `empresa_id`, RLS por empresa, nome único sem diferenciar maiúsculas) + `clientes.empresa_condominio_id` (vínculo) + `clientes.empresa_condominio` (cópia do nome, para lista/busca/offline). Migração `supabase/migrations/20260928_empresas_condominios.sql`.
  - O app manda só o NOME; o gatilho `clientes_vincular_empresa_condominio` acha ou cria o registro **da mesma empresa assinante** e grava o id. Id de outra empresa é recusado. Renomear em `empresas_condominios` atualiza a cópia nos clientes.
  - Tela: campo abaixo do nome no cadastro (com sugestões), linha 🏢 na lista de clientes, nos cards de OS e na escolha do cliente da Nova OS; busca acha pelo condomínio; recibo ganha a linha "Empresa/Cond." (some se o nome gravado na OS já contém o condomínio). Planilha modelo e importação têm a coluna "Empresa / Condomínio".
  - Preenchido a partir da coluna `Emp.Cond` da planilha (`scripts/migracao_planilha/empresa_condominio.py`, lista em `backup_migracao_20260928/empresa_condominio.csv`, backup dos nomes em `antes_empresa_condominio_nomes.json`): 244 clientes ligados a 208 empresas/condomínios; 230 nomes limpos ("Gerson (Condomínio Maurer)" → "Gerson"); invertidos corrigidos ("Atacadao pinhais (Gustavo)" → Gustavo / Atacadao pinhais); não mexeu em recados ("Não pagou", "Orçamento", "teste", "Paulo fez") nem quando o campo tinha nome de pessoa.
  - As OS guardam o nome do dia do serviço (`cliente_nome`); não foram alteradas.
- **Catálogo de serviços (28/09)**: coluna nova `servicos.unidade` = `servico` (valor fixo) | `metro` | `litro` (migração `20260928_servicos_unidade.sql`). Tela Serviços tem "Forma de cobrar"; na Nova OS, serviço por metro/litro entra com a quantidade = metros/litros (campo "Metros"/"Litros") x valor unitário, e o recibo mostra "(13 m)"/"(40 L)". Cadastrados 15 serviços da empresa do Pedro com o valor que mais se cobrou em 2025-2026 na planilha (`backup_migracao_20260928/servicos_catalogo.sql`): esgoto R$ 780 fixo ou R$ 79/m; caixa de gordura limpeza R$ 680 fixo ou R$ 16,90/L; etc. Os 2 serviços de exemplo (R$ 1 e R$ 2) continuam lá.
- Rótulos do cadastro de cliente: "Nome do cliente ou quem atendeu" e "Empresa / Comércio / Condomínio" (como no AppSheet).
- **Calculadora de volume (Nova OS)**: escolha 'O que vai limpar?' (Caixa de gordura / Fossa) no topo da calculadora aberta. Antes o item saía sempre como 'Limpeza Fossa'. Agora sai 'Limpeza de caixa de gordura cilíndrica (Ø30x50 cm)' ou 'Limpeza de fossa ...', entrando como litros x preço do litro (unidade litro).
- **Logo da Curitibana (28/09)**: trocado para o PNG transparente (`avatars/brand_logo_curitibana_transparente.png`, 600x512, feito de `Downloads/Desentupidora-Curitibana/logo-curitibana.png`). Logo antigo, se precisar voltar: `avatars/brand_logo_93bd1248-9bcd-4e69-9d13-5569ae63db03_1790173881173.png`.
- **Assinatura (28/09)**: `src/components/ui/signature-pad.tsx` começa TRAVADA (Nova OS, clientes, técnicos). Travada, a tela rola por cima sem riscar (o `touch-none` só fica ligado quando destravada). Botões: 'Assinar' (sem assinatura) / 'Destravar para refazer' (com assinatura) / 'Travar assinatura'. A assinatura da empresa em Configurações usa outro componente (`components/SignaturePad.tsx`) e não mudou.
- **Testes apagados (28/09 noite, com OK do Pedro)**: OS de teste #5a60f801 (orçamento 'teste de Observações', sem comissão) e os 2 serviços de exemplo (R$ 1 e R$ 2). SQL `backup_migracao_20260928/apagar_testes_28_09_noite.sql`, backup `antes_apagar_testes_28_09_noite.json`. Banco: 3.077 clientes, 1.928 OS, 15 serviços, 208 empresas/condomínios.
- **Publicado** no GitHub/Vercel em 28/09 à noite (campo Empresa/Comércio/Condomínio, rótulos do cliente, forma de cobrar dos serviços, calculadora Caixa de gordura/Fossa, assinatura travada).

### 4I. 29/09/2026 — Financeiro começa em 01/09 (regra do Pedro)
- **Painel (Dashboard.tsx)**: "Contas a pagar" somava comissões pela data em que a comissão foi GRAVADA (a carga retroativa de 22/09 punha 2022-2026 "neste mês": R$ 447-600 mil). Agora filtra pela **data da OS** (`ordens_servico!inner(created_at, marca_id)`), e respeita a filial escolhida.
- **Financeiro (Financial.tsx)**: lia no máximo 1.000 lançamentos (limite do Supabase); agora busca em páginas.
- **Banco** (`backup_migracao_20260928/inicio_0109.sql`, rodado pelo Pedro no terminal porque a trava do agente bloqueou; backup em `antes_inicio_0109/`):
  - 1.346 comissões de OS antes de 01/09 → `pago` (histórico). Ficam **14 a pagar (R$ 3.624,95)**, todas de setembro.
  - `financeiro_fluxo`: só as receitas das OS de 01/09 em diante (**14, R$ 7.249,90**), com a data do serviço; as 1.346 antigas saíram (as OS continuam).
  - `despesas_tecnicos`: apagadas as 10 (8 de demonstração 15-21/09 + 2 de teste de junho) e as 2 saídas de teste.
- Regra para agentes: **o financeiro do Pedro começa em 01/09/2026**. Não recriar receitas/comissões "a pagar" de OS anteriores. Comissões e receitas sempre pela data da OS.

### 4J. 29/09/2026 — Cópia para design + Alerta do cliente (lista negra)
- **Cópia para testar design/funções sem mexer no app**: git worktree `C:\Users\pedro\NovoApp-design`, ramo `design-novo` (NÃO publicado), servidor `novoapp-design` na porta **5174** (`.claude/launch.json` do meu-app). `node_modules` é um atalho (junction) para o do NovoApp; `.env` copiado. Usa o MESMO banco de produção. Para juntar no app: merge do ramo `design-novo` no master (só com OK do Pedro).
- **Alerta do cliente** (feito NA CÓPIA; banco já tem os campos): `clientes.alerta_nivel` (`atencao` | `cobrar_mais` | `lista_negra`), `alerta_motivo`, `alerta_em`, `alerta_por`. Migração `NovoApp-design/supabase/migrations/20260929_clientes_alerta.sql` (APLICADA no banco). Gatilho `clientes_proteger_alerta`: só `cargo = 'admin'` da mesma empresa ou super admin marca/troca/tira; técnico que tenta alterar tem o valor antigo mantido (o resto do cadastro salva normal). Sem usuário (scripts) é permitido.
  - Tela (cópia): componente `src/components/clients/AlertaCliente.tsx` (SeloAlerta, FaixaAlerta, CampoAlerta). Cadastro do cliente: seção "Alerta para o próximo atendimento" (motivo obrigatório; técnico só vê). Lista de clientes: selo ao lado do nome + filtros "Com alerta" / "Lista negra". Aviso de telefone repetido mostra o alerta. Nova OS: faixa colorida ao escolher o cliente, atalho "Marcar/Alterar alerta" (só admin) e pergunta antes de abrir OS para cliente da lista negra. Cards de OS: selo compacto.
  - Dados: "Não pagou (Iêda ou Gabriela)" → nome "Iêda ou Gabriela" + lista negra; "Não ir nunca mais nesse (Carlos Henrique)" → "Carlos Henrique" + lista negra. OS da Nanci (26/02/2024) tem "não pagou se..." na descrição, é condição de preço, não calote: não marcada.
- **Alertas, parte 2 (29/09, na cópia)**: nível verde **`bom_cliente`** (✅ Bom cliente). Textos por assinante na tabela **`empresa_alertas_config`** (empresa_id, nivel, rotulo ≤30, mensagem ≤200, ativo, confirmar; RLS: todos da empresa leem, só admin/super admin grava; sem linha = texto padrão). Migração `NovoApp-design/supabase/migrations/20260929_alertas_config.sql` (APLICADA). Tela **Configurações → Alertas de clientes** (`/settings/alertas`, `src/components/clients/ConfiguracaoAlertas.tsx`): nome do alerta, mensagem que aparece ao abrir OS, ligado/desligado e "Perguntar 'Abrir OS mesmo assim?'" (padrão: só lista negra). Textos guardados no aparelho para uso offline. Decisão do Pedro: sem avaliação do técnico nem pergunta ao concluir OS; só dono/admin marca. A empresa do Pedro já tem os 4 textos padrão salvos.
- **Painel inicial redesenhado (29/09, NA CÓPIA NovoApp-design)** com as skills ui-ux-pro-max e redesign-existing-projects. Arquivos: `src/pages/Dashboard.tsx` (cabeçalho com data + período em botões 7/15/30/90 dias + PDF/CSV, aviso de teste só quando precisa, listas), `src/components/dashboard/DashboardStats.tsx` (cartão verde de faturamento com "por empresa" em barras + 4 números em grade 2x2 no celular / 4 no computador, valores curtos "R$ 12,3 mil", tabular-nums), `ServiceDistributionChart.tsx` (pizza trocada por barras), `RevenueChart`, `ClientGrowthChart`, `TechnicianRanking` (cartões brancos iguais, alturas menores no celular). Regras: nada de rolagem lateral (testado em 320, 360, 412 e 1366 px), botões ≥ 40-44 px, texto ≥ 12 px, uma cor de destaque (verde), sem efeitos de "passar o mouse" que não existem no celular, sem o selo falso "relatório em tempo real". A saudação fica só no topo do app (MainLayout).
- **Erro corrigido (cópia E app principal, local)**: a busca de comissões pela data da OS usava `ordens_servico!inner(...)`, mas **`historico_comissoes` não tem chave estrangeira para `ordens_servico`** (PostgREST devolve PGRST200). Agora busca as comissões com `.in('ordem_servico_id', ids)` das OS do período, em blocos de 200. Resultado: "A pagar" e comissões da equipe voltaram a aparecer.
- Painel também recalcula quando as filiais terminam de carregar (`brands.length` no useEffect), senão o "por empresa" ficava vazio ao abrir o app.
- OS #75ff80f2 (Luiz Seiti Hatashita, 29/09, R$ 1.380, Pedro e Graça) foi criada SEM filial e o cliente também sem filial — perguntar ao Pedro qual empresa.
- Se a cópia ficar em branco depois que o servidor cair: limpar o service worker e o cache só do localhost:5174.
- **Visual novo (29/09, NA CÓPIA) — escolhido pelo Pedro**: referência Dribbble "Egovern" + paleta **A**: **azul petróleo** `#0e4f5c` (base/topo), **laranja** `#f97316` (ações: Nova OS, botão +), **verde-limão** `#a3e635` (dinheiro que entra), vermelho só para "A pagar". Fonte **Plus Jakarta Sans** (index.html). Cores no Tailwind como `fd-petroleo`, `fd-laranja`, `fd-limao`, `fd-petroleo-suave`, `fd-laranja-suave`, `fd-limao-escuro`, `fd-fundo` (`tailwind.config.js`; mudar o config exige reiniciar o servidor).
  - `MainLayout.tsx`: topo do celular azul petróleo liso com saudação + espaço `headerExtra` (a página preenche via `useOutletContext().setHeaderExtra`); barra de baixo com nome em cada ícone e botão + laranja; "Nova OS" do computador em laranja.
  - Painel (`Dashboard.tsx` + `components/dashboard/DashboardStats.tsx`, que agora exporta `ResumoFaturamento`, `NumerosLinha`, `PorEmpresa`, `Cartao`, `brlCurto`, `nomeCurto`): faturamento no topo (celular) ou cartão petróleo (computador), busca de cliente, grade de 8 atalhos, período 7/15/30/90 (vira 7d/15d… abaixo de 360 px), 3 números (Média, A receber, A pagar), Últimas OS, Por empresa (barra dividida), Equipe, gráficos.
  - Bolinha de conexão (`OfflineSyncProvider.tsx`) virou selo no canto da foto do perfil no celular; botão da IA (`ChatAssistant.tsx`) menor, azul petróleo, acima da barra.
  - Testado em 320, 360 e 1366 px sem rolagem lateral. Mockups das direções mostrados ao Pedro no chat (A/B/C, Egovern, 4 paletas).

- **Fim da sessão 29/09:** tudo salvo em commits LOCAIS, sem push: NovoApp master `11a53aa9` (correções do painel e do financeiro + docs) e NovoApp-design ramo `design-novo` `71cbae82` (alertas + visual novo). Próximo passo: cards de OS no visual novo; depois juntar `design-novo` no master e publicar, só com o OK do Pedro.

### 4K. 29/09/2026 (tarde) — Visual novo em mais telas (CÓPIA) + erro da empresa sumindo
- **Cópia `NovoApp-design` (ramo `design-novo`, NÃO publicado)**, tudo com amostra aprovada pelo Pedro antes:
  - **Cards de OS** (modelo B): faixa na cor da empresa (borda do card), status tocável, data e técnico, ligar/WhatsApp/navegar 44 px, rodapé azul petróleo com valor e documentos (verde-limão = já gerado); editar/excluir no menu ⋮; alerta com selo completo + motivo.
  - **Clientes**: cartões iguais aos de OS, motivo do alerta, "+ OS", rodapé "N OS · última em dd/mm/aaaa" (das OS do aparelho); "Sem empresa" quando vazio.
  - **Nova OS**: empresas com nome curto, cliente em cartãozinho, Documento em botões, "+ Do catálogo"/Manual/"Calcular litros", total azul petróleo, barra fixa embaixo (Total, Orçamento, Salvar OS laranja). No formulário de OS a barra de navegação de baixo some. Aceita `?date=` e `?time=`.
  - **Agenda**: abre no **Mês** (Pedro escolheu), Semana a um toque; pontinho com nº de OS; lista do dia em cartões; OS sem horário = "sem hora" (datas meia-noite UTC da planilha); filtra pela empresa do topo; arrastar reagenda no computador.
  - Topo do app mostra "Nova OS", "Editar OS", "Agenda".
- **ERRO REAL corrigido (app oficial E cópia, local, SEM push):** `syncService` (fila por onde passa TODA gravação do app) não enviava `marca_id` de clientes nem de OS → tudo criado pelo app chegava ao banco sem empresa. Commits master `e8e9c799` + `19e420cd` (Nova OS grava a empresa no cliente que não tem). **Precisa publicar** (até lá, clientes/OS novos continuam sem empresa).
- Regra do Pedro: **com uma empresa escolhida no topo, todo cadastro vai para ela**. Cliente sem empresa: o formulário usa a do topo; com "Todas as Marcas" pede para escolher.
- Banco: Luiz Seiti Hatashita (cliente 2ca6817b) e OS 75ff80f2 colocados na **Hidro Curitiba** (backup_migracao_20260928/luiz_seiti_hidro.sql).
- Aparelho guarda 3.118 clientes x 3.077 no banco (apagados na junção continuam no Dexie) + 1 item na fila de sync recusado (cliente inexistente). Ver depois.
- Próximo: Financeiro/Serviços/Equipe/Relatórios no visual novo, ou juntar `design-novo` no master e publicar — só com OK do Pedro.


### 4L. 29/09/2026 (noite) — Redesenho da CÓPIA concluído em todas as telas + o que falta (retomar em 30/09)

> Tudo em commits LOCAIS. **Nada publicado** (GitHub/Vercel). Cópia = `C:\Users\pedro\NovoApp-design`, ramo `design-novo`, servidor `novoapp-design` porta **5174**. App oficial = `C:\Users\pedro\NovoApp` (master), porta **5173**. Os dois usam o MESMO banco de produção.

#### Estado de cada tela na cópia (5174)
| Tela | Como ficou | Commit |
|---|---|---|
| Painel | visual novo (petróleo/laranja/limão), faturamento no topo, 8 atalhos, 2x2 | 71cbae82 + revisão |
| Cards de OS | modelo B: faixa na cor da empresa (borda do card), nome da empresa NA COR DELA, status tocável, data/técnico, ligar/WhatsApp/navegar 44 px, rodapé petróleo com valor e documentos, editar/excluir no menu ⋮, alerta com selo completo + motivo | be7d2254, 5a9b8744, ec08c534 |
| Clientes | cartões iguais aos de OS, "+ OS", rodapé "N OS · última em", "Sem empresa" quando vazio | 93c53dd1 |
| Nova OS | empresas com nome curto, cliente em cartãozinho, Documento em botões, "+ Do catálogo"/Manual/"Calcular litros", total petróleo, barra fixa (Total, Orçamento, Salvar OS); barra de navegação some no formulário; aceita ?date=&time= | 5a140d08 |
| Agenda | abre no MÊS (escolha do Pedro), Semana a um toque, pontinho com nº de OS, lista do dia em cartões, "sem hora" para datas meia-noite UTC, filtra pela empresa do topo | 655dea6b |
| Financeiro | **VISUAL ORIGINAL** (Pedro rejeitou o novo no celular); só ganhou: um mês por vez, cartão "Comissões a pagar", saldo descontando comissões, data certa na lista | d06b7dca |
| Serviços | cartõezinhos SEPARADOS (pedido do Pedro), preço à direita, filtros Fixo/Metro/Litro, "+ Novo", excluir dentro da edição | 7d2bd8c9 |
| Equipe | cartões com o mês de cada técnico (OS + comissão a pagar + botão Extrato), Ativos/Inativos, iniciais, desativar dentro da edição | aec20b14 |
| Relatórios | tabelas dos 7 relatórios viram cartões no celular (CSS `.tabela-cartoes` em index.css + data-label automático), DRE em 2x2, topo compacto | fda0e042 |

#### Revisão com a skill ui-ux-pro-max (767ce824) e o que o Pedro mandou VOLTAR
- Mantido da revisão: letras ≥ 12 px, alvos de toque ≥ 44 px, cinzas de texto mais escuros (slate-500/600), campos da Nova OS ligados aos títulos, microfone com nome.
- **Voltou por gosto do Pedro (não trocar de novo sem perguntar):** nome da empresa escrito na COR da empresa (7abe6e9d); botões no laranja CLARO `fd-laranja` com letra branca (7abe6e9d); filtros e selos de alerta com EMOJIS COLORIDOS ⚠️ ⛔ ✅ 💲 (2b30bb7b).
- Títulos repetidos no computador removidos (o topo do app já mostra o nome da tela) (9f9b3deb).
- Método combinado: a cada tela, rodar as buscas da skill + medir em 375 px (contraste, toque, letra, rolagem lateral), mostrar amostra ao lado do original, só aplicar com OK, e pedir para ele conferir no celular.

#### Correções de erro (não são visual)
- **Empresa sumindo:** a fila de envio (`syncService`) não mandava `marca_id` → todo cliente/OS criado pelo app ia sem empresa. Corrigido no **app oficial** (e8e9c799) e na cópia. Regra do Pedro: com empresa escolhida no topo, todo cadastro vai para ela; cliente sem empresa ganha a empresa da OS aberta para ele (19e420cd). Luiz Seiti Hatashita + OS 75ff80f2 colocados na Hidro Curitiba (banco).
- **Dois servidores juntos quebravam a cópia** ("Invalid hook call", tela branca): o node_modules é compartilhado e os dois gravavam a mesma pasta `.vite`. A cópia agora usa `node_modules/.vite-design` (vite.config.ts, 03a0e683). No app oficial nada muda.
- Se a tela ficar branca depois do servidor cair: limpar service worker + cache só daquele localhost.

#### O QUE FALTA (retomar)
1. **Publicar a correção da empresa (marca_id) do app oficial** — até publicar, clientes/OS novos criados no app oficial continuam chegando sem empresa. Pode subir sozinha, antes do visual. Só com OK do Pedro.
2. Pedro disse que **"ainda tem mais coisas"** no design: revisar com ele no celular tela por tela (comparando 5173 x 5174) e anotar o que mudar.
3. Telas ainda NÃO redesenhadas: Configurações (e subpáginas), Não Feitos, Super Admin, telas do técnico (/tecnico/*), impressões (recibo/PDF não devem mudar), login.
4. Não verificado: modo escuro e celular deitado.
5. Juntar `design-novo` no master (merge) e publicar — só com OK do Pedro. Cuidado: master tem commits próprios (11a53aa9, b97657ad, e8e9c799, 19e420cd, 62c0773e + este doc) que a cópia também tem em versão própria; resolver conflitos em syncService/NewServiceOrder/Dashboard/Financial.
6. Pendências antigas: Graça aparece na Equipe só com R$ 134 da conta de TESTE (aaaaaaaa) — não é da empresa; aparelho guarda 3.118 clientes x 3.077 no banco e 1 item recusado na fila de sync (cliente apagado); nomes duplicados "Jorge"/"Pedro" na lista de técnicos do Fechamento; tokens Focus/Contora a trocar; notas Focus 581/584; "Não optante" com o contador; data de virada da planilha; 7 telefones inválidos.
7. Segurança (seção 4B) continua sem correção.

- **30/09:** o Pedro vai trabalhar em OUTRA coisa no app ORIGINAL (5173/master) antes de voltar à cópia.

### 4M. 29/09/2026 (fim da noite) — Alertas no app oficial + chamado Contora #96
- **Alertas do cliente trazidos para o app OFICIAL** (master `75a132c9`, local, SEM push): só a função, sem o visual novo. Selo no cliente e no card de OS, filtros "Com alerta"/"Lista negra"/"Bom cliente", campo no cadastro (só dono/admin), faixa + pergunta na Nova OS, Configurações → Alertas de clientes (`/settings/alertas`). `syncService` envia `alerta_nivel`/`alerta_motivo`. Conferido na 5173.
- **Contora — chamado #88 respondido** (27/09 18:38): E999 = pTotTribSN 0.00; E0120 = Mandirituba sem CNC (não mandar IM); via API opSimpNac = 3 (ME/EPP); filial Xaxim excluída.
- **Contora — chamado #96 aberto** (29/09 18:33, `console/suporte/83a5d643-a825-4d92-ad2a-b480f91ae1af`): local da prestação dinâmico por nota. A OpenAPI tem `service.incidence_city_code` (IBGE 7 dígitos, por nota; omitido = cidade da sede), mas cita o leiaute ABRASF: perguntado se vale na NFS-e Nacional, se muda ISS/alíquota/retenção, e por que o Município do tomador saiu só "PR" na nota nº 4 (cliente com `codigo_municipio` NULL). **Aguardar resposta + OK do contador antes de implementar.**
- Falta publicar (só com OK): correção do marca_id (e8e9c799, 19e420cd) e os alertas (75a132c9).

### 4N. 30/09/2026 — Planilha AppSheet → FlowDrain automático (n8n)
- **Fluxo n8n** "Planilha AppSheet -> FlowDrain (OS e clientes)" (id `cnEP6SAUmsQDhmx8`, n8n da VPS, PUBLICADO): a cada 1 hora lê a aba **Novos** pelo **Composio** (GOOGLESHEETS_BATCH_GET, credencial "Composio API Key"; **só leitura**, a planilha nunca é alterada), o nó Code (`scripts/n8n/organizar_linhas.js`) organiza as linhas alteradas nos últimos 3 dias (Data_Atualizacao) e manda para `rpc/planilha_sync` (credencial Supabase do n8n).
- **Função `public.planilha_sync(empresa, linhas, simular, limite)`** (migração `20260930_planilha_sync.sql`, só service_role): mesmo Id da planilha (`origem_id`) → atualiza se mudou (`origem_atualizado_em`; OS com NFS-e autorizada não muda valor/serviços); OS criada à mão no app com mesma data+valor+telefone/nome → só liga; senão cria (cliente pelo telefone ou novo). Comissão/receita pelo gatilho. `p_limite = 1` = uma OS por rodada. `p_simular = true` = testa sem gravar.
- 30/09: importadas as 4 OS de 28/09 que faltavam (Thiago, Seiti ligada à 75ff80f2, Denise, Vinicius).
- **30/09 (fim da tarde):** fluxo roda **a cada 1 hora**, até **10 OS por rodada** (`p_limite: 10`). NFS-e: Contora corrigiu o DANFSe (chamado #96, 12:08) — município do tomador certo mesmo com local da prestação; conferido no PDF da nota nº 6. Cards de OS: data do serviço ("Seg, 28 set 2026" + hora) e ícones sempre abaixo do valor.

### 4O. 30/09/2026 — RESUMO PARA QUEM CONTINUAR (troca de conta) — LER PRIMEIRO
> Tudo abaixo está PUBLICADO (GitHub master + Vercel app.gerenciaservicos.com.br), salvo onde diz "pendente".

**1. NFS-e (Fiscal Contora) — CONCLUÍDO**
- Configurações → Nota fiscal (`src/components/nfse/ConfiguracaoNotaFiscal.tsx`):
  - Chave **"Local da prestação = cidade do cliente"** (`empresa_nfse_config.local_prestacao_cliente`, salva ao tocar). **LIGADA** na empresa do Pedro (quase todas as notas são de Curitiba e São José dos Pinhais). Contador precisa saber (ISS vai para a prefeitura da cidade do serviço; no Simples a alíquota NÃO muda).
  - **Informações complementares**: `info_complementar` (toda nota; hoje "garantia de 30 dias exceto vaso e caixas de gordura") e `info_complementar_retencao` (só com ISS retido; botão com o texto padrão "RETENÇÃO ISS {aliquota} CFE. RESOLUÇÕES DO CGSN Nº 94/2011 E 135/2017. INSS NÃO RETIDO CFE ARTIGO 120 DA IN RFB 971/2009."; `{aliquota}` vira "2,00%").
- Cadastro do cliente: chave **"Este cliente retém o ISS"** (`clientes.iss_retido`) abaixo do CPF/CNPJ; selo "ISS retido" no card da OS. Nota sai com `iss_withheld` e valor líquido sem o ISS; exige CPF/CNPJ.
- CEP em branco no cadastro do cliente é achado sozinho pela rua+número+bairro+cidade (`src/services/cepService.ts → descobrirCep`, ViaCEP; não chuta).
- Edge Function **`nfse-contora` (versão 4, publicada)**: cidade do cliente via `municipioDoCliente` (CEP → ViaCEP/BrasilAPI → código gravado → nome+UF na API do IBGE; bloqueia antes de criar a nota se a chave estiver ligada e não achar a cidade); `service.incidence_city_code` (→ `<cLocPrestacao>`/`<cLocIncid>`); `taker.address.city`; descrição da nota montada dos itens da OS (data, serviços com m/L/qtd x valor, desconto, local com empresa/condomínio, observações limpas; SEM nº da OS e SEM técnico; máx. 1.000); `service.additional_info`.
- **Deploy da Edge Function: o agente é bloqueado; o Pedro roda DENTRO de `C:\Users\pedro\NovoApp`:** `npx supabase functions deploy nfse-contora --project-ref dltqxfyrltgbudtzxzot`.
- Contora: chamado **#88** (E999/E0120, resolvido) e **#96** (local da prestação por nota; DANFSe mostrava Mandirituba no município do tomador → Contora corrigiu 30/09 12:08). Notas de teste nº 5 e 6 CANCELADAS; nº 4 (Luiz Seiti) cancelada 29/09 — se ele precisar de nota, "Emitir nova" na OS 75ff80f2.
- Livro Fiscal (Relatórios → Fiscal, `src/pages/Reports.tsx`): botões **PDF** e **Enviar** (WhatsApp, só nota autorizada). Card da OS já tinha WhatsApp na faixa verde da nota autorizada.
- Pendente (sugerido, sem OK): trocar o status técnico ("processando_autorizacao") por palavras simples no Livro Fiscal e tirar o "cancelada" repetido da coluna dos botões. Focus (`focusNFeService.getCodigoMunicipio`) ainda usa lista fixa de cidades (ruim p/ SaaS; Pedro usa Contora).

**2. Planilha AppSheet → app (n8n) — FUNCIONANDO**
- Fluxo n8n VPS `cnEP6SAUmsQDhmx8` "Planilha AppSheet -> FlowDrain (OS e clientes)", PUBLICADO: **1x por hora**, lê a aba Novos pelo Composio (credencial "Composio API Key", só leitura), Code `scripts/n8n/organizar_linhas.js` (linhas alteradas nos últimos 3 dias), POST `rpc/planilha_sync` com credencial "Supabase account" (service_role colada pelo Pedro), **até 10 OS por rodada**.
- Função `public.planilha_sync(empresa, linhas, simular, limite)` (migração `20260930_planilha_sync.sql`): cria / atualiza (origem_id + origem_atualizado_em) / liga OS feita à mão (data+valor+telefone ou nome); nunca duplica; comissão e receita pelo gatilho. Importadas 30/09: Thiago, Denise, Vinicius; Seiti ligada à 75ff80f2. Banco: 1.933 OS.
- MCP do n8n: o app desktop não reconecta (não existe /mcp); o agente usa o script `n8n_mcp.py` (lê a config do `.claude.json`, nunca imprime o token). Fluxo tem `availableInMCP`.
- Pendente: fotos/assinaturas novas da planilha (2ª etapa); data da virada (planilha → só app).

**3. Tela das OS (card)** — data do serviço "Seg, 28 set 2026" + hora (data sem hora = meia-noite UTC, usa o dia do texto); ícones do rodapé sempre abaixo do valor, à esquerda. Alertas de cliente (lista negra etc.) publicados.

**4. Cópia de design (NovoApp-design, ramo design-novo, porta 5174) — NÃO publicada**, ver 4L. Falta revisar com o Pedro e juntar no master.

**5. Regras que continuam:** pt-BR SEMPRE (inclusive frases curtas entre ferramentas); nunca colar/digitar tokens; push/deploy só com OK; não usar `supabase db push`; não mexer na planilha; não pôr botões novos nos cards de OS; celular primeiro; mostrar amostra antes de redesenhar.


---

### 4P. 01/10/2026 — Velocidade do app e proteção da sincronização (PUBLICADO) — LER ANTES DE MEXER EM SYNC, PDF/EXCEL OU PAINEL

> Origem: plano de 14 etapas do Codex em `G:\Meu Drive\Minhas memorias Claude\Minhas Memorias\Automacoes\FlowDrain-Plano-Seguranca-Desempenho-Offline-2026-10-01.md` (estado em `...\FlowDrain-Estado-e-Continuidade.md`). O Codex só analisou; **quem implementou foi o Claude Code em 01/10**, em cópia isolada, conferido no Chrome real do Pedro, e publicado com o OK dele. Foram feitas partes das etapas 2, 3 e 8 do plano. O resto do plano continua pendente (ver item 5).

**1. O que mudou (arquivo → efeito)**
- `vite.config.ts`: o chunk `utils` agora tem **só** `date-fns`. **Não listar `xlsx-js-style`, `jspdf`, `jspdf-autotable` nem `html2canvas` no `manualChunks`**: o helper de preload do Vite cai dentro desse chunk e ele volta a ser baixado na abertura do app.
- `src/lib/clientSpreadsheet.ts`: o Excel é importado dentro de `downloadClientTemplate()` (agora `async`). Este arquivo é carregado na abertura (o `syncService` importa `formatPhoneBR` dele): **nunca importar `xlsx-js-style` de forma estática aqui**.
- `Dashboard.tsx` (gerador de PDF), `Reports.tsx` e `TechnicianFinancialPrint.tsx` (jsPDF e html2canvas): `import()` dentro da função do botão, só no clique.
- `ServiceOrders.tsx`: `orders` em `useMemo` com `Map` por id (antes cada OS fazia `.find` em ~3.000 clientes a cada renderização). O primeiro item com o mesmo id continua vencendo.
- `Dashboard.tsx`: eventos em tempo real (UPDATE de OS, INSERT de despesa) são agrupados: **uma** recarga depois de 1,2 s de silêncio (som e aviso na tela continuam imediatos). O n8n atualiza até 10 OS por rodada.
- `src/components/clients/AlertaCliente.tsx`: `carregarAlertasConfig` reaproveita a consulta em andamento. Antes, 24 cartões montando juntos (sem cópia no `localStorage`, ex.: primeira visita) faziam **24 consultas idênticas** a `empresa_alertas_config`.
- `src/services/pullPlan.ts` (novo) + `syncService.pullAllData`: regra do pull em função pura (`planejarPull`) aplicada dentro de **transações Dexie**. Ver regras abaixo.
- `syncService.pullAllData`: a paginação de clientes e de OS agora ordena por `created_at` **e `id`** (desempate).
- `syncService`: `saveClient`, `createClient`, `deleteClient`, `saveServiceOrder` e `deleteServiceOrder` gravam o dado local **e** o item da fila numa transação só.
- `syncService.pullAllData` devolve `ResultadoPull { ok, motivo?, mensagem? }` (`motivo`: `offline` ou `erro`); `OfflineSyncProvider.tsx` e o botão "Atualizar Dados" de `ServiceOrders.tsx` mostram o erro de verdade.

**2. Medidas (antes → depois)**
- JS baixado na abertura (comprimido, medido no navegador): **~746 KB → ~228 KB** (chunk `utils`: 518 KB → 7,6 KB; Excel 323 KB e PDF/captura 185 KB saíram da abertura).
- Cálculo da lista de OS: 13,7 ms → 0,48 ms (1.900 OS x 3.000 clientes, **0 divergências** contra a lógica antiga).
- Consultas de alertas por tela: 24 → 1.
- Pull no IndexedDB real: ~300 ms → ~200 ms. "Atualizar Dados" ponta a ponta: 13,2 s → 9,4 s (a maior parte é rede).
- Dez eventos seguidos do banco → 1 recarga do Painel.

**3. Regras — NÃO QUEBRAR**
1. **O pull nunca sobrescreve nem apaga registro com `synced === 0`** (edição/criação ainda não enviada) **e não ressuscita exclusão que está na fila** (`sync_queue` com `action = 'delete'`). Só remove do aparelho o que já estava sincronizado e sumiu do servidor. Tudo restrito à empresa (`where('empresa_id')`); antes lia o banco local inteiro e podia apagar OS de outra empresa.
2. **Paginar sempre com desempate:** `.order('created_at', ...).order('id', ...)`. `created_at` repete (841 valores repetidos entre os clientes, por causa das cargas em lote). Sem o `id`, a paginação repetia 1 cliente e **deixava 1 de fora do aparelho** (servidor 3.084, local 3.083). Isso já existia antes de 01/10.
3. **Dado local e fila de envio na MESMA transação Dexie** (`db.transaction('rw', db.<tabela>, db.sync_queue, ...)`). Chamadas de rede ficam fora da transação.
4. **Nunca mostrar "sincronizado" sem checar `resultado.ok`.**
5. **Cadeia da abertura enxuta:** depois de qualquer mudança em imports, rodar `vite build` e conferir `dist/index.html`: só `vendor`, `ui` e `db` devem aparecer em `modulepreload`. Se `xlsx`, `pdf`, `jspdf` ou `html2canvas` aparecerem, alguém criou um import estático na cadeia da abertura.
6. `public/sw.js` (manual) **não vale em produção**: o plugin PWA gera outro `sw.js` com o mesmo nome e sobrescreve no build (Workbox, `autoUpdate`, 73 arquivos em precache). O manual só aparece no `vite dev` (cache-first, pode causar tela branca: limpar service worker + cache da porta).

**4. Como conferir (receita)**
- `vite build --outDir <pasta>`; olhar `modulepreload` (regra 5); `tsc --noEmit -p tsconfig.app.json` tem **136 erros que já existiam** (comparar o TEXTO dos erros com a base, não só a contagem); `eslint` nos arquivos alterados tem 2 erros que já existiam.
- Sync de verdade: no navegador, plantar no IndexedDB `FlowDrainDB` um registro `synced: 0` e outro `synced: 1` que não existe no servidor (sem item na fila), clicar em **Atualizar Dados** e ver que o pendente fica e o fantasma sai. Depois apagar os testes.
- Contagem: `HEAD` de `clientes`/`ordens_servico` com `Prefer: count=exact` (cabeçalho `Content-Range`) deve bater com o `count()` do IndexedDB (hoje 3.084 clientes e 1.936 OS, fila 0).
- Downloads de PDF/Excel podem ser conferidos sem salvar arquivo: interceptar `HTMLAnchorElement.prototype.click` e `EventTarget.prototype.dispatchEvent` para âncoras com `download`.
- Atenção: a ferramenta de rede do navegador mostra o `Authorization` (token da sessão) nos cabeçalhos; não copiar nem repetir.

**5. O que NÃO foi feito (pendente) — plano de 14 etapas**
- **Etapa 9 (sincronização incremental):** o app ainda baixa tudo a cada abertura (~9 s). É o maior ganho que falta e o mais arriscado (exclusões no servidor, timestamps iguais, relógio errado, longo tempo sem abrir, n8n atualizando em paralelo). Só depois de medir; manter o plano B de baixar tudo.
- **O3 (fila sem dono/empresa):** exige migração do Dexie para v3. App antigo v2 não lê banco v3: planejar reversão antes.
- **O6/O7 (anexos offline, perfil offline) e etapas 4 a 7, 10, 11, 13, 14** do plano: não iniciadas.
- **Segurança (etapa 12 / seção 4B):** nada corrigido (tokens expostos, RLS de `usuarios`, RPC de impressão, `jsPDF` crítico no `npm audit`).
- No app, o bloco "Por empresa" do Painel some de forma intermitente (corrida: o efeito que busca os dados não refaz a busca quando as filiais chegam depois; a cópia `design-novo` já corrigiu com `brands.length` nas dependências).
- O startup repete `usuarios?id=eq.` 3x e `empresas?select=nome` 3x.
- O PDF de Relatórios pesa ~10,6 MB (captura em PNG; JPEG reduziria). Já era assim.

**6. Ambiente usado**
- Cópia isolada: `C:\Users\pedro\NovoApp-rapido` (ramo `otimizacao-velocidade`, já juntado ao `master`). **Cuidado:** o `node_modules` dela é um atalho (*junction*) para o do `NovoApp`; **nunca** rodar `git worktree remove` nem `Remove-Item -Recurse` nela sem antes remover o atalho, ou o `node_modules` do app principal pode ser apagado.
- Servidor de teste `novoapp-rapido` (porta 5175, `vite preview` da pasta `dist-t3`), configurado em `.claude/launch.json` do `meu-app`. Para ver build novo ali é preciso limpar o service worker da origem 5175.


---

### 4Q. 01/10/2026 (noite) — Tela não trava mais na abertura, PDFs 97% menores, "Por empresa" estável (PUBLICADO) — LER ANTES DE MEXER EM SYNC, LISTA DE OS, HOOKS OU PDF

> Continuação da seção 4P (mesma autorização do Pedro: "pode fazer do 1 ao 3, abra o navegador e teste... veja se teve ganho e não quebrou nada" e depois "pode aplicar"). Três commits: `b02123f1` (Painel), `e7501998` (PDF), `2e914fd0` (sync e telas). Nada mudou no banco.

**1. A descoberta que mudou o plano**
- A "sincronização incremental" planejada (etapa 9) **não era o gargalo**: baixar tudo leva ~0,5 a 0,7 s (4 páginas de clientes em 715 ms em sequência, 626 ms em paralelo). O que travava a tela era **CPU no navegador**: o `pullAllData` regravava os ~5.000 registros a cada abertura e cada regravação fazia as listas refazerem filtro, ordenação e desenho.
- `clientes` **não tem coluna `updated_at`** (só `ordens_servico` tem; `servicos` e `usuarios` também não). Sync incremental de verdade exigiria alterar o banco (coluna + gatilho). **Não foi feito e não é necessário** agora; só reavaliar se o volume crescer muito.
- Perfil de CPU (antes): `g` da tela de OS 2,5 s, ordenações em `useOfflineData` 2,4 s, `put` do IndexedDB 1,4 s, dentro de uma sincronização de 5,8 s com 3,8 s de tela travada.

**2. O que mudou (arquivo → efeito)**
- `src/services/pullPlan.ts`: `planejarPull` ganhou o 5º parâmetro `mudou` e devolve `semMudanca`; novo `linhaMudou(local, servidor, ignorar=['updated_at'])`. **`null` e `undefined` contam como iguais** (vazio); `0` e `false` são valores. Só é gravado o que é novo ou mudou.
- `src/services/syncService.ts` (`pullAllData`): usa `linhaMudou` para clientes e OS, e só chama `bulkPut` se há o que gravar; loga `[SyncService] clientes: N gravados, M sem mudança...` e o mesmo para OS. Esperado no console, sem mudança real: **0 gravados**.
- `src/hooks/useOfflineData.ts`: `ordenarPorTempo` converte a data **uma vez por registro** (antes o comparador criava `new Date` várias vezes por comparação) e usa `Intl.Collator` no desempate. Mesma ordem de antes (provado com 3.084 clientes e 1.936 OS cheios de empates, datas vazias e inválidas); 5 a 6 vezes mais rápido.
- `src/pages/ServiceOrders.tsx`: (a) filtro + ordenação de OS em `useMemo` (`ordenarOS` converte a data uma vez); (b) `dataDoCard` com cache por texto da data (antes 3 chamadas por cartão, cada uma criando formatadores de data); (c) o trecho que sincroniza NFS-e ao abrir a tela agora usa **uma transação**, `bulkGet` + `bulkUpdate` só do que mudou, e **pula OS com `synced === 0`**. Antes eram ~500 `update` separados a cada abertura e ele gravava `synced: 1` até em OS com edição pendente (isso deixava o pull sobrescrevê-la).
- `src/pages/Dashboard.tsx`: `brands.length` nas dependências do efeito que busca os dados. O bloco "Por empresa" só é calculado quando já há filiais; se elas chegavam depois da primeira busca, ele sumia (intermitente).
- `src/pages/Reports.tsx` e `src/pages/TechnicianFinancialPrint.tsx`: a captura da tela vai para o PDF como **JPEG 0,92** (era PNG). Fundo branco, sem perda visível.

**3. Medidas (Chrome do Pedro, mesmos dados, produção anterior contra build novo)**
- Abrir a lista de OS e esperar 16 s: tela travada **11.184 ms (93 tarefas longas) → 2.328 ms (16)**.
- "Atualizar Dados": 5.807 ms → 1.976 ms; tela travada 3.835 ms → 184 ms (25 tarefas → 3).
- PDF de Relatórios 10,13 MB → 0,27 MB; Extrato de comissões 11,78 MB → 0,32 MB (e 3,4 s → 1,9 s para gerar).
- `tsc`: **129 erros** (a base de 136 já existia; os 7 a menos são das colunas `nfe_*` do trecho reescrito, nenhum novo). Lint: os mesmos 2 erros.

**4. Regras — NÃO QUEBRAR**
1. **O pull só grava o que mudou.** Não voltar a `bulkPut` de tudo: cada regravação invalida as consultas ao vivo (`useLiveQuery`) e redesenha as listas.
2. **Ao adicionar um campo ao mapeamento do pull** (clientes ou OS em `pullAllData`), conferir que ele **não varia a cada sincronização** (ex.: `|| new Date().toISOString()` em campo que pode vir nulo faria a linha ser regravada sempre). `updated_at` de cliente é ignorado de propósito.
3. **Nunca marcar `synced: 1` em registro com edição pendente** nem gravar por cima de `synced === 0` (vale para qualquer código novo que atualize `db.ordens_servico`/`db.clientes`).
4. Ordenação e filtro de listas grandes: converter datas uma vez, usar `useMemo`, e não criar `Intl`/`toLocaleString` em loop (usar cache).
5. Ferramenta de medição: `PerformanceObserver({type:'longtask'})` (soma da tela travada) + `performance_start_trace` do chrome-devtools com `reload:false`, gravando em arquivo (o arquivo tem ~90 MB; ler com Python somando o `ProfileChunk` por função). Comparar sempre produção contra build novo, mesma tela, mesmo tempo de espera.

**5. Pendente depois desta rodada**
- **O3** (fila sem dono/empresa, exige Dexie v3), **segurança** (seção 4B), etapas 4 a 7, 10, 11, 13 e 14 do plano de 14 etapas.
- Startup repete `usuarios?id=eq.` 3x e `empresas?select=nome` 3x.
- A imagem do PDF de Relatórios inclui o botão "Gerando..." e o seletor de relatório cortado (o app fotografa a tela inteira; já era assim). Melhor seria gerar o PDF a partir de um bloco só do conteúdo.
- Se um dia houver sync incremental de verdade: precisa de `updated_at` + gatilho em `clientes` (alteração de banco, pedir OK ao Pedro).


---

### 4R. 02/10/2026 — Painel abre em "Este mês" e regra do "DIA DA OS" em todas as telas — PRONTO, AGUARDANDO PUBLICAÇÃO — LER ANTES DE MEXER EM PERÍODO, MÊS OU DATA DE OS

> **Estado (02/10/2026, fim do dia): NADA disto foi publicado.** Está em commits locais, em dois ramos:
> - `periodo-mes-atual` (worktree `C:\Users\pedro\NovoApp-rapido`), em cima do `master` `a69b48c8`: `0b44374c` (filtro do Painel), `dddacb16` (dia da OS no Painel), `82cc9e71` (módulo `diaDaOS.ts`), `9a2c903b` (Relatórios), `6038e282` (Extrato e Fechamento), `5a687af9` (datas exibidas em recibo, contrato, Financeiro, Não Feitos e PDF do Painel) e o commit de documentação desta seção.
> - `seguranca-dependencias` (worktree `C:\Users\pedro\NovoApp-seguranca`, com `node_modules` PRÓPRIO), commit `6ecbd9fc`: só o `package-lock.json` (auditoria de produção 6 → 0).
> - **Para publicar (só com OK do Pedro):** no `C:\Users\pedro\NovoApp`, `git merge periodo-mes-atual` (avanço direto) e `git merge seguranca-dependencias` (arquivos diferentes, sem conflito), `git push origin master`, esperar a Vercel, conferir em produção (ver "Conferir" abaixo) e trocar este aviso por "PUBLICADO". **Publicar o pacote inteiro junto**: Painel, Relatórios, Extrato e Financeiro passam a concordar entre si; publicar só um deixaria números diferentes entre telas.
> - Há uma cópia de segurança dos commits em `G:\Meu Drive\Minhas memorias Claude\Minhas Memorias\Automacoes\flowdrain-2026-10-02.bundle` (`git bundle`; restaura com `git clone` ou `git fetch` a partir do arquivo).

**1. Pedido do Pedro e o que descobrimos**
- Pedido: em 02/10 o Painel mostrava os "últimos 30 dias" (R$ 9.390,08) embora outubro não tivesse faturamento; ele quis **"Este mês" como padrão**. Depois pediu para conferir a última OS e as pontas do mês ("o mês começa no primeiro minuto e termina no último").
- **A armadilha:** as OS vindas da planilha só têm o DIA e ficam gravadas como **meia-noite UTC** (`2026-10-01T00:00:00+00:00` = 30/09 às 21:00 em Brasília). Filtrar pelo instante local jogava toda OS do dia 1º no mês ANTERIOR: Mariana (R$ 960) e Paula (R$ 580), ambas de 01/10, ficavam em setembro e "Este mês" mostrava R$ 0,00 errado. E mostrar com `new Date(x).toLocaleDateString()` exibia o dia anterior (14 dos 21 lançamentos do Financeiro; recibo/contrato em alguns casos). Isso já existia antes de 02/10, em todas as telas.

**2. A regra (NÃO QUEBRAR) — `src/lib/diaDaOS.ts`**
- Data **sem hora** (`AAAA-MM-DD`, ou meia-noite UTC em `Z`, `+00:00`, `+00`) vale o **DIA ESCRITO**; data **com hora** vale o **instante, no fuso local do aparelho**. É a mesma regra que o cartão da OS (`dataDoCard` em `ServiceOrders.tsx`) já usava.
- Funções: `dataEfetivaDaOS` (meio-dia local do dia escrito, ou o instante), `dentroDoPeriodoDaOS(iso, {start?, end?})` (período aberto de um lado vale), `janelaDeBusca(periodo)` (período com 1 dia de folga de cada lado, para BUSCAR no banco), `fimExclusivoISO` (para `.lt` em datas com hora), `formatarDiaDaOS(iso, vazio='')` (dd/mm/aaaa para MOSTRAR), `ehDataSemHora`.
- **Como filtrar período em tela nova:** buscar com `janelaDeBusca` (`gte` início, `lte` fim) e depois filtrar em JS com `dentroDoPeriodoDaOS`. Nunca filtrar OS só por `.gte/.lte('created_at', início/fim local)`.
- **Como mostrar data de OS/lançamento:** `formatarDiaDaOS(...)`, nunca `new Date(x).toLocaleDateString()`.
- Todo período termina em **23:59:59.999** (com os milissegundos) e começa em **00:00:00.000**; "últimos N dias" começa à **00:00** do dia inicial (antes: "agora menos N dias" com a hora, e uma OS só com o dia entrava ou não conforme a hora em que se abria a tela). Tabelas com data com hora real (despesas, clientes) usam fim exclusivo (`.lt(fimExclusivoISO)`).
- `src/lib/periodoPainel.ts`: períodos do Painel (`calcularPeriodo`, `PERIODOS`, `PERIODO_PADRAO = 'mes_atual'`, `descreverPeriodo`) e reexporta as funções acima. Os testes de Node precisam de uma cópia com `./diaDaOS.ts` no import e `package.json` com `"type":"module"` (o Vite do app não exige a extensão).

**3. O que mudou por tela**
- **Painel (`Dashboard.tsx`):** seletor com Este mês (PADRÃO), Mês passado, 7/15/30/90 dias; datas do período ao lado do seletor (computador); busca com folga e filtro pelo dia da OS; gráfico de 6 meses e CSV pela mesma regra; "Crescimento da Base" busca os 6 meses (antes só o período, e ficaria quase vazio em "Este mês"); "novos clientes" contado só no período; fim do período = fim de hoje (antes a hora em que a página abriu, e OS criada depois não entrava na atualização em tempo real).
- **Relatórios (`Reports.tsx`):** os 8 períodos e o período anterior (comparativos ▲▼) pelo dia da OS; despesas com fim exclusivo; datas das tabelas e da reativação.
- **Extrato e Fechamento (`financialService.getTechnicianBalance`, `TechnicianFinancialPrint.tsx`, `FinancialClosing.tsx`):** OS e adiantamentos (`financeiro_fluxo.data_lancamento`, que pode ficar à meia-noite UTC) pelo dia; despesas com fim exclusivo; datas das OS exibidas pela regra.
- **Impressos para o cliente (`ServiceOrderPrint.tsx`):** recibo, orçamento e contrato usam `formatarDiaDaOS` (o contrato ainda mostrava o dia anterior; o recibo usava o dia em UTC, errado perto da meia-noite).
- **Financeiro, Não Feitos, PDF do Painel (`Financial.tsx`, `UnfinishedServices.tsx`, `reportGenerator.ts`):** datas exibidas pela regra. O Financeiro (master) não filtra por mês; só mostra os 5 mais recentes na tela.

**4. Conferido (Chrome do Pedro, contra cálculo independente no banco)**
- Painel: Este mês R$ 1.540,00 (2 OS), Mês passado R$ 10.800,08 (19), 7d R$ 6.150,18, 15d R$ 7.290,08, 30d R$ 10.750,08, 90d R$ 81.058,08; a pagar = 50%. Relatórios: os 8 períodos batem (inclui ano R$ 208.241,58 / 251 OS e tudo R$ 1.205.635,20 / 1.367 OS) e **concordam com o Painel**. Extrato Pedro e Graça: outubro R$ 770,00 (datas 01/10), setembro R$ 3.255,04 (13 OS) sem a Mariana e a Paula. Recibo e contrato da OS de 01/10 mostram 01/10/2026.
- Testes de Node (funções puras): datas sem hora em vários formatos, bordas de meia-noite, virada de mês/ano, fevereiro bissexto, dia 1º, horário UTC enviado ao banco, varredura de 15 em 15 min de setembro e outubro (**0 buracos e 0 dobras entre meses**).
- `tsc`: **128 erros** (a base de 136 já existia; o master está em 129), nenhum novo. Lint: 0 erros nos arquivos novos; os erros restantes já existiam.
- Painel "Últimos 30 dias" passou de R$ 9.390,08 para R$ 10.750,08 por causa do início à 00:00 (inclui o dia 02/09 inteiro): esperado; as datas aparecem ao lado do seletor.

**5. Segurança das dependências (ramo `seguranca-dependencias`, commit `6ecbd9fc`)**
- `npm audit --omit=dev`: 6 falhas (1 crítica, 3 altas, 2 moderadas) → **0**. Atualização CIRÚRGICA: `npm update jspdf react-router react-router-dom dompurify fflate ws`; só `package-lock.json` (24 linhas): jspdf 4.0.0→4.2.1, react-router(-dom) 7.13.0→7.18.4, dompurify 3.3.1→3.4.16, fflate aninhado 0.8.2→0.8.3, ws 8.18.3→8.22.0. **Não usar `npm audit fix`** (mexe em 115 pacotes, inclusive as ferramentas do PWA/Workbox, com trocas de versão principal).
- Testado: 11 telas pelo menu, volta/avança, link direto, 3 PDFs com os mesmos bytes de antes, sync sem regravar nada, tsc igual, service worker com os mesmos 73 arquivos. As falhas só de ferramentas de desenvolvimento (ex.: brace-expansion) ficaram de propósito.

**6. Pendente (mesma armadilha do dia da OS, NÃO tratado)**
- `aiService.ts`: a IA responde "hoje"/"este mês" com `data_agendamento` e `data_lancamento` por instante (linhas ~506-553 e ~752).
- `financialService` (~linha 385): gráfico de comissões de 6 meses usa o `created_at` da comissão (e não o dia da OS).
- Agenda e Equipe: conferir se decidem mês/dia por instante (Agenda já tem tratamento próprio para "sem hora").
- Segurança que não é código (seção 4B), O3 (fila sem dono/empresa, exige Dexie v3) e as demais etapas do plano de 14 etapas continuam pendentes.

**7. Ambiente e cuidados**
- `chrome-devtools` conecta ao Chrome REAL do Pedro (ou à aba do navegador embutido). **Depois de usar `emulate` (viewport/celular), chamar `emulate` só com `pageId` para limpar**, e conferir `innerWidth === outerWidth`; senão a aba dele fica presa em tamanho errado (aconteceu em 02/10: barra de rolagem longe da borda).
- Servidores de teste: `novoapp-rapido` (porta 5175, `vite preview` de `dist-t3` do `NovoApp-rapido`) e `novoapp-seguranca` (mesma porta, do `NovoApp-seguranca`); só um por vez. Para ver build novo ali, limpar service worker e cache da origem 5175.
- `NovoApp-rapido` tem `node_modules` = atalho (*junction*) para o do `NovoApp`: **nunca** `git worktree remove` nem `Remove-Item -Recurse` nela sem antes remover o atalho. `NovoApp-seguranca` tem `node_modules` próprio.
- A ferramenta de rede do `chrome-devtools` (`get_network_request`) mostra o `Authorization` (token da sessão); não copiar nem repetir.

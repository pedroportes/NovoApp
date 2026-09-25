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


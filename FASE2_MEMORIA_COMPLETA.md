# FlowDrain Fase 2 - Sistema Multi-Empresa / Multi-Marca

## 1. Visão Geral do Módulo
Este módulo permite que donos de múltiplas marcas de desentupidora (estratégia comum para dominar buscas locais no Google em cidades grandes) gerenciem todas as suas frentes de atendimento em uma única conta do FlowDrain.

## 2. As 5 Empresas Reais de Pedro
- **Desentupidora Hidro Curitiba** (Matriz Principal - Cor: `#10b981`)
- **Desentupidora Curitibana** (Filial - Cor: `#3b82f6`)
- **Desentupidora São José** (Filial - Cor: `#06b6d4`)
- **Desentupidora Aqui Perto** (Filial - Cor: `#8b5cf6`)
- **Desentupidora Nossa Cidade** (Filial - Cor: `#f59e0b`)

## 3. Regra de Ouro da Assinatura
Se o usuário tiver apenas 1 empresa (plano inicial sem filiais ou `brands.length <= 1`), nenhum seletor é exibido no topo. A interface permanece 100% como era originalmente, garantindo simplicidade total para clientes padrão.

## 4. Banco de Dados (Supabase - Projeto: `dltqxfyrltgbudtzxzot`)
- **Tabela `public.empresas_marcas`**:
  - `id` (UUID PK)
  - `empresa_matriz_id` (UUID FK -> public.empresas)
  - `nome` (Text)
  - `cnpj` (Text)
  - `telefone` (Text)
  - `endereco` (Text)
  - `chave_pix` (Text)
  - `logo_url` (Text)
  - `cor_tema` (Text)
  - `ordem` (Integer)
- **Tabela `public.ordens_servico`**:
  - Coluna `marca_id` (UUID FK -> public.empresas_marcas).
- **Tabela `public.despesas_tecnicos`**:
  - Adiantamentos e despesas cadastrados com técnicos reais (André, Paulo, Marcos, Pedro e Graça).
- **Tabela `public.historico_comissoes`**:
  - Comissões a pagar vinculadas.

## 5. Arquivos no Repositório Ativo (`C:\Users\pedro\NovoApp`)
- `src/contexts/BrandContext.tsx`: Contexto global e Hook `useBrand()`.
- `src/components/BrandSwitcher.tsx`: Componente de troca de marcas no topo superior direito.
- `src/components/dashboard/DashboardStats.tsx`: Cards de KPI com suporte a breakdown visual de faturamento.
- `src/pages/Dashboard.tsx`: Dashboard reativo filtrando métricas e atividades recentes por marca.

## 6. Próximos Passos
1. Adicionar campo seletor da desentupidora na abertura de OS (`NewServiceOrder.tsx`).
2. Impressão de recibo dinâmico com logo, CNPJ e PIX da marca (`PrintServiceOrder.tsx`).
3. Tela de configurações para editar dados das filiais (`Settings.tsx`).

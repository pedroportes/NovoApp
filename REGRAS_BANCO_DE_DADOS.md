# REGRAS_BANCO_DE_DADOS.md

## Instrução Permanente
Antes de realizar qualquer INSERT, SELECT ou alteração de tabela (ALTER TABLE), você deve ler este arquivo para garantir que não está criando tabelas duplicadas ou quebrando a integridade do sistema Multi-tenant.

## 🔒 Regras de Integridade (IMUTÁVEIS)

### 1. A Regra do "Pai Único"
*   **Proibido**: Criar qualquer tabela operacional (clientes, ordens, despesas, comissões) sem a coluna `empresa_id`.
*   **Obrigatório**: Toda `empresa_id` deve ter a cláusula `ON DELETE CASCADE`. Se a empresa for deletada, os dados vinculados devem sumir para não gerar "lixo" no banco.

### 2. Unificação de Idioma (Fim da Ambiguidade)
*   **Tabela de Empresas**: O nome oficial e único é `empresas` (plural).
*   **Tabela de Técnicos**: O nome oficial e único é `tecnicos`.
*   **Ação Proibida**: É terminantemente proibido o uso de `company`, `companies` ou `technicians` em novas queries. O Antigravity deve migrar a lógica para o português sempre que tocar em um arquivo.

### 3. Prevenção do Erro PGRST201 (Ambiguidade)
*   **Regra**: Toda Foreign Key deve ser nomeada explicitamente seguindo o padrão `fk_origem_destino`.
*   **Exemplo**: `CONSTRAINT fk_despesa_tecnico FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id)`.

## ❌ Ações TERMINANTEMENTE PROIBIDAS

*   **Queries "Cegas"**:
    *   ❌ `SELECT * FROM despesas_tecnicos;` (Sem filtro de empresa).
    *   ✅ `SELECT * FROM despesas_tecnicos WHERE empresa_id = 'uuid';`
*   **Criação de Tabelas Órfãs**:
    *   ❌ Criar tabelas sem relacionamento com `empresas` ou `usuarios`.
*   **Ignorar o Schema de Documentos**:
    *   ❌ Salvar PDFs de contratos ou recibos em colunas de texto simples sem validar o vínculo com a Ordem de Serviço.

## ✅ Fluxo de Trabalho Obrigatório para o Antigravity
Sempre que o Antigravity for criar ou alterar algo, ele deve seguir este checklist mental:
1.  **Identificar a Empresa**: "Eu tenho o `empresa_id` deste contexto?".
2.  **Validar o Técnico**: "Este `tecnico_id` realmente pertence a esta `empresa_id`?".
3.  **Gerar Documento**: "O PDF gerado está sendo salvo na tabela `documentos_os` com o vínculo correto?".

## 📋 Estrutura de Referência (Nomes Oficiais)

| Tabela Oficial | Relacionamento Principal | Função |
| :--- | :--- | :--- |
| **empresas** | Raiz de todo o SaaS. | - |
| **usuarios** | `empresa_id` | Login e permissões (ADM/Técnico). |
| **tecnicos** | `usuario_id` + `empresa_id` | Dados financeiros e comissões. |
| **clientes** | `empresa_id` | Base de clientes da desentupidora. |
| **ordens_servico** | `cliente_id` + `tecnico_id` | Onde o cálculo de 27L e o valor total ocorrem. |
| **despesas_tecnicos** | `tecnico_id` + `empresa_id` | Combustível e alimentação com foto do recibo. |

## ⚠️ Campos Legados e Redundantes (NÃO UTILIZAR)
Para evitar confusão e erros de dados, **nunca** utilize as colunas abaixo em novos seletores ou inserts. Elas estão mantidas apenas por compatibilidade temporária:

### 1. Tabela `clientes`
*   **Nome**: Use `nome_razao` (Oficial). **Evite**: `nome`.
*   **Contato**: Use `whatsapp` (Oficial). **Evite**: `telefone`.
*   **Documento**: Use `cpf_cnpj` (Oficial). **Evite**: `documento`.
*   **Endereço**: Use `logradouro`, `numero`, `bairro`, `cidade`, `uf`. **Evite**: `address` e `endereco`.
*   **Referência**: Use `referencia` (Oficial). **Evite**: `reference`.
*   **Fotos**: Use `avatar_url` (Oficial). **Evite**: `photo_url`, `photo`.

### 2. Tabela `usuarios`
*   **Avatar**: Use `avatar` (Oficial - local onde as fotos estão). **Evite**: `avatar_url`.
*   **Assinatura**: Use `signature_url` (Oficial). **Evite**: `assinatura_url`.
*   **Veículo**: Use `placa_carro` (Oficial). **Evite**: `placa`.

### 3. Tabela `servicos`
*   **Preço**: Use `valor_padrao` (Oficial). **Evite**: `preco_padrao`.

### 4. Tabelas Mortas/Vazias (IGNORAR)
*   `documentos_conhecimento` (Vazia).
*   `empresa_settings` (Existe no código mas não no banco).

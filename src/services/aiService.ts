import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

// WARNING: In a production app, these calls should be proxied through a backend
// to protect the API KEY. For this MVP/Admin tool, using VITE_ env is acceptable but risky.
// const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""; // Moved to inside function

// const genAI = new GoogleGenerativeAI(API_KEY); // Removed top-level init

// Define tool definitions for the model
const toolsDefinition = [
    {
        function_declarations: [
            {
                name: "search_clients",
                description: "Busca clientes da empresa. Pode pesquisar por nome (ex: 'Maria'), telefone (ex: 'final 9999') ou endereço (ex: 'Rua das Flores').",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "Termo de busca. Pode ser nome, telefone ou parte do endereço." }
                    },
                }
            },
            {
                name: "get_financial_report",
                description: "Gera um relatório financeiro DETALHADO (Receitas, Despesas, Lucro) para um período.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        period: { type: "STRING", description: "Período: 'current_month', 'last_month', 'last_week', 'last_7_days', 'last_3_months', 'year_to_date'." }
                    },
                    required: ["period"]
                }
            },
            {
                name: "get_financial_summary",
                description: "Resumo financeiro rápido do mês atual (Saldo, Entradas e Saídas). Use para perguntas como 'Como está o financeiro?' ou 'Resumo do mês'.",
                parameters: {
                    type: "OBJECT",
                    properties: {}
                }
            },
            {
                name: "get_recent_services",
                description: "Lista os últimos serviços realizados ou agendados pela empresa (GLOBAL). Use para 'Quais os últimos serviços?', 'O que foi feito hoje?', 'Últimos chamados'.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        limit: { type: "NUMBER", description: "Quantidade de serviços a listar (padrão 5)." }
                    }
                }
            },
            {
                name: "get_expenses",
                description: "Lista as últimas despesas/gastos lançados na empresa.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        category: { type: "STRING", description: "Filtrar por categoria (opcional)." }
                    }
                }
            },
            {
                name: "get_service_history",
                description: "Busca o histórico de serviços de um CLIENTE ESPECÍFICO.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        clientName: { type: "STRING", description: "Nome do cliente." }
                    },
                    required: ["clientName"]
                }
            },
            {
                name: "create_client",
                description: "Cadastra um novo cliente. Requer Nome, Telefone e Endereço.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "Nome completo." },
                        phone: { type: "STRING", description: "Telefone/WhatsApp." },
                        street: { type: "STRING", description: "Rua/Logradouro." },
                        number: { type: "STRING", description: "Número." }
                    },
                    required: ["name", "phone", "street", "number"]
                }
            },
            {
                name: "create_schedule",
                description: "Agenda uma visita técnica. Busca cliente pelo nome.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        clientName: { type: "STRING", description: "Nome do cliente." },
                        description: { type: "STRING", description: "Descrição do serviço." },
                        dateTime: { type: "STRING", description: "Data ISO 8601 (2024-01-01T14:30:00)." }
                    },
                    required: ["clientName", "description", "dateTime"]
                }
            },
            {
                name: "create_expense",
                description: "Lança uma nova despesa no sistema.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        description: { type: "STRING", description: "Descrição." },
                        amount: { type: "NUMBER", description: "Valor (R$)." },
                        category: { type: "STRING", description: "Categoria." },
                        licensePlate: { type: "STRING", description: "Placa (opcional)." }
                    },
                    required: ["description", "amount", "category"]
                }
            },
            {
                name: "get_daily_briefing",
                description: "Resumo da agenda de HOJE.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                }
            }
        ]
    }
];

// const model = genAI.getGenerativeModel({ // Removed top-level init
//     model: "gemini-pro",
//     tools: toolsDefinition as any // Type casting due to SDK version differences sometimes
// });

export const aiService = {
    async sendMessage(userMessage: string, previousHistory: any[], context: { empresaId: string, userName: string, role: string }) {
        let API_KEY = "";

        // 1. Prioridade Máxima: Chave atualizada gravada no banco de dados (Supabase)
        if (context.empresaId) {
            try {
                const { data: rpcKey } = await supabase.rpc('get_gemini_api_key', { p_empresa_id: context.empresaId });
                if (rpcKey) {
                    API_KEY = rpcKey;
                }
            } catch (e) {
                // fallback
            }

            if (!API_KEY) {
                try {
                    const { data } = await supabase.from('empresas').select('configs').eq('id', context.empresaId).single();
                    if (data?.configs && (data.configs as any).gemini_api_key) {
                        API_KEY = (data.configs as any).gemini_api_key;
                    }
                } catch (e) {
                    // ignore
                }
            }
        }

        // 2. Fallback caso não esteja no banco
        if (!API_KEY) {
            API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
        }

        if (!API_KEY) {
            console.warn("Gemini API Key missing.");
            return "Erro: Chave de API do Gemini não configurada (VITE_GEMINI_API_KEY).";
        }

        // 1. System Prompt injection
        const systemInstruction = `
Você é o Consultor Especialista do FlowDrain, um sistema de gestão para desentupidoras.
Seu usuário atual é ${context.userName} (Empresa ID: ${context.empresaId}).
Data de Hoje: ${new Date().toLocaleDateString('pt-BR')} (Dia da semana: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}).

Sua missão é ajudar com:
1. Consultas rápidas sobre clientes e dados operacionais.
2. Suporte e dúvidas completas sobre o FlowDrain (como cadastrar clientes, abrir OS, emitir NFS-e, configurar filiais e relatórios).
3. Análise financeira básica e comissões de técnicos.

Base de Conhecimento Oficial do FlowDrain:

# MANUAL OPERACIONAL COMPLETO DO FLOWDRAIN (GUIA DO CONSULTOR)

Você é o instrutor e consultor operacional do FlowDrain. Sempre que o usuário tiver dúvidas de como usar qualquer tela, recurso ou regra de negócio, explique com passos claros e objetivos:

---

## 1. GESTÃO MULTI-EMPRESA E FILIAIS (Matriz e Filiais)
- **Onde fica**: No cabeçalho (topo da tela), existe o **Seletor de Marcas/Filiais** (BrandSwitcher).
- **Como funciona**:
  - Permite alternar entre a **Visão Geral ('Todas as Marcas')** ou filtrar por uma filial específica (ex: Hidro Curitiba, São José, Curitibana, Batel, etc.).
  - Ao selecionar uma filial, todo o painel (Dashboard, Relatórios, Clientes e OSs) filtra instantaneamente para aquela empresa.
  - Cada filial possui seu próprio CNPJ, telefone, endereço, cor temática e chave PIX cadastrados.
- **Configurações (/settings)** é um menu com 5 itens; cada um abre sua própria página, com seta de voltar:
  - **Empresa e marca** (/settings/empresa): logotipo, assinatura digital, nome, razão social, CNPJ, telefone, e-mail, site, chave PIX, cor e endereço. Ao trocar a filial no topo ou pelos botões rápidos, o formulário carrega aquela filial; 'Salvar Alterações' atualiza só ela.
  - **Nota fiscal** (/settings/nota-fiscal): escolha do emissor de NFS-e (Focus NFe ou Fiscal Contora), token e ambiente. Veja a seção 6.
  - **Técnicos** (/settings/tecnicos): permissões dos técnicos no aplicativo (ver todos os clientes, cadastrar, importar, editar, excluir).
  - **Minha conta** (/settings/conta): e-mail de acesso e troca de senha.
  - **Aparência e app** (/settings/aparencia): tema claro/escuro e instalar o app no celular.

---

## 2. CADASTRO DE CLIENTES INTELIGENTE (/clients)
- **Formas de Cadastrar um Cliente**:
  1. **Manual com Automações**:
     - **Busca por CEP**: Ao digitar os 8 dígitos do CEP, a rua, bairro, cidade e estado são preenchidos automaticamente via BrasilAPI/ViaCEP.
     - **Busca por CNPJ**: Para clientes pessoa jurídica, digite o CNPJ e clique em 'Buscar'. O sistema preenche Razão Social, endereço completo e telefone direto da Receita Federal.
  2. **Cadastro Inteligente com IA (Via WhatsApp ou Foto)**:
     - **Foto/Print de Conversa**: Clique no botão de câmera/foto e envie uma foto de ficha de papel ou um print da conversa do WhatsApp. A IA lê a imagem e preenche todos os campos.
     - **Colar Print (Ctrl+V)**: Basta abrir a janela de Novo Cliente e apertar Ctrl+V com o print na área de transferência.
     - **Colar Mensagem de Texto**: Cole a mensagem de agendamento que o cliente mandou no WhatsApp (ex: 'Oi, sou a Maria, rua tal, nº tal'). A IA extrai nome, telefone, endereço e CEP automaticamente.
- **Vínculo com a Filial**: Ao cadastrar o cliente, o usuário define qual filial/marca atendeu o cliente.

---

## 3. ORDENS DE SERVIÇO E ATENDIMENTOS (/service-orders)
- **Abertura de Nova OS**:
  - Clique no botão verde '+ Nova OS' no topo ou na página.
  - Selecione qual filial está prestando o serviço através dos botões pills no topo.
  - Escolha o cliente, o técnico parceiro responsável e descreva os serviços (com metragem, valor unitário ou valor fechado).
- **Status da OS**:
  - orcamento: Quando é apenas visita para orçamento (não gera comissão).
  - nao_feito_cancelado: Serviço recusado ou cancelado (não gera comissão nem fatura).
  - CONCLUIDO: Serviço executado e recebido (dispara o cálculo de 50% de comissão para o técnico).
- **Recibo e Impressão Formal (/print/os/:id)**:
  - O recibo é gerado dinamicamente com o **Logotipo, CNPJ, Telefone, Endereço e Chave PIX** específicos da filial que atendeu.

---

## 4. COMISSÕES DE TÉCNICOS E ADIANTAMENTOS (/financial-closing)
- **Regra de Comissão**:
  - A comissão padrão dos técnicos parceiros é de **50% sobre o valor da OS concluída**.
  - O sistema calcula a comissão com base na **Data da Execução da OS** (e não na data de cadastro).
- **Adiantamentos (Vales) e Reembolsos de Despesas**:
  - Em Despesas / Fechamento, é possível lançar 'Adiantamento' para um técnico específico (que será abatido do saldo dele).
  - Se o técnico comprou conexões, canos ou combustível do próprio bolso com autorização, lança-se 'Despesa Reembolsável', que soma no acerto dele.
- **Extrato Oficial em PDF para Pagamento (/print/comissoes/:techId)**:
  - Na tela de Fechamento ou Central de Relatórios, clique em 'Extrato'.
  - Filtre por período: **1ª Quinzena (01 a 15)**, **2ª Quinzena (16 ao fim)**, **Mês** ou **Data Personalizada**.
  - O extrato lista todas as OSs com data, cliente, serviço, faturamento bruto, 50% de comissão, desconta os adiantamentos, soma os reembolsos e mostra o **Valor Líquido Total a Pagar**.
  - Possui botão verde para **'Baixar PDF no PC'** já formatado para formalização e assinatura do técnico com a chave PIX dele.

---

## 5. CENTRAL DE RELATÓRIOS E DRE (/reports)
- **Abas Estratégicas do Relatório**:
  1. **DRE & Lucro Líquido Real**: Receita Bruta, Comissões pagas à equipe, Custos operacionais rateados por filial e Lucro Líquido real da empresa.
  2. **Fiscal & Contábil (NFS-e)**: Total faturado, notas emitidas, impostos (ISS) e conferência contábil.
  3. **Comissões da Equipe**: Ranking de técnicos mais produtivos, total de atendimentos e comissões do período.
  4. **Não Feitos & Motivos de Perda**: Taxa de conversão e motivos pelos quais clientes não fecharam (preço, já realizado, desistência).
  5. **Bairros e Regiões Mais Rentáveis**: Mapeamento dos bairros que trazem maior faturamento para direcionar anúncios de Google e panfletagem.
- **Filtros Rápidos de Período**: 1ª Quinzena, 2ª Quinzena, Este Mês, Mês Anterior, 30 Dias, 90 Dias, Ano Atual, Todo o Histórico ou Personalizado.
- **Exportação**: Botão 'Baixar PDF no PC' para prestação de contas com sócios e contabilidade.

---

## 6. NOTA FISCAL DE SERVIÇO (NFS-e) — COMO CONFIGURAR E EMITIR
Você é o guia do assinante nesta configuração. Conduza UM PASSO POR VEZ, pergunte em que ponto a pessoa está e só avance quando ela confirmar. Use linguagem simples; a maioria dos assinantes não é da área fiscal.

### 6.1 Visão geral
- O FlowDrain emite NFS-e por um **emissor fiscal** (empresa parceira que conversa com a prefeitura/Sistema Nacional). Há dois: **Fiscal Contora** (recomendado para novos assinantes) e **Focus NFe**. Só um fica ativo por vez.
- Onde escolher: **Configurações → Nota fiscal** → botões "Focus NFe" / "Fiscal Contora".
- Na **Contora**, quase tudo é cadastrado no painel dela (empresa, certificado, inscrição municipal, códigos do serviço). No FlowDrain o assinante só coloca: **token**, **ambiente** e **% total de tributos do Simples**.
- Antes de começar, a pessoa precisa ter: **certificado digital A1 da empresa (arquivo .pfx ou .p12) e a senha dele**, a **inscrição municipal** e os dados fiscais do serviço **confirmados com o contador**.

### 6.2 Passo a passo na Fiscal Contora (painel: https://fiscal.contora.com.br)
1. **Criar a conta** em fiscal.contora.com.br e confirmar o e-mail (chega um código de verificação).
2. **Cadastrar a empresa** (menu Empresas → "+ Cadastrar Nova Empresa"): razão social, nome fantasia, CNPJ, regime tributário, endereço completo com CEP e **código IBGE do município** e telefone. Em **Ambiente padrão**, escolha **Produção**.
   - Regime: escolha o que consta na Receita. Se a empresa é do **Simples Nacional (ME/EPP)**, marque **Simples Nacional**. Declarar regime diferente do cadastro da Receita causa rejeição E0160.
3. **Enviar o certificado A1**: na página da empresa, aba "Visão Geral & Certificado" → escolher o arquivo .pfx → digitar a senha → "Fazer Upload e Validar". Deve aparecer "Certificado Ativo" com a validade.
4. **Configurações de NFS-e** (aba "Configurações & Dados Cadastrais", seção 5):
   - **Inscrição municipal**: a da empresa na prefeitura.
   - **Código de serviço padrão**: código de tributação nacional com 6 dígitos. Para desentupimento e limpeza de esgotos normalmente é **071001** (item 7.10.01) — confirmar com o contador.
   - **cTribMun padrão**: deixar **em branco** (só alguns municípios, como o Rio de Janeiro, exigem).
   - **CNAE padrão**: 7 dígitos, ex. **8129000** (limpeza não especificada anteriormente) — confirmar com o contador.
   - **Alíquota padrão de ISS (%)**: a do município (muitas vezes 2%) — confirmar com o contador.
   - **NBS padrão**: 9 dígitos, ex. **124021000** — confirmar com o contador.
   - **Padrão de emissão**: deixar "Automático".
   - Caixa **"Município registra informações complementares no CNC NFS-e"**: se a emissão voltar com erro **E0120**, desmarcar e salvar.
   - Clicar em **Salvar Alterações**.
5. **Conferir a saúde da NFS-e**: na aba "Visão Geral", o bloco "Saúde NFS-e" deve mostrar tudo OK. O aviso sobre "percentuais aproximados" que aparece para quem NÃO é do Simples é atendido automaticamente pelo FlowDrain.
6. **Criar a chave de API**: menu **Chaves de API** → criar uma chave de **Produção** (o ambiente da chave precisa ser igual ao da empresa). Copiar o token, que começa com **fct_**. Guarde com cuidado: quem tem o token consegue emitir notas em nome da empresa.
7. Itens que **NÃO se aplicam** a desentupidora e podem ser ignorados: **CSRT (Paraná)**, **CSC ID / CSC Token** e o cadastro de **Responsável técnico / Software House** — são de nota de mercadoria (NF-e/NFC-e), não de NFS-e.

### 6.3 Passo a passo no FlowDrain
1. **Configurações → Nota fiscal** → clicar em **Fiscal Contora**.
2. Colar o token no campo **Token da API** e clicar em **Salvar token**. O FlowDrain confere o token na Contora; ele fica guardado no servidor e não aparece mais na tela (para trocar, botão "Trocar").
3. **Ambiente**: **Produção (valendo)**. Em "Homologação", muitos municípios (ex. Mandirituba/PR) não têm convênio de testes e a nota volta com E0037.
4. **% total de tributos do Simples (DAS)**: para empresa do **Simples ME/EPP**, informar a alíquota efetiva do Simples do mês (o contador informa; ex. 2,00). Sem esse número a nota é rejeitada (E999/E0712). Quem não é do Simples deixa em branco.
5. Clicar em **Testar conexão**: deve aparecer "✅ Pronto para emitir" com a razão social, o CNPJ e a validade do certificado. Se a conta tiver mais de um CNPJ, escolher em "Empresa que emite". Se aparecer "Falta ajustar no painel da Contora", ler a lista e corrigir no painel.
6. Clicar em **Salvar**.

### 6.4 Emissão, PDF e cancelamento
- A nota é emitida no card da OS concluída (botão de emitir NFS-e). A faixa da nota mostra: 🟢 emitida, 🟡 em processamento, 🔴 erro, ⚪ cancelada, com botões de PDF e Cancelar.
- Cancelamento exige justificativa de **15 a 255 caracteres** (ex. "Serviço não prestado, nota emitida por engano").
- A numeração das notas emitidas pelo Sistema Nacional (Contora) é própria e pode começar no nº 1, separada de notas antigas emitidas por outro sistema.

### 6.5 Erros mais comuns e o que fazer
- **E0037** (município inexistente no convênio): está em Homologação num município sem ambiente de testes → usar **Produção**.
- **E0120** (IM não deve ser informada): desmarcar "Município registra informações complementares no CNC NFS-e" no painel da Contora.
- **E0160** (situação no Simples não confere): o regime cadastrado na Contora está diferente do cadastro da Receita → corrigir o regime (ex. Simples Nacional).
- **E999 / E0712** para empresa do Simples: falta o **% total de tributos do Simples** no FlowDrain.
- **E0713** (não optante): faltam os percentuais aproximados de tributos → falar com o suporte do FlowDrain.
- **Token recusado**: token copiado incompleto, apagado, ou chave de ambiente diferente do da empresa.
- **"Chave de acesso: sem chave vinculada"** no painel da Contora não é erro: a chave só existe depois que a nota é autorizada.
- Nunca invente códigos fiscais, alíquotas ou regime: oriente a confirmar com o contador.

### 6.6 Focus NFe (alternativa)
- Em Configurações → Nota fiscal → "Focus NFe": token da Focus, ambiente, inscrição municipal, código IBGE do município e regime tributário. A empresa e o certificado A1 ficam cadastrados no painel da Focus.

Regras de Segurança:
- NUNCA invente dados. Se precisar de dados do banco, use as FERRAMENTAS disponíveis (search_clients, get_financial_report).
- Se a ferramenta retornar dados, analise-os e responda em linguagem natural.
- Seja profissional, direto e prestativo.
    `;

        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-3.5-flash-lite",
                tools: toolsDefinition as any
            });

            // Convert frontend history to Gemini history
            const formattedHistory = previousHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            // Prepend System Instruction as the very first user message (or system instruction if supported, but user message is safer for all models)
            const chatHistory = [
                {
                    role: "user",
                    parts: [{ text: systemInstruction }]
                },
                {
                    role: "model",
                    parts: [{ text: "Entendido. Sou o Consultor FlowDrain, pronto para ajudar com dados reais da sua empresa." }]
                },
                ...formattedHistory
            ];

            const chat = model.startChat({
                history: chatHistory
            });

            const result = await chat.sendMessage(userMessage);
            const response = await result.response;

            // Check for Function Calls
            const functionCalls = response.functionCalls();

            if (functionCalls && functionCalls.length > 0) {
                // Handle Function Calling Loop
                const call = functionCalls[0];
                const functionName = call.name;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const args = call.args as any;

                let functionResult = null;



                if (functionName === 'search_clients') {
                    functionResult = await this.searchClients(context.empresaId, args.query);
                } else if (functionName === 'get_financial_report') {
                    if (context.role !== 'admin') {
                        functionResult = { message: "⛔ Acesso Negado: Apenas administradores." };
                    } else {
                        functionResult = await this.getFinancialReport(context.empresaId, args.period);
                    }
                } else if (functionName === 'get_financial_summary') {
                     if (context.role !== 'admin') {
                        functionResult = { message: "⛔ Acesso Negado: Apenas administradores." };
                    } else {
                        functionResult = await this.getFinancialSummary(context.empresaId);
                    }
                } else if (functionName === 'get_recent_services') {
                    functionResult = await this.getRecentServices(context.empresaId, args.limit);
                } else if (functionName === 'get_expenses') {
                    if (context.role !== 'admin') {
                        functionResult = { message: "⛔ Acesso Negado: Apenas administradores." };
                    } else {
                        functionResult = await this.getExpenses(context.empresaId, args.category);
                    }
                } else if (functionName === 'get_service_history') {
                    functionResult = await this.getServiceHistory(context.empresaId, args.clientName);
                } else if (functionName === 'create_client') {
                    functionResult = await this.createClient(context.empresaId, args);
                } else if (functionName === 'create_schedule') {
                    functionResult = await this.createSchedule(context.empresaId, args);
                } else if (functionName === 'create_expense') {
                    functionResult = await this.createExpense(context.empresaId, args, context.userName);
                } else if (functionName === 'get_daily_briefing') {
                    functionResult = await this.getDailyBriefing(context.empresaId);
                }

                // Send function result back to model as formatted result
                try {
                    const result2 = await chat.sendMessage([
                        {
                            functionResponse: {
                                name: functionName,
                                response: { result: functionResult }
                            }
                        } as any
                    ]);
                    return result2.response.text();
                } catch (fnErr: any) {
                    // Fallback para modelos que não aceitam role function: envia o resultado como contexto do usuário
                    const result2 = await chat.sendMessage(`[Dados do sistema para ${functionName}]: ${JSON.stringify(functionResult)}`);
                    return result2.response.text();
                }
            }

            return response.text();

        } catch (error: any) {
            console.error("Erro no Gemini:", error);
            if (error.message?.includes('429') || error.toString().includes('Resource exhausted')) {
                return "⚠️ A IA está com alta demanda no momento (Limite de cota atingido). Por favor, aguarde 1 minuto e tente novamente.";
            }
            return `Erro técnico: ${error.message || error.toString()}. (Verifique o console para mais detalhes)`;
        }
    },

    // --- INTERNAL TOOLS WITH STRICT RLS ---

    async searchClients(empresaId: string, query?: string) {
        let dbQuery = supabase
            .from('clientes')
            .select('id, nome_razao, whatsapp, logradouro, bairro, cidade, numero')
            .eq('empresa_id', empresaId)
            .limit(10); // Limit to avoid token overflow

        if (query) {
            // Search across Name, WhatsApp, Street, Neighborhood
            // Using ilike with OR syntax
            dbQuery = dbQuery.or(`nome_razao.ilike.%${query}%,whatsapp.ilike.%${query}%,logradouro.ilike.%${query}%,bairro.ilike.%${query}%`);
        } else {
            dbQuery = dbQuery.order('created_at', { ascending: false });
        }

        const { data, error } = await dbQuery;
        
        if (error) {
            console.error("Erro busca clientes:", error);
            return [];
        }

        return data?.map(c => ({
            nome: c.nome_razao,
            telefone: c.whatsapp,
            endereco: `${c.logradouro}, ${c.numero} - ${c.bairro}`,
            cidade: c.cidade
        })) || [];
    },

    async getRecentServices(empresaId: string, limit: number = 5) {
        const { data: services } = await supabase
            .from('ordens_servico')
            .select('id, data_agendamento, status, valor_total, descricao_servico, cliente_nome, tecnico:tecnico_id(nome_completo)')
            .eq('empresa_id', empresaId)
            .order('data_agendamento', { ascending: false })
            .limit(limit);

        if (!services || services.length === 0) return { message: "Nenhum serviço encontrado recentemente." };

        return services.map((s: any) => ({
            data: new Date(s.data_agendamento).toLocaleDateString('pt-BR') + ' ' + new Date(s.data_agendamento).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
            cliente: s.cliente_nome,
            servico: s.descricao_servico,
            tecnico: s.tecnico?.nome_completo || 'N/A',
            status: s.status,
            valor: s.valor_total
        }));
    },

    async getExpenses(empresaId: string, category?: string) {
        let query = supabase
            .from('despesas_tecnicos')
            .select('descricao, valor, categoria, data_gasto, tecnico:tecnico_id(nome_completo)')
            .eq('empresa_id', empresaId)
            .order('data_gasto', { ascending: false })
            .limit(10);

        if (category) {
            query = query.ilike('categoria', `%${category}%`);
        }

        const { data } = await query;
        if (!data || data.length === 0) return { message: "Nenhuma despesa encontrada." };

        return data.map((d: any) => ({
            data: new Date(d.data_gasto).toLocaleDateString('pt-BR'),
            descricao: d.descricao,
            valor: d.valor,
            categoria: d.categoria,
            responsavel: d.tecnico?.nome_completo || 'Empresa'
        }));
    },

    async getFinancialSummary(empresaId: string) {
        // Reusing the same RPC or logic as the Dashboard
        // For simplicity/robustness, we'll calculate from flow (financeiro_fluxo) for current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        
        const { data } = await supabase
             .from('financeiro_fluxo')
             .select('tipo, valor')
             .eq('empresa_id', empresaId)
             .gte('data_lancamento', startOfMonth.toISOString());
             
        if (!data) return { message: "Sem dados financeiros deste mês." };

        const entradas = data.filter((d: any) => d.tipo === 'RECEITA' || d.tipo === 'ENTRADA').reduce((acc, curr) => acc + Number(curr.valor), 0);
        const saidas = data.filter((d: any) => d.tipo === 'DESPESA' || d.tipo === 'SAIDA').reduce((acc, curr) => acc + Number(curr.valor), 0);

        return {
            periodo: "Mês Atual",
            receitas: entradas,
            despesas: saidas,
            saldo: entradas - saidas
        };
    },

    async getFinancialReport(empresaId: string, period: string) {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        if (period === 'last_month') {
            startDate.setMonth(now.getMonth() - 1);
            startDate.setDate(1);
            endDate.setDate(0); // Last day of prev month
        } else if (period === 'last_week') {
            // Last completed week (Sunday to Saturday or Mon-Sun depending on locale, keeping simple: last 7 days from last Sunday)
            // Actually, "last week" usually means previous full week.
            const day = now.getDay();
            const diff = now.getDate() - day + (day == 0 ? -6 : 1) - 7; // adjust when day is sunday
            startDate.setDate(diff);
            endDate.setDate(diff + 6);
            // Re-align to start of day / end of day
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'last_7_days') {
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'last_3_months') {
            startDate.setMonth(now.getMonth() - 3);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        } else {
            // Current Month (default)
            startDate.setDate(1);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data }: { data: any[] | null, error: any } = await supabase
            .from('financeiro_fluxo')
            .select('tipo, valor, data_lancamento')
            .eq('empresa_id', empresaId)
            .gte('data_lancamento', startDate.toISOString())
            .lte('data_lancamento', endDate.toISOString());

        if (!data || data.length === 0) return { message: `Sem dados financeiros encontrados para o período (${period}).` };

        // Calculate totals
        const receitas = data.filter((d: any) => d.tipo === 'RECEITA' || d.tipo === 'ENTRADA').reduce((acc: number, curr: any) => acc + Number(curr.valor), 0);
        const despesas = data.filter((d: any) => d.tipo === 'DESPESA' || d.tipo === 'SAIDA').reduce((acc: number, curr: any) => acc + Number(curr.valor), 0);

        return {
            periodo: period,
            receitas,
            despesas,
            lucro: receitas - despesas,
            detalhes: "Valores em BRL"
        };
    },

    async getServiceHistory(empresaId: string, clientName: string) {
        // 1. First find the client ID
        const { data: clients } = await supabase
            .from('clientes')
            .select('id, nome_razao')
            .eq('empresa_id', empresaId)
            .ilike('nome_razao', `%${clientName}%`)
            .limit(1);

        if (!clients || clients.length === 0) {
            return { message: "Cliente não encontrado." };
        }

        const clientId = clients[0].id;
        const clientNameFound = clients[0].nome_razao;

        // 2. Fetch services for this client
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: services } = await supabase
            .from('ordens_servico')
            .select('id, data_agendamento, status, valor_total, descricao_servico, tecnico_id')
            .eq('empresa_id', empresaId) // Security Check
            .eq('cliente_id', clientId)
            .order('data_agendamento', { ascending: false })
            .limit(5);

        if (!services || services.length === 0) {
            return { message: `Cliente ${clientNameFound} encontrado, mas sem histórico de serviços.` };
        }

        return {
            cliente: clientNameFound,
            servicos_recentes: services.map((s: any) => ({
                data: s.data_agendamento,
                servico: s.descricao_servico || "Serviço Geral",
                valor: s.valor_total,
                status: s.status
            }))
        };
    },

    async createClient(empresaId: string, args: { name: string, phone: string, street: string, number: string }) {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .insert({
                    empresa_id: empresaId,
                    nome_razao: args.name,
                    whatsapp: args.phone,
                    logradouro: args.street,
                    numero: args.number,
                    cidade: 'Curitiba', // Defaulting for now, could be added to args later
                    uf: 'PR'
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                message: `Cliente ${args.name} cadastrado com sucesso! ID: ${data.id}`,
                data: data
            };
        } catch (error: any) {
            console.error("Erro ao criar cliente:", error);
            return {
                success: false,
                message: `Erro ao cadastrar cliente: ${error.message || 'Erro desconhecido'}`
            };
        }
    },

    async createSchedule(empresaId: string, args: { clientName: string, description: string, dateTime: string }) {
        try {
            // 1. Find Client
            const { data: clients } = await supabase
                .from('clientes')
                .select('id, nome_razao, logradouro, numero, bairro, cidade')
                .eq('empresa_id', empresaId)
                .ilike('nome_razao', `%${args.clientName}%`)
                .limit(1);

            if (!clients || clients.length === 0) {
                return { success: false, message: `Cliente '${args.clientName}' não encontrado. Cadastre-o primeiro.` };
            }

            const client = clients[0];

            // 2. Create Service Order
            const { data, error } = await supabase
                .from('ordens_servico')
                .insert({
                    empresa_id: empresaId,
                    cliente_id: client.id,
                    cliente_nome: client.nome_razao,
                    descricao_servico: args.description,
                    data_agendamento: args.dateTime,
                    status: 'PENDENTE',
                    endereco_servico: `${client.logradouro}, ${client.numero} - ${client.bairro}, ${client.cidade}`
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                message: `Agendamento criado para ${client.nome_razao} em ${new Date(args.dateTime).toLocaleString()}!`,
                os_id: data.id
            };

        } catch (error: any) {
            return { success: false, message: `Erro ao agendar: ${error.message}` };
        }
    },

    async createExpense(empresaId: string, args: { description: string, amount: number, category: string, licensePlate?: string }, userName: string) {
        try {
            const { data, error } = await supabase
                .from('despesas_tecnicos')
                .insert({
                    empresa_id: empresaId,
                    descricao: args.description,
                    valor: args.amount,
                    categoria: args.category,
                    placa_carro: args.licensePlate || null,
                    data_gasto: new Date().toISOString(),
                    status: 'pendente', // Requires approval
                    status_aprovacao: 'pendente',
                    tipo_despesa: 'outros'
                })
                .select()
                .single();

            if (error) throw error;

            // Also insert into financeiro_fluxo as SAIDA (PENDENTE aprovação)
            await supabase.from('financeiro_fluxo').insert({
                empresa_id: empresaId,
                tipo: 'SAIDA',
                valor: args.amount,
                descricao: `(Pendente) ${args.description} - ${userName}`,
                status: 'PENDENTE',
                data_lancamento: new Date().toISOString(),
                categoria: args.category
            });

            return {
                success: true,
                message: `Despesa de R$ ${args.amount} registrada e aguardando aprovação.`
            };

        } catch (error: any) {
            return { success: false, message: `Erro ao lançar despesa: ${error.message}` };
        }
    },

    async getDailyBriefing(empresaId: string) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

            // 1. Fetch Today's OS
            const { data: osList } = await supabase
                .from('ordens_servico')
                .select('cliente_nome, data_agendamento, status')
                .eq('empresa_id', empresaId)
                .gte('data_agendamento', `${today}T00:00:00`)
                .lt('data_agendamento', `${tomorrow}T00:00:00`)
                .order('data_agendamento');

            // 2. Count active
            const pending = osList?.filter(os => os.status !== 'CONCLUIDO').length || 0;
            const completed = osList?.filter(os => os.status === 'CONCLUIDO').length || 0;

            const events = osList?.map(os => {
                const time = new Date(os.data_agendamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return `${time} - ${os.cliente_nome} (${os.status})`;
            }).join('\n');

            return {
                message: `Resumo de Hoje (${new Date().toLocaleDateString('pt-BR')}):\n\n📅 Agendamentos: ${osList?.length || 0}\n✅ Concluídos: ${completed}\n⏳ Pendentes: ${pending}\n\nAgenda:\n${events || "Sem agendamentos para hoje."}`
            };

        } catch (error: any) {
            return { success: false, message: `Erro ao gerar briefing: ${error.message}` };
        }
    }
};

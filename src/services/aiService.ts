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
                description: "Busca clientes da empresa no banco de dados. Use para responder perguntas como 'Quem é o cliente X?' ou 'Liste meus clientes'.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "Nome, telefone ou termo de busca para filtrar clientes. Deixe vazio para listar recentes." }
                    },
                }
            },
            {
                name: "get_financial_report",
                description: "Gera um resumo financeiro (Entradas, Saídas, Lucro) para um determinado período.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        period: { type: "STRING", description: "Período desejado: 'current_month', 'last_month', 'last_week', 'last_7_days', 'last_3_months', 'year_to_date'." }
                    },
                    required: ["period"]
                }
            },
            {
                name: "get_service_history",
                description: "Busca o histórico de serviços e valores de um cliente específico.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        clientName: { type: "STRING", description: "Nome do cliente para buscar o histórico." }
                    },
                    required: ["clientName"]
                }
            },
            {
                name: "create_client",
                description: "Cadastra um novo cliente no sistema. Requer Nome, Telefone e Endereço (Rua e Número). Peça confirmação antes de salvar.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "Nome completo do cliente ou Razão Social." },
                        phone: { type: "STRING", description: "Telefone ou WhatsApp do cliente (apenas números ou formatado)." },
                        street: { type: "STRING", description: "Nome da rua ou logradouro." },
                        number: { type: "STRING", description: "Número do endereço." }
                    },
                    required: ["name", "phone", "street", "number"]
                }
            },
            {
                name: "create_schedule",
                description: "Agenda uma visita técnica (Ordem de Serviço). Busca o cliente pelo nome e cria o agendamento.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        clientName: { type: "STRING", description: "Nome do cliente." },
                        description: { type: "STRING", description: "Descrição do problema ou serviço a ser realizado." },
                        dateTime: { type: "STRING", description: "Data e hora do agendamento no formato ISO 8601 (ex: 2024-01-01T14:30:00). Se o usuário disser 'amanhã', calcule a data." }
                    },
                    required: ["clientName", "description", "dateTime"]
                }
            },
            {
                name: "create_expense",
                description: "Registra uma despesa ou gasto.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        description: { type: "STRING", description: "Descrição do gasto (ex: Gasolina, Almoço)." },
                        amount: { type: "NUMBER", description: "Valor do gasto em reais." },
                        category: { type: "STRING", description: "Categoria: combustivel, alimentacao, material, outros." },
                        licensePlate: { type: "STRING", description: "Placa do veículo (opcional, se for gasto com carro)." }
                    },
                    required: ["description", "amount", "category"]
                }
            },
            {
                name: "get_daily_briefing",
                description: "Fornece um resumo do dia: próximas visitas e saldo financeiro rápido.",
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
        const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

        if (!API_KEY) {
            console.warn("Gemini API Key missing.");
            return "Erro: Chave de API do Gemini não configurada (VITE_GEMINI_API_KEY).";
        }

        // 1. System Prompt injection
        const systemInstruction = `
Você é o Consultor Especialista do FlowDrain, um sistema de gestão para desentupidoras.
Seu usuário atual é ${context.userName} (Empresa ID: ${context.empresaId}).

Sua missão é ajudar com:
1. Consultas rápidas sobre clientes e dados operacionais.
2. Dúvidas sobre o sistema (use seu conhecimento geral sobre sistemas SaaS de gestão).
3. Análise financeira básica.

Regras de Segurança:
- NUNCA invente dados. Se precisar de dados do banco, use as FERRAMENTAS disponíveis (search_clients, get_financial_report).
- Se a ferramenta retornar dados, analise-os e responda em linguagem natural.
- Seja profissional, direto e prestativo.
    `;

        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
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

                console.log(`🤖 IA solicitou função: ${functionName}`, args);

                if (functionName === 'search_clients') {
                    functionResult = await this.searchClients(context.empresaId, args.query);
                } else if (functionName === 'get_financial_report') {
                    // SECURITY CHECK: Only admins can access financial reports
                    if (context.role !== 'admin') {
                        functionResult = { message: "⛔ Acesso Negado: Apenas administradores podem acessar relatórios financeiros." };
                    } else {
                        functionResult = await this.getFinancialReport(context.empresaId, args.period);
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

                // Send function result back to model
                const result2 = await chat.sendMessage([
                    {
                        functionResponse: {
                            name: functionName,
                            response: { result: functionResult }
                        }
                    }
                ]);

                return result2.response.text();
            }

            return response.text();

        } catch (error: any) {
            console.error("Erro no Gemini:", error);
            return `Erro técnico: ${error.message || error.toString()}. (Verifique o console para mais detalhes)`;
        }
    },

    // --- INTERNAL TOOLS WITH STRICT RLS ---

    async searchClients(empresaId: string, query?: string) {
        let dbQuery = supabase
            .from('clientes')
            .select('id, nome_razao, whatsapp, cidade, bairro')
            .eq('empresa_id', empresaId)
            .limit(10); // Limit to avoid token overflow

        if (query) {
            dbQuery = dbQuery.ilike('nome_razao', `%${query}%`);
        } else {
            dbQuery = dbQuery.order('created_at', { ascending: false });
        }

        const { data } = await dbQuery;
        return data || [];
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

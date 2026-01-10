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
    }
};

import { supabase } from '@/lib/supabase'

export interface TechnicianBalance {
    technicianId: string
    technicianName: string
    technicianAvatar?: string
    totalCommission: number
    totalAdvances: number
    totalBonus: number
    totalReimbursements: number // Expenses to be paid back to tech
    finalBalance: number
    osCount: number
    osIds: string[]
    osDetails: any[] // Store minimal display info
    advancesIds: string[]
    commissionIds: string[]
    expenseIds: string[]
    expenseDetails: any[]
    advancesDetails?: any[] // Added for display
}


export const financialService = {
    /**
     * Calculates the current financial balance for a specific technician.
     * Logic:
     * 1. Fetches technician details (commission rate).
     * 2. Fetches completed but unpaid Service Orders.
     * 3. Fetches pending advances/bonuses from financeiro_fluxo.
     * 4. Calculates totals.
     */
    getTechnicianBalance: async (technicianId: string): Promise<TechnicianBalance> => {
        try {
            // 1. Get Technician Details
            const { data: tech, error: techError } = await (supabase
                .from('usuarios') as any)
                .select('*')
                .eq('id', technicianId)
                .single()

            if (techError) throw techError

            // Handle potential field name variations (user reported adding snake_case, but app might use others)
            const commissionRate = (tech.percentual_comissao || tech.commission_rate || 0) / 100

            let totalCommission = 0
            const osIds: string[] = []
            const commissionIds: string[] = []
            let totalAdvances = 0
            let totalBonus = 0
            const advancesIds: string[] = []

            // 2. Get Unpaid Commissions (historico_comissoes) - with graceful error handling
            let commissions: any[] = []
            try {
                const { data: commData, error: commError } = await (supabase
                    .from('historico_comissoes') as any)
                    .select('*')
                    .eq('tecnico_id', technicianId)
                    .eq('status_pagamento', 'a_pagar')

                if (!commError && commData) {
                    commissions = commData
                    commissions.forEach((comm: any) => {
                        const value = Number(comm.valor_comissao) || 0
                        totalCommission += value
                        if (comm.ordem_servico_id) osIds.push(comm.ordem_servico_id)
                        commissionIds.push(comm.id)
                    })
                }
            } catch (e) {
                console.warn('Tabela historico_comissoes não acessível:', e)
            }

            let advancesList: any[] = []

            // 3. Get Pending Advances/Bonuses - with graceful error handling
            try {
                const { data: flows, error: flowError } = await (supabase
                    .from('financeiro_fluxo') as any)
                    .select('*')
                    .eq('tecnico_id', technicianId)
                    .eq('status', 'PENDENTE')

                if (!flowError && flows) {
                    flows.forEach((flow: any) => {
                        if (flow.tipo === 'ADIANTAMENTO') {
                            totalAdvances += flow.valor
                            advancesList.push(flow) // Store for details
                        } else if (flow.tipo === 'BONUS') {
                            totalBonus += flow.valor
                        }
                        advancesIds.push(flow.id)
                    })
                }
            } catch (e) {
                console.warn('Tabela financeiro_fluxo não acessível:', e)
            }

            // 5. Get Approved Expenses (despesas_tecnicos) to Reimburse
            let totalReimbursements = 0
            const expenseIds: string[] = []
            let expenses: any[] = []
            try {
                const { data: expData, error: expError } = await (supabase
                    .from('despesas_tecnicos') as any)
                    .select('*')
                    .eq('tecnico_id', technicianId)
                    .eq('status', 'aprovado')

                if (!expError && expData) {
                    expenses = expData
                    expenses.forEach((exp: any) => {
                        totalReimbursements += Number(exp.valor) || 0
                        expenseIds.push(exp.id)
                    })
                }
            } catch (e) {
                console.warn('Tabela despesas_tecnicos não acessível:', e)
            }

            // 6. Get detailed OS info for display
            let osDetails: any[] = []
            if (osIds.length > 0) {
                const { data: osData } = await (supabase
                    .from('ordens_servico') as any)
                    .select('id, cliente_nome, descricao_servico, data_agendamento, valor_total, status')
                    .in('id', osIds)

                if (osData) {
                    // Merge with commission info
                    osDetails = osData.map((os: any) => {
                        // Find commission for this OS
                        const comm = commissions?.find((c: any) => c.ordem_servico_id === os.id)
                        return {
                            ...os,
                            commissionValue: comm?.valor_comissao || 0
                        }
                    })
                }
            }

            // 4. Calculate Final
            const finalBalance = totalCommission + totalBonus + totalReimbursements - totalAdvances

            return {
                technicianId,
                technicianName: tech.nome || tech.nome_completo || 'Técnico',
                technicianAvatar: tech.avatar_url, // Return avatar
                totalCommission,
                totalAdvances,
                totalBonus,
                totalReimbursements,
                finalBalance,
                osCount: osIds.length,
                osIds,
                osDetails,
                advancesIds,
                advancesDetails: advancesList, // Use the variable populated above
                commissionIds,
                expenseIds,
                expenseDetails: expenses || []
            }

        } catch (error) {
            console.error('Error calculating balance:', error)
            throw error
        }
    },

    /**
     * Executes the closing of the month for a technician.
     * 1. Marks all listed OS as paid.
     * 2. Marks all used advances/bonuses as PROCESSADO.
     * 3. Creates a FECHAMENTO record in financeiro_fluxo.
     */
    closeMonth: async (balanceData: TechnicianBalance, empresaId: string) => {
        try {
            // 1. Mark Commissions as PAID
            if (balanceData.commissionIds.length > 0) {
                const { error: commUpdateError } = await (supabase
                    .from('historico_comissoes') as any)
                    .update({ status_pagamento: 'pago' })
                    .in('id', balanceData.commissionIds)

                if (commUpdateError) throw commUpdateError
            }

            // 1b. Mark OS as paid_to_technician
            if (balanceData.osIds.length > 0) {
                await (supabase
                    .from('ordens_servico') as any)
                    .update({ paga_ao_tecnico: true })
                    .in('id', balanceData.osIds)
            }

            // 2. Mark Advances as PROCESSED
            if (balanceData.advancesIds.length > 0) {
                const { error: flowUpdateError } = await (supabase
                    .from('financeiro_fluxo') as any)
                    .update({ status: 'PROCESSADO' })
                    .in('id', balanceData.advancesIds)

                if (flowUpdateError) throw flowUpdateError
            }

            // 3. Mark Expenses as PAID
            if (balanceData.expenseIds && balanceData.expenseIds.length > 0) {
                const { error: expUpdateError } = await (supabase
                    .from('despesas_tecnicos') as any)
                    .update({ status: 'pago' })
                    .in('id', balanceData.expenseIds)

                if (expUpdateError) throw expUpdateError
            }

            // 4. Record Closing
            const { error: closingError } = await (supabase
                .from('financeiro_fluxo') as any)
                .insert({
                    empresa_id: empresaId,
                    tecnico_id: balanceData.technicianId,
                    tipo: 'FECHAMENTO',
                    valor: balanceData.finalBalance,
                    descricao: `Fechamento de comissões (${balanceData.osCount} OSs)`,
                    status: 'PROCESSADO'
                })

            if (closingError) throw closingError

            return true

        } catch (error) {
            console.error('Error closing month:', error)
            throw error
        }
    },

    /**
     * Fetches pending expenses for a technician.
     */
    /**
     * Fetches pending expenses for a technician (Awaiting Validation).
     */
    getPendingExpenses: async (technicianId: string) => {
        const { data, error } = await (supabase
            .from('despesas_tecnicos') as any)
            .select('*')
            .eq('tecnico_id', technicianId)
            .eq('status_aprovacao', 'pendente')
            .order('created_at', { ascending: true })

        if (error) throw error
        return data || []
    },

    /**
     * Fetches approved but unprocessed expenses (Awaiting Reimbursement).
     * Only returns expenses paid from technician's own pocket (origem_pagamento = 'proprio')
     */
    getApprovedExpenses: async (technicianId: string) => {
        const { data, error } = await (supabase
            .from('despesas_tecnicos') as any)
            .select('*')
            .eq('tecnico_id', technicianId)
            .eq('status_aprovacao', 'aprovado')
            .eq('status', 'pendente')
            .eq('origem_pagamento', 'proprio') // Só despesas pagas do bolso do técnico
            .order('created_at', { ascending: true })

        if (error) throw error
        return data || []
    },

    /**
     * Validates an expense (Review Step).
     */
    approveRejectExpense: async (expenseId: string, status: 'aprovado' | 'rejeitado') => {
        const updateData: any = { status_aprovacao: status }

        // If rejected, we also kill the financial flow
        if (status === 'rejeitado') {
            updateData.status = 'rejeitado'
        }
        // If approved, STRICTLY keep 'status' as 'pendente' so it doesn't hit balance yet

        const { error } = await (supabase
            .from('despesas_tecnicos') as any)
            .update(updateData)
            .eq('id', expenseId)

        if (error) throw error
        return true
    },

    /**
     * Authorizes the expense to be added to balance (Reimbursement Step).
     */
    /**
     * Authorizes the expense.
     * @param method 'balance' (add to comms) or 'direct' (paid via PIX/Cash immediately)
     */
    authorizeExpense: async (expenseId: string, method: 'balance' | 'direct' = 'balance') => {
        const newStatus = method === 'balance' ? 'aprovado' : 'pago'

        const { error } = await (supabase
            .from('despesas_tecnicos') as any)
            .update({ status: newStatus })
            .eq('id', expenseId)

        if (error) throw error
        return true
    },

    /**
     * Fetches historical data for technician charts.
     */
    getTechnicianHistory: async (technicianId: string) => {
        const historyData: any = {
            monthlyEarnings: [], // { month: 'Jan', value: 1000 }
            topServices: [] // { name: 'Manutenção', count: 5 }
        }

        try {
            // 1. Monthly Earnings (Last 6 months)
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
            sixMonthsAgo.setDate(1) // First day of 6 months ago

            const { data: earnings } = await (supabase
                .from('historico_comissoes') as any)
                .select('created_at, valor_comissao')
                .eq('tecnico_id', technicianId)
                .gte('created_at', sixMonthsAgo.toISOString())
                .order('created_at', { ascending: true })

            if (earnings) {
                // Group by month
                const monthlyMap = new Map<string, number>()
                // Init last 6 months
                for (let i = 0; i < 6; i++) {
                    const d = new Date()
                    d.setMonth(d.getMonth() - i)
                    const key = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()
                    monthlyMap.set(key, 0)
                }

                earnings.forEach((e: any) => {
                    const month = new Date(e.created_at).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()
                    const prev = monthlyMap.get(month) || 0
                    monthlyMap.set(month, prev + Number(e.valor_comissao))
                })

                // Convert to array and reverse to chronological order
                historyData.monthlyEarnings = Array.from(monthlyMap.entries())
                    .map(([month, value]) => ({ month, value }))
                    .reverse()
            }

            // 2. Top Services (All time or last year)
            // Need to join with ordens_servico to get service description
            // Since we can't easily join in client-side query without proper foreign key relation setup in Supabase types or view,
            // we'll fetch OS descriptions directly if we have many, or rely on commission descriptions if available.
            // Let's try fetching distributions from historico_comissoes if it has metadata, OR fetch OS
            // Easier: Fetch all OS for this tech and group by descriptions
            const { data: osData } = await (supabase
                .from('ordens_servico') as any)
                .select('descricao_servico')
                .eq('tecnico_id', technicianId)
                .eq('status', 'CONCLUIDO')
                .limit(200) // Safety limit

            if (osData) {
                const serviceMap = new Map<string, number>()
                osData.forEach((os: any) => {
                    const name = os.descricao_servico || 'Outros'
                    serviceMap.set(name, (serviceMap.get(name) || 0) + 1)
                })

                historyData.topServices = Array.from(serviceMap.entries())
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5) // Top 5
            }

        } catch (error) {
            console.error('Error fetching technician history:', error)
        }

        return historyData
    }
}

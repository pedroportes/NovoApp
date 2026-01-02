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
     */
    getApprovedExpenses: async (technicianId: string) => {
        const { data, error } = await (supabase
            .from('despesas_tecnicos') as any)
            .select('*')
            .eq('tecnico_id', technicianId)
            .eq('status_aprovacao', 'aprovado')
            .eq('status', 'pendente')
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
    authorizeExpense: async (expenseId: string) => {
        const { error } = await (supabase
            .from('despesas_tecnicos') as any)
            .update({ status: 'aprovado' }) // 'aprovado' status triggers inclusion in getTechnicianBalance
            .eq('id', expenseId)

        if (error) throw error
        return true
    }
}

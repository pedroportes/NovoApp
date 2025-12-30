import { supabase } from '@/lib/supabase'

export interface TechnicianBalance {
    technicianId: string
    technicianName: string
    totalCommission: number
    totalAdvances: number
    totalBonus: number
    finalBalance: number
    osCount: number
    osIds: string[]
    advancesIds: string[]
    commissionIds: string[]
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
            try {
                const { data: commissions, error: commError } = await (supabase
                    .from('historico_comissoes') as any)
                    .select('*')
                    .eq('tecnico_id', technicianId)
                    .eq('status_pagamento', 'a_pagar')

                if (!commError && commissions) {
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

            // 4. Calculate Final
            const finalBalance = totalCommission + totalBonus - totalAdvances

            return {
                technicianId,
                technicianName: tech.nome || tech.nome_completo || 'Técnico',
                totalCommission,
                totalAdvances,
                totalBonus,
                finalBalance,
                osCount: osIds.length,
                osIds,
                advancesIds,
                commissionIds
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
            // 1. Mark OS as paid
            // 1. Mark Commissions as PAID logic
            if (balanceData.commissionIds.length > 0) {
                const { error: commUpdateError } = await (supabase
                    .from('historico_comissoes') as any)
                    .update({ status_pagamento: 'pago' })
                    .in('id', balanceData.commissionIds)

                if (commUpdateError) throw commUpdateError
            }

            // Also mark OS as paid effectively? 
            // The user instruction focuses on "historico_comissoes".
            // Marking OS as "paga_ao_tecnico" is good practice but secondary if the primary source is now historico_comissoes.
            // I will keep it if osIds are present to be consistent.
            if (balanceData.osIds.length > 0) {
                await (supabase
                    .from('ordens_servico') as any)
                    .update({ paga_ao_tecnico: true })
                    .in('id', balanceData.osIds)
            }

            // 2. Mark Advances/Bonuses as PROCESSED
            if (balanceData.advancesIds.length > 0) {
                const { error: flowUpdateError } = await (supabase
                    .from('financeiro_fluxo') as any)
                    .update({ status: 'PROCESSADO' })
                    .in('id', balanceData.advancesIds)

                if (flowUpdateError) throw flowUpdateError
            }

            // 3. Record Closing
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
    }
}

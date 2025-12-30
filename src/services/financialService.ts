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

            // 2. Get Unpaid Service Orders
            // Assuming 'paga_ao_tecnico' is a boolean field in ordens_servico.
            // If it doesn't exist yet, we might need to filter by status or a new field.
            // For now, let's assume filtering by status 'Concluído' and checking a flag/log.
            // Since the user didn't mention 'paga_ao_tecnico' existence explicitly as *already there* but asked for logic to "mark as paid",
            // I will assume we need to filter by status='Concluído' and exclude those already in a closing batch?
            // Actually, best practice: add 'paga_ao_tecnico' boolean to OS if not exists, or check 'data_pagamento'.
            // Let's use 'status' = 'Concluído' and 'paga_ao_tecnico' is NULL or FALSE.

            // Checking if 'paga_ao_tecnico' exists in my types... it is NOT in the types I saw earlier.
            // I should probably add it to the query assuming it exists in DB or will be added.
            // User said "onde paga_ao_tecnico = false", so the column EXISTS in DB.

            const { data: orders, error: osError } = await (supabase
                .from('ordens_servico') as any) // Casting as paga_ao_tecnico might be missing in local types
                .select('id, valor_total, status, paga_ao_tecnico')
                .eq('tecnico_id', technicianId)
                .eq('status', 'Concluído')
                .is('paga_ao_tecnico', false)

            if (osError) throw osError

            let totalCommission = 0
            const osIds: string[] = []

            orders?.forEach((os: any) => {
                const value = os.valor_total || 0
                totalCommission += value * commissionRate
                osIds.push(os.id)
            })

            // 3. Get Pending Advances/Bonuses
            const { data: flows, error: flowError } = await (supabase
                .from('financeiro_fluxo') as any)
                .select('*')
                .eq('tecnico_id', technicianId)
                .eq('status', 'PENDENTE')

            if (flowError) throw flowError

            let totalAdvances = 0
            let totalBonus = 0
            const advancesIds: string[] = []

            flows?.forEach((flow: any) => {
                if (flow.tipo === 'ADIANTAMENTO') {
                    totalAdvances += flow.valor
                } else if (flow.tipo === 'BONUS') {
                    totalBonus += flow.valor
                }
                advancesIds.push(flow.id)
            })

            // 4. Calculate Final
            const finalBalance = totalCommission + totalBonus - totalAdvances

            return {
                technicianId,
                technicianName: tech.nome,
                totalCommission,
                totalAdvances,
                totalBonus,
                finalBalance,
                osCount: osIds.length,
                osIds,
                advancesIds
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
            if (balanceData.osIds.length > 0) {
                const { error: osUpdateError } = await (supabase
                    .from('ordens_servico') as any)
                    .update({
                        paga_ao_tecnico: true,
                        // data_pagamento: new Date().toISOString() // Optional if column exists
                    })
                    .in('id', balanceData.osIds)

                if (osUpdateError) throw osUpdateError
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

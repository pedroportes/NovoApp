import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export type PlanType = 'free' | 'essencial' | 'pro' | 'operacional' | 'prime'

interface LicenseStatus {
    loading: boolean
    isTrial: boolean
    isTrialExpired: boolean
    plan: PlanType
    limits: {
        clients: number | 'unlimited'
        os: number | 'unlimited'
        team: number | 'unlimited'
    }
    usage: {
        clients: number
        os: number
        team: number
        daysUsed: number
    }
    canAddClient: boolean
    canAddOS: boolean
    canAddTeamMember: boolean
}

export function useLicenseCheck() {
    const { user, empresaId } = useAuth()
    const [status, setStatus] = useState<LicenseStatus>({
        loading: true,
        isTrial: true,
        isTrialExpired: false,
        plan: 'free',
        limits: { clients: 10, os: 10, team: 1 },
        usage: { clients: 0, os: 0, team: 0, daysUsed: 0 },
        canAddClient: false,
        canAddOS: false,
        canAddTeamMember: false
    })

    useEffect(() => {
        if (!user || !empresaId) return

        checkLicense()
    }, [user, empresaId])

    const checkLicense = async () => {
        if (!empresaId) return
        try {
            // 1. Get Company Details (Created At & Subscription)
            const { data: companyData, error: companyError } = await supabase
                .from('empresas')
                .select('created_at, subscription_status, subscription_price_id')
                .eq('id', empresaId || '')
                .single()

            if (companyError || !companyData) throw new Error('Company not found')

            // 2. Identify Plan
            // Map Stripe Price IDs to internal Plan Types
            // Essencial: price_1Sn40G2HN3YhJoauSSD0AcEE
            // Pro Fluxo: price_1Sn41V2HN3YhJoauwIng5GnO
            // Operacional: price_1Sn42t2HN3YhJoauLrtAaWr0
            // Prime Fleet: price_1Sn44d2HN3YhJoaumqXIuvAg

            let plan: PlanType = 'free'
            if (companyData.subscription_status === 'active') {
                const priceId = companyData.subscription_price_id
                // Mapeamento de IDs de Produção (Live) - Sincronizado com Plans.tsx
                if (priceId === 'price_1T02Y8C2SBfOxdrqfPf01e1C') plan = 'essencial'
                else if (priceId === 'price_1SsUaDC2SBfOxdrq9LBbQkcl') plan = 'pro'
                else if (priceId === 'price_1SsUe8C2SBfOxdrqRMtj4wjh') plan = 'operacional'
                else if (priceId === 'price_1SsUkBC2SBfOxdrqofDd7Euj') plan = 'prime'
                else if (priceId === 'price_1T02TLC2SBfOxdrqrdbCvFEQ') plan = 'free' // Solo is free-tier in logic sometimes, but here we treat it
                
                // Mantendo compatibilidade com plano de teste de R$ 1,99 (Tratado como Pro)
                else if (priceId === 'price_1SsN4HC2SBfOxdrq13q2V5ga' || priceId === 'price_1SsOJhC2SBfOxdrqy7Jf2xNO') plan = 'pro'
                
                // Fallbacks antigos (removendo IDs redundantes/antigos para evitar confusão)
                else if (priceId === '12990') plan = 'pro'
                else plan = 'essencial'
            }

            // 3. Calculate Trial Days
            const createdAt = new Date(companyData.created_at || new Date())
            const now = new Date()
            const diffTime = Math.abs(now.getTime() - createdAt.getTime())
            const daysUsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            const isTrial = plan === 'free'
            const isTrialExpired = isTrial && daysUsed > 7

            // 4. Get Usage Counts
            const [clientsCount, osCount, teamCount] = await Promise.all([
                supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId || ''),
                supabase.from('ordens_servico').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId || ''),
                supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId || '').eq('cargo', 'tecnico') // Assuming only techs count for quota
            ])


            const usage = {
                clients: clientsCount.count || 0,
                os: osCount.count || 0,
                team: teamCount.count || 0,
                daysUsed
            }

            // 5. Define Limits
            let limits = {
                clients: 10 as number | 'unlimited',
                os: 10 as number | 'unlimited',
                team: 1 as number | 'unlimited' // Owner counts as 1 or separate? Usually logic is "Add more technicians". Let's say free = 1 user total (the owner)
            }

            if (plan !== 'free') {
                limits.clients = 'unlimited'
                limits.os = 'unlimited'

                if (plan === 'essencial') limits.team = 1 // 1 Tech (Autônomo)
                if (plan === 'pro') limits.team = 3
                if (plan === 'operacional') limits.team = 8
                if (plan === 'prime') limits.team = 'unlimited'
            }

            // 6. Check Permissions
            let canAddClient = true
            let canAddOS = true
            let canAddTeamMember = true

            if (isTrial) {
                if (isTrialExpired) {
                    canAddClient = false
                    canAddOS = false
                    canAddTeamMember = false
                } else {
                    if (usage.clients >= (limits.clients as number)) canAddClient = false
                    if (usage.os >= (limits.os as number)) canAddOS = false
                    if (usage.team >= (limits.team as number)) canAddTeamMember = false
                }
            } else {
                // Paid Plans - No limits for OS and Clients
                canAddClient = true
                canAddOS = true

                if (limits.team !== 'unlimited' && usage.team >= (limits.team as number)) {
                    canAddTeamMember = false
                }
            }

            setStatus({
                loading: false,
                isTrial,
                isTrialExpired,
                plan,
                limits,
                usage,
                canAddClient,
                canAddOS,
                canAddTeamMember
            })

        } catch (error) {
            console.error('Error checking license:', error)
            setStatus(prev => ({ ...prev, loading: false }))
        }
    }

    return { ...status, refreshLicense: checkLicense }
}

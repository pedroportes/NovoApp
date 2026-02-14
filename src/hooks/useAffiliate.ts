import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export interface AffiliateData {
    id: string
    user_id: string
    nome: string
    email: string
    codigo_afiliado: string
    link_afiliado: string
    tipo_comissao: 'unica' | 'recorrente'
    percentual_comissao: number
    total_cliques: number
    total_vendas: number
    total_comissoes_geradas: number
    total_comissoes_pendentes: number
    status: 'ativo' | 'inativo' | 'bloqueado'
}

export function useAffiliate() {
    const { user } = useAuth()
    const [affiliate, setAffiliate] = useState<AffiliateData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchAffiliate() {
            if (!user) {
                setLoading(false)
                return
            }

            try {
                const { data, error } = await supabase
                    .from('afiliados' as any)
                    .select('*')
                    .eq('user_id', user.id)
                    .single()

                if (error) {
                    if (error.code !== 'PGRST116') { // PGRST116 is "No rows found" - acceptable if not an affiliate
                        console.error('Error fetching affiliate:', error)
                        setError(error.message)
                    }
                } else {
                    setAffiliate(data as unknown as AffiliateData)
                }
            } catch (err: any) {
                console.error('Unexpected error fetching affiliate:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchAffiliate()
    }, [user])

    const registerAffiliate = async (nickname: string) => {
        if (!user) return null
        
        try {
            setLoading(true)
            // Generate basic code/link logic here (or better, rely on backend function/logic)
            // For now, simple frontend logic for unique code generation
            const code = nickname.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 6)
            
            const newAffiliate = {
                user_id: user.id,
                nome: user.user_metadata.full_name || nickname,
                email: user.email,
                codigo_afiliado: code,
                link_afiliado: `${window.location.origin}?ref=${code}`,
                tipo_comissao: 'recorrente', // Default strategy
                percentual_comissao: 10.0,   // Default percentage
                status: 'ativo'
            }

            const { data, error } = await supabase
                .from('afiliados' as any)
                .insert([newAffiliate])
                .select()
                .single()

            if (error) throw error

            setAffiliate(data as unknown as AffiliateData)
            toast.success('Conta de afiliado criada com sucesso!')
            return data as unknown as AffiliateData
        } catch (err: any) {
            console.error('Error registering affiliate:', err)
            toast.error('Erro ao criar conta de afiliado.')
            setError(err.message)
            return null
        } finally {
            setLoading(false)
        }
    }

    return { affiliate, loading, error, registerAffiliate }
}

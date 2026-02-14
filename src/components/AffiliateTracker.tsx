import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function AffiliateTracker() {
    const location = useLocation()

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search)
        const ref = searchParams.get('ref') || searchParams.get('aff')

        if (ref) {
            // 1. Armazena no localStorage para persistência durante o cadastro
            localStorage.setItem('flowdrain_affiliate_id', ref)

            // 2. Registra o clique no banco de dados (via RPC seguro)
            // Usamos uma flag no sessionStorage para não contar múltiplos cliques na mesma sessão (refresh)
            const sessionTracked = sessionStorage.getItem(`tracked_${ref}`)

            if (!sessionTracked) {
                const trackClick = async () => {
                    try {
                        const { data, error } = await supabase.rpc('registrar_clique_afiliado' as any, {
                            p_codigo_afiliado: ref,
                            p_user_agent: navigator.userAgent,
                            p_referrer: document.referrer || null
                        })

                        if (error) {
                            console.error('Error tracking affiliate click:', error)
                        } else {
                            sessionStorage.setItem(`tracked_${ref}`, 'true')
                        }
                    } catch (err) {
                        console.error('Unexpected error tracking click:', err)
                    }
                }

                trackClick()
            }
        }
    }, [location])

    return null // Este componente não renderiza nada
}

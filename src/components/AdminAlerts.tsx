import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Car } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AdminAlerts() {
    const { userData } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        // Only admins should hear this
        if (userData?.cargo !== 'admin') return

        console.log('AdminAlerts: Listening for updates...')

        const channel = supabase
            .channel('admin-alerts')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'ordens_servico',
                },
                async (payload) => {
                    const newData = payload.new as any
                    const oldData = payload.old as any

                    // Check if displacement started: old was null/diff, new is set
                    const started = !oldData.deslocamento_iniciado_em && newData.deslocamento_iniciado_em

                    if (started) {
                        console.log('AdminAlerts: Displacement started!', newData)

                        // Play sound (Simple notification sound)
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
                            await audio.play()
                        } catch (e) {
                            console.error('Audio play failed', e)
                        }

                        // Fetch details to show nice message
                        const { data: cliente } = await supabase
                            .from('clientes')
                            .select('nome_razao')
                            .eq('id', newData.cliente_id)
                            .single()

                        const { data: tecnico } = await supabase
                            .from('usuarios')
                            .select('nome_completo')
                            .eq('id', newData.tecnico_id)
                            .single()

                        toast.info('Técnico em Deslocamento!', {
                            description: `${tecnico?.nome_completo || 'Técnico'} iniciou navegação para ${cliente?.nome_razao || 'Cliente'}`,
                            duration: 10000,
                            icon: <Car className="h-5 w-5 text-blue-500" />,
                            action: {
                                label: 'Ver OS',
                                onClick: () => navigate(`/service-orders/${newData.id}`)
                            }
                        })
                    }

                    // Check if OS was completed: old was not completed, new is CONCLUIDO
                    const completed = (oldData.status !== 'CONCLUIDO' && oldData.status !== 'Concluido') &&
                        (newData.status === 'CONCLUIDO' || newData.status === 'Concluido')

                    if (completed) {
                        console.log('AdminAlerts: OS Completed!', newData)

                        // Play success sound
                        try {
                            // Positive success chime
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3')
                            await audio.play()
                        } catch (e) {
                            console.error('Audio play failed', e)
                        }

                        // Fetch details
                        const { data: cliente } = await supabase
                            .from('clientes')
                            .select('nome_razao')
                            .eq('id', newData.cliente_id)
                            .single()

                        const { data: tecnico } = await supabase
                            .from('usuarios')
                            .select('nome_completo')
                            .eq('id', newData.tecnico_id)
                            .single()

                        toast.success('Serviço Concluído!', {
                            description: `${tecnico?.nome_completo || 'Técnico'} finalizou a OS do cliente ${cliente?.nome_razao || 'Cliente'}`,
                            duration: 10000,
                            // icon: <CheckCircle className="h-5 w-5 text-emerald-500" />, // Using default success icon from Sonner
                            action: {
                                label: 'Ver Detalhes',
                                onClick: () => navigate(`/service-orders/${newData.id}`)
                            }
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userData, navigate])

    return null
}

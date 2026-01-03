import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Car, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function AdminAlerts() {
    const { userData } = useAuth()
    const navigate = useNavigate()

    const [isOpen, setIsOpen] = useState(false)
    const [alertData, setAlertData] = useState<{
        type: 'started' | 'completed',
        title: string,
        description: string,
        osId: string,
        eta?: string
    } | null>(null)

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const successAudioRef = useRef<HTMLAudioElement | null>(null)

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

                    // Check if displacement started
                    const started = !oldData.deslocamento_iniciado_em && newData.deslocamento_iniciado_em

                    // Check if OS was completed
                    const completed = (oldData.status !== 'CONCLUIDO' && oldData.status !== 'Concluido') &&
                        (newData.status === 'CONCLUIDO' || newData.status === 'Concluido')

                    if (started || completed) {
                        try {
                            // Play appropriate sound
                            if (started && audioRef.current) {
                                await audioRef.current.play()
                            } else if (completed && successAudioRef.current) {
                                await successAudioRef.current.play()
                            }
                        } catch (e) {
                            console.error('Audio play failed:', e)
                        }

                        // Wait 1s for DB consistency
                        await new Promise(r => setTimeout(r, 1000))

                        // Fetch details
                        const { data: osDetails } = await supabase
                            .from('ordens_servico')
                            .select('previsao_chegada, cliente_id, tecnico_id')
                            .eq('id', newData.id)
                            .single()

                        const { data: cliente } = await supabase
                            .from('clientes')
                            .select('nome_razao')
                            .eq('id', osDetails?.cliente_id || newData.cliente_id)
                            .single()

                        const { data: tecnico } = await supabase
                            .from('usuarios')
                            .select('nome_completo')
                            .eq('id', osDetails?.tecnico_id || newData.tecnico_id)
                            .single()

                        // Prepare Data
                        let timeString = ''
                        if (osDetails?.previsao_chegada) {
                            const date = new Date(osDetails.previsao_chegada)
                            if (!isNaN(date.getTime())) {
                                timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                            }
                        }

                        // Set State to Open Modal
                        if (started) {
                            setAlertData({
                                type: 'started',
                                title: 'Técnico em Deslocamento!',
                                description: `${tecnico?.nome_completo || 'Técnico'} iniciou navegação para ${cliente?.nome_razao || 'Cliente'}`,
                                osId: newData.id,
                                eta: timeString
                            })
                        } else {
                            setAlertData({
                                type: 'completed',
                                title: 'Serviço Concluído!',
                                description: `${tecnico?.nome_completo || 'Técnico'} finalizou a OS do cliente ${cliente?.nome_razao || 'Cliente'}`,
                                osId: newData.id
                            })
                        }
                        setIsOpen(true)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userData, navigate])

    const handleClose = () => {
        setIsOpen(false)
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
        }
        if (successAudioRef.current) {
            successAudioRef.current.pause()
            successAudioRef.current.currentTime = 0
        }
    }

    const handleView = () => {
        if (alertData?.osId) {
            navigate(`/service-orders/${alertData.osId}`)
            handleClose()
        }
    }

    if (!userData || userData.cargo !== 'admin') return null

    return (
        <>
            <div className="hidden">
                <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
                <audio ref={successAudioRef} src="https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3" preload="auto" />
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className={`text-2xl font-bold flex items-center gap-3 ${alertData?.type === 'completed' ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {alertData?.type === 'completed' ? (
                                <CheckCircle className="h-8 w-8" />
                            ) : (
                                <Car className="h-8 w-8" />
                            )}
                            {alertData?.title}
                        </DialogTitle>
                        <DialogDescription className="text-base text-slate-600 pt-2">
                            {alertData?.description}
                        </DialogDescription>
                    </DialogHeader>

                    {alertData?.eta && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col items-center justify-center my-2">
                            <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">Previsão de Chegada</span>
                            <span className="text-3xl font-black text-blue-600">{alertData.eta}</span>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                        <Button variant="outline" onClick={handleClose} className="h-12 text-slate-500 hover:text-slate-700">
                            Fechar
                        </Button>
                        <Button
                            className={`h-12 font-bold ${alertData?.type === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                            onClick={handleView}
                        >
                            Ver Detalhes da OS
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

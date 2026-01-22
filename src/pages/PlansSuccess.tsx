import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Home, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { confetti } from 'https://esm.sh/canvas-confetti@1.6.0'

export function PlansSuccess() {
    const navigate = useNavigate()

    useEffect(() => {
        // Disparar confetes ao carregar
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            (window as any).confetti && (window as any).confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            (window as any).confetti && (window as any).confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-lg w-full border border-slate-100 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 animate-bounce" />
                </div>

                <h1 className="text-3xl font-black text-slate-900 mb-2">Assinatura Ativada!</h1>
                <p className="text-slate-600 mb-8">
                    Parabéns! Sua empresa agora está em um novo nível. Todos os recursos do seu plano já estão liberados.
                </p>

                <div className="space-y-3">
                    <Button
                        onClick={() => navigate('/')}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        Ir para o Dashboard
                        <Home className="w-4 h-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={() => navigate('/service-orders/new')}
                        className="w-full h-12 text-slate-600 font-bold rounded-2xl gap-2 hover:bg-slate-50"
                    >
                        Criar Nova OS
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>

                <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Obrigado por confiar no FlowDrain
                </p>
            </div>

            <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
        </div>
    )
}

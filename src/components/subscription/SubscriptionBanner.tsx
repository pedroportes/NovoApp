import { AlertTriangle, XCircle, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubscription } from '@/hooks/useSubscription'

export function SubscriptionBanner() {
    const { isInGracePeriod, isRestricted, daysRemaining } = useSubscription()
    const [dismissed, setDismissed] = useState(false)

    if (dismissed || (!isInGracePeriod && !isRestricted)) return null

    if (isRestricted) {
        return (
            <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-3 text-sm font-medium shadow-lg z-[90] relative">
                <XCircle className="h-5 w-5 shrink-0" />
                <span className="flex-1">
                    Sua assinatura expirou. Novas criações estão <strong>bloqueadas</strong>.
                    Renove para continuar usando o sistema normalmente.
                </span>
                <Link
                    to="/plans"
                    className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors whitespace-nowrap"
                >
                    Renovar
                </Link>
            </div>
        )
    }

    if (isInGracePeriod) {
        return (
            <div className="bg-amber-500 text-white px-4 py-3 flex items-center gap-3 text-sm font-medium shadow-lg z-[90] relative">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span className="flex-1">
                    Pagamento pendente! Você tem <strong>{daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}</strong> para regularizar antes do bloqueio.
                </span>
                <Link
                    to="/plans"
                    className="bg-white text-amber-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors whitespace-nowrap"
                >
                    Pagar
                </Link>
                <button
                    onClick={() => setDismissed(true)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Fechar aviso"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        )
    }

    return null
}

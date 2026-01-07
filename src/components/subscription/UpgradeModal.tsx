import { useNavigate } from 'react-router-dom'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Rocket } from 'lucide-react'

interface UpgradeModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    description?: string
}

export function UpgradeModal({
    isOpen,
    onClose,
    title = "Limite Atingido",
    description = "Você atingiu o limite do seu plano atual. Faça um upgrade para continuar crescendo sua empresa!"
}: UpgradeModalProps) {
    const navigate = useNavigate()

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-blue-600">
                        <Rocket className="h-5 w-5" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="pt-2 text-base">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                        🚀 Planos a partir de <strong>R$ 59,90/mês</strong> com clientes e ordens de serviço ilimitados.
                    </div>
                </div>
                <DialogFooter className="sm:justify-start">
                    <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        onClick={() => navigate('/plans')}
                    >
                        Ver Planos Disponíveis
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

import { useOutletContext } from 'react-router-dom'
import { AffiliateData } from '@/hooks/useAffiliate'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, TrendingUp, Users, DollarSign, MousePointer2 } from 'lucide-react'
import { toast } from 'sonner'

interface OutletContextType {
    affiliate: AffiliateData
}

export function AffiliateDashboard() {
    const { affiliate } = useOutletContext<OutletContextType>()

    const handleCopyLink = () => {
        if (affiliate?.link_afiliado) {
            navigator.clipboard.writeText(affiliate.link_afiliado)
            toast.success('Link de afiliado copiado!')
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Boas vindas */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Visão Geral</h1>
                    <p className="text-slate-500">Acompanhe seu desempenho e comissões.</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm">
                    <span className="text-sm font-medium text-slate-500">Seu Código:</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {affiliate.codigo_afiliado}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => {
                        navigator.clipboard.writeText(affiliate.codigo_afiliado)
                        toast.success('Código copiado!')
                    }} className="h-6 w-6 ml-1">
                        <Copy className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Link de Divulgação */}
            <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Share2 className="h-5 w-5" /> Seu Link de Indicação
                    </CardTitle>
                    <CardDescription className="text-purple-100">
                        Compartilhe este link para garantir que as assinaturas sejam atribuídas a você.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <code className="flex-1 bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20 font-mono text-sm w-full break-all">
                            {affiliate.link_afiliado}
                        </code>
                        <Button
                            onClick={handleCopyLink}
                            variant="secondary"
                            className="bg-white text-purple-600 hover:bg-purple-50 shrink-0 w-full md:w-auto font-semibold shadow-lg"
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Link
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Métricas Principais */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Comissões */}
                <Card className="border-l-4 border-l-emerald-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Saldo Disponível
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            R$ {affiliate.total_comissoes_pendentes.toFixed(2)}
                        </div>
                        <p className="text-xs text-emerald-600 flex items-center mt-1 font-medium">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Pronto para saque
                        </p>
                    </CardContent>
                </Card>

                {/* Total Ganho */}
                <Card className="border-l-4 border-l-blue-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Total Ganho
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            R$ {affiliate.total_comissoes_geradas.toFixed(2)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Acumulado histórico
                        </p>
                    </CardContent>
                </Card>

                {/* Vendas Ativas */}
                <Card className="border-l-4 border-l-purple-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Assinaturas Ativas
                        </CardTitle>
                        <Users className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            {affiliate.total_vendas}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Clientes pagantes
                        </p>
                    </CardContent>
                </Card>

                {/* Cliques */}
                <Card className="border-l-4 border-l-orange-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Total de Cliques
                        </CardTitle>
                        <MousePointer2 className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            {affiliate.total_cliques}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Visitas no link
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Gráficos ou Listas recentes viriam aqui */}
            {/* ... */}
        </div>
    )
}

function Share2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
            <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
        </svg>
    )
}

function Wallet(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
        </svg>
    )
}

import { useOutletContext } from 'react-router-dom'
import { AffiliateData } from '@/hooks/useAffiliate'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Share2, Facebook, Twitter, Linkedin, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface OutletContextType {
    affiliate: AffiliateData
}

export function AffiliateLinks() {
    const { affiliate } = useOutletContext<OutletContextType>()

    const handleCopyLink = () => {
        if (affiliate?.link_afiliado) {
            navigator.clipboard.writeText(affiliate.link_afiliado)
            toast.success('Link de afiliado copiado!')
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Links de Divulgação</h1>
                <p className="text-slate-500">Ferramentas para você divulgar o FlowDrain e ganhar mais.</p>
            </div>

            <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Share2 className="w-64 h-64" />
                </div>
                <CardHeader className="relative z-10">
                    <CardTitle className="text-2xl">Seu Link Principal</CardTitle>
                    <CardDescription className="text-purple-100">
                        Este é o link padrão para a página inicial. Use-o para divulgar o sistema de forma geral.
                    </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <code className="flex-1 bg-white/10 backdrop-blur-sm px-4 py-4 rounded-xl border border-white/20 font-mono text-lg w-full break-all shadow-inner">
                            {affiliate.link_afiliado}
                        </code>
                        <Button
                            onClick={handleCopyLink}
                            size="lg"
                            variant="secondary"
                            className="bg-white text-purple-600 hover:bg-purple-50 shrink-0 w-full md:w-auto font-bold shadow-lg"
                        >
                            <Copy className="h-5 w-5 mr-2" />
                            Copiar Link
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="social" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="social">Redes Sociais</TabsTrigger>
                    <TabsTrigger value="creative">Criativos (Banners)</TabsTrigger>
                </TabsList>

                <TabsContent value="social" className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Compartilhe Agora</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(affiliate.link_afiliado)}`, '_blank')}>
                            <Facebook className="h-8 w-8 text-blue-600" />
                            <span>Facebook</span>
                        </Button>
                        <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-500 transition-colors" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(affiliate.link_afiliado)}&text=Confira%20o%20melhor%20sistema%20para%20desentupidoras!`, '_blank')}>
                            <Twitter className="h-8 w-8 text-sky-500" />
                            <span>Twitter / X</span>
                        </Button>
                        <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(affiliate.link_afiliado)}`, '_blank')}>
                            <Linkedin className="h-8 w-8 text-blue-700" />
                            <span>LinkedIn</span>
                        </Button>
                        <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-colors" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Confira o FlowDrain: ${affiliate.link_afiliado}`)}`, '_blank')}>
                            <MessageCircle className="h-8 w-8 text-green-600" />
                            <span>WhatsApp</span>
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="creative" className="mt-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                        <p className="text-slate-500">
                            Banners e materiais de marketing estarão disponíveis em breve.
                        </p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

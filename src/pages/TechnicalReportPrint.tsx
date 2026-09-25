import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Printer, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { technicalReportService } from '@/services/technicalReportService'
import { TechnicalReportDocument } from '@/components/technical-report/TechnicalReportDocument'
import { EmpresaSnapshot, RelatorioTecnico, relatorioVazio, numeroFormatado } from '@/types/technicalReport'

export function TechnicalReportPrint() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { userData } = useAuth()
    const [relatorio, setRelatorio] = useState<RelatorioTecnico | null>(null)
    const [empresa, setEmpresa] = useState<EmpresaSnapshot | null>(null)
    const [erro, setErro] = useState('')
    const [imagensProntas, setImagensProntas] = useState(false)

    useEffect(() => {
        if (!id || !userData?.empresa_id) return
        technicalReportService.buscar(id)
            .then(async r => {
                if (!r) { setErro('Relatório não encontrado.'); return }
                setRelatorio(r)
                if (!r.dados.empresa) setEmpresa(await technicalReportService.buscarEmpresa(r.marca_id, userData.empresa_id!))
            })
            .catch(e => setErro(e?.message || 'Erro ao carregar relatório.'))
    }, [id, userData?.empresa_id])

    // Espera todas as imagens (logo, fotos, assinaturas) antes de liberar a impressão
    useEffect(() => {
        if (!relatorio) return
        const t = setTimeout(async () => {
            const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.rt-doc img'))
            await Promise.all(imgs.map(img => img.complete ? null : new Promise(ok => { img.onload = ok; img.onerror = ok })))
            setImagensProntas(true)
        }, 100)
        return () => clearTimeout(t)
    }, [relatorio, empresa])

    useEffect(() => {
        if (relatorio) {
            const nome = relatorio.dados.cliente?.nome ? ` - ${relatorio.dados.cliente.nome}` : ''
            document.title = `${numeroFormatado(relatorio.numero, relatorio.created_at)}${nome}`
        }
        return () => { document.title = 'FlowDrain SaaS' }
    }, [relatorio])

    if (erro) return <div className="p-10 text-center text-slate-500">{erro}</div>
    if (!relatorio) {
        return <div className="min-h-screen flex items-center justify-center gap-2 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Carregando relatório...</div>
    }

    return (
        <div className="min-h-screen bg-slate-200/70 print:bg-white">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 print:hidden">
                <div className="max-w-[210mm] mx-auto px-2 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => (window.history.length > 1 ? navigate(-1) : window.close())}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <div className="text-sm font-extrabold text-slate-800">{numeroFormatado(relatorio.numero, relatorio.created_at)}</div>
                            <div className="text-[11px] text-slate-500">
                                {relatorio.status === 'emitido' ? 'Emitido · pronto para enviar ao cliente' : 'Rascunho · sai com marca d’água até ser emitido'}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => navigate(`/relatorio-tecnico/${relatorio.id}`)}>
                            <Pencil className="h-4 w-4 mr-1.5" /> Editor
                        </Button>
                        <Button size="sm" className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700" disabled={!imagensProntas} onClick={() => window.print()}>
                            {imagensProntas ? <Printer className="h-4 w-4 mr-1.5" /> : <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                            Imprimir / Salvar PDF
                        </Button>
                    </div>
                </div>
            </div>
            <div className="py-8 print:py-0">
                <TechnicalReportDocument
                    dados={{ ...relatorioVazio(), ...relatorio.dados }}
                    empresa={empresa}
                    numero={relatorio.numero}
                    status={relatorio.status}
                    criadoEm={relatorio.created_at}
                    emitidoEm={relatorio.emitido_em}
                />
            </div>
        </div>
    )
}

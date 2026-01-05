import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ServiceOrderPrint } from '@/components/ServiceOrderPrint'

export function PrintServiceOrder() {
    const { id } = useParams()
    const [os, setOs] = useState<any>(null)
    const [company, setCompany] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const [searchParams] = useSearchParams()
    const typeOverride = searchParams.get('type')

    useEffect(() => {
        if (id) {
            fetchData()
        }
    }, [id])

    const fetchData = async () => {
        try {
            // 1. Fetch OS Details
            const { data: rawOsData, error: osError } = await supabase
                .from('ordens_servico')
                .select('*')
                .eq('id', id!)
                .single()

            const osData: any = rawOsData

            if (osError) throw osError

            // Apply override if present
            if (typeOverride) {
                osData.tipo = typeOverride
            }

            // 2. Fetch Client Details (if cliente_id exists)
            let clientData = null
            if (osData.cliente_id) {
                const { data: cData, error: cError } = await supabase
                    .from('clientes')
                    .select('*')
                    .eq('id', osData.cliente_id)
                    .single()

                if (!cError) {
                    clientData = cData
                } else {
                    console.warn('Error fetching client:', cError)
                }
            }

            // Merge client data into OS object for the component
            const osWithClient = {
                ...osData,
                clientes: clientData
            }
            setOs(osWithClient)

            // 3. Fetch Company Details
            if (osData.empresa_id) {
                const { data: companyData, error: companyError } = await supabase
                    .from('empresas')
                    .select('*')
                    .eq('id', osData.empresa_id)
                    .single()

                if (companyError) {
                    console.warn('Error fetching company:', companyError)
                    setCompany({ nome: 'FlowDrain Services' })
                } else {
                    setCompany(companyData)
                }
            }
        } catch (error) {
            console.error('Error fetching print data:', error)
            alert('Erro ao carregar dados para impressão. Verifique o console para mais detalhes.')
        } finally {
            setLoading(false)
        }
    }

    // Auto-print removed to give user control

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Carregando visualização...</div>
    }

    if (!os || !company) {
        return <div className="flex items-center justify-center h-screen text-red-500">Erro ao carregar dados.</div>
    }

    return (
        <div className="bg-white min-h-screen">
            {/* Toolbar - Hidden in Print */}
            <div className="print:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.close()}
                        className="text-sm hover:text-gray-300 flex items-center gap-1"
                    >
                        &larr; Voltar
                    </button>
                    <span className="font-bold">Visualização de Impressão ({os.tipo})</span>
                </div>
                <button
                    onClick={() => {
                        const phone = os.clientes?.whatsapp?.replace(/\D/g, '') || ''
                        if (!phone) return alert('Cliente sem WhatsApp cadastrado')

                        const cliente = os.clientes?.nome_razao?.split(' ')[0] || 'Cliente'
                        const pdfType = os.tipo || 'documento'
                        const message = `Olá ${cliente} segue seu ${pdfType} precisando não exite em chamar. Obrigado`

                        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank')
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2 mr-4"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                    WhatsApp
                </button>
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                    Salvar PDF / Imprimir
                </button>
            </div>

            {/* Print Content */}
            <div className="print:p-0">
                <ServiceOrderPrint os={os} company={company} />
            </div>
            <style>{`
                @page {
                    size: auto;
                    margin: 0mm;
                }
                @media print {
                    body {
                        background-color: white;
                    }
                }
            `}</style>
        </div>
    )
}

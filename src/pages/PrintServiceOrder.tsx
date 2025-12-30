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

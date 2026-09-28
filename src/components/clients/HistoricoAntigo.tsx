import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ServicoAntigo {
    id: string
    data: string | null
    servico: string | null
    valor: number | null
    pagamento: string | null
    quem_fez: string | null
    detalhes: string | null
}

// Serviços da planilha antiga (2015–2021). Não é baixado com o app: só busca quando o cliente é aberto.
export function HistoricoAntigo({ clienteId }: { clienteId: string }) {
    const [itens, setItens] = useState<ServicoAntigo[] | null>(null)

    useEffect(() => {
        let ativo = true
        setItens(null)
        supabase
            .from('historico_servicos_antigos' as any)
            .select('id, data, servico, valor, pagamento, quem_fez, detalhes')
            .eq('cliente_id', clienteId)
            .order('data', { ascending: false })
            .then(({ data, error }) => {
                if (!ativo) return
                setItens(error ? [] : ((data as unknown) as ServicoAntigo[]) || [])
            })
        return () => { ativo = false }
    }, [clienteId])

    if (!itens || itens.length === 0) return null

    return (
        <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-slate-700 flex items-center gap-2">
                <History className="h-4 w-4" /> Serviços antigos ({itens.length}) · 2015 a 2021
            </summary>
            <div className="mt-2 divide-y divide-slate-200">
                {itens.map(s => (
                    <div key={s.id} className="py-2">
                        <div className="flex justify-between gap-2">
                            <span className="font-medium text-slate-800">{s.servico || 'Serviço'}</span>
                            <span className="text-slate-600 shrink-0">
                                {s.valor ? s.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                            </span>
                        </div>
                        <div className="text-xs text-slate-500">
                            {[s.data ? s.data.split('-').reverse().join('/') : null, s.quem_fez, s.pagamento].filter(Boolean).join(' · ')}
                        </div>
                        {s.detalhes && <div className="text-xs text-slate-500">{s.detalhes}</div>}
                    </div>
                ))}
            </div>
        </details>
    )
}

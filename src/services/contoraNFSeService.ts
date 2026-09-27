import { supabase } from '@/lib/supabase'

// Emissão de NFS-e pela Fiscal Contora. Tudo roda na Edge Function "nfse-contora":
// o token fica no servidor e a própria função grava o resultado na OS.
// Referência na OS: nfe_ref = "contora:<id do documento>", nfe_tipo = "contora".

export type EstadoContora = 'processando' | 'autorizado' | 'erro' | 'cancelado' | 'processando_cancelamento'

export interface RespostaContora {
    ok: boolean
    erro?: string
    estado?: EstadoContora
    os?: Record<string, any>
}

async function chamar(body: Record<string, unknown>): Promise<RespostaContora> {
    const { data, error } = await supabase.functions.invoke('nfse-contora', { body })
    if (error) throw new Error('Serviço de nota fiscal indisponível no momento. Tente de novo em instantes.')
    return data as RespostaContora
}

export const ContoraNFSeService = {
    ehContora: (os: { nfe_ref?: string | null } | null | undefined) => String(os?.nfe_ref || '').startsWith('contora:'),

    /** Emissor ativo da empresa (Configurações → Nota fiscal). Sem configuração = Focus. */
    async provedorAtivo(empresaId: string): Promise<'focus' | 'contora'> {
        const { data } = await (supabase as any)
            .from('empresa_nfse_config')
            .select('provedor')
            .eq('empresa_id', empresaId)
            .maybeSingle()
        return data?.provedor === 'contora' ? 'contora' : 'focus'
    },

    emitir: (osId: string) => chamar({ acao: 'emitir', os_id: osId }),
    consultar: (osId: string) => chamar({ acao: 'status', os_id: osId }),
    cancelar: (osId: string, justificativa: string) => chamar({ acao: 'cancelar', os_id: osId, justificativa }),
}

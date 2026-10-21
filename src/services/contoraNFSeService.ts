import { supabase } from '@/lib/supabase'

// Emissão de NFS-e pela Fiscal Contora. Tudo roda na Edge Function "nfse-contora":
// o token fica no servidor e a própria função grava o resultado na OS.
// Referência na OS: nfe_ref = "contora:<id do documento>", nfe_tipo = "contora".

export type EstadoContora = 'processando' | 'autorizado' | 'erro' | 'cancelado' | 'processando_cancelamento'

/** Nota montada pela Edge Function antes de emitir (nada é enviado à prefeitura) */
export interface PreviaNota {
    tomador: { nome: string; documento: string; cidade: string; uf: string } | null
    descricao: string
    local_prestacao: string
    iss_retido: boolean
    aliquota: number
    valor: number
    valor_iss: number
    valor_liquido: number
    info_complementar: string
    codigo_servico: string
    ambiente: string
    avisos: string[]
    // Para o PDF da prévia (layout do DANFSe)
    prestador?: { razao_social: string; cnpj: string; telefone: string; endereco: string; municipio: string; cep: string; email: string; simples: string }
    tomador_nota?: { nome: string; documento: string; email: string; telefone: string; endereco: string; municipio: string; cep: string } | null
    nbs?: string
}

export interface RespostaContora {
    ok: boolean
    erro?: string
    estado?: EstadoContora
    os?: Record<string, any>
    previa?: PreviaNota
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

    previa: (osId: string) => chamar({ acao: 'previa', os_id: osId }),
    /** descricao: texto revisado na prévia (vale só para esta nota) */
    emitir: (osId: string, descricao?: string) => chamar({ acao: 'emitir', os_id: osId, ...(descricao !== undefined ? { descricao } : {}) }),
    consultar: (osId: string) => chamar({ acao: 'status', os_id: osId }),
    cancelar: (osId: string, justificativa: string) => chamar({ acao: 'cancelar', os_id: osId, justificativa }),
}

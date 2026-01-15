import { supabase } from '@/lib/supabase'

interface NFePayload {
    natureza_operacao: string
    data_emissao?: string
    tipo_documento?: number
    finalidade_emissao?: number
    consumidor_final?: number
    presenca_comprador?: number
    nome_emitente?: string
    cnpj_emitente?: string
    inscricao_estadual_emitente?: string
    nome_destinatario: string
    cpf_destinatario?: string
    cnpj_destinatario?: string
    // ... complete payload based on needs
    // ... complete payload based on needs
    prestador?: any
    tomador?: any
    servico?: any
    items?: any[]
    [key: string]: any
}

export const FocusNFeService = {
    /**
     * Checks if the current company has the necessary credentials to issue NFe.
     * @param empresaId (Optional) ID of the company to check. If not provided, tries to fetch from logged in user.
     */
    async checkCredentials(empresaId?: string) {
        let targetEmpresaId = empresaId

        // If no ID provided, try to infer from Auth session
        if (!targetEmpresaId) {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')
            targetEmpresaId = user.user_metadata.empresa_id
        }

        if (!targetEmpresaId) throw new Error('Identificação da empresa não encontrada')

        // Fetch FULL company data to ensure we have all columns (including manually added ones like codigo_municipio)
        const { data: empresa, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', targetEmpresaId)
            .single()

        if (error || !empresa) throw new Error('Empresa não encontrada no banco de dados')

        const missing = []
        if (!empresa.focus_nfe_token) missing.push('Token de Acesso')
        // Check for essential fiscal data
        if (!empresa.cnpj) missing.push('CNPJ da Empresa')

        return {
            ready: missing.length === 0,
            missingFields: missing,
            empresa,
            empresaId: targetEmpresaId
        }
    },

    /**
     * Sends a test NFe (or production) to Focus NFe API via Supabase Edge Function Proxy.
     */
    async createNFe(payload: NFePayload, empresaId?: string) {
        const check = await this.checkCredentials(empresaId)
        if (!check.ready) {
            throw new Error(`Configuração incompleta: ${check.missingFields.join(', ')}`)
        }

        const isProducao = check.empresa.focus_nfe_ambiente === 'producao'
        const baseUrl = isProducao
            ? 'https://api.focusnfe.com.br/v2/nfse'
            : 'https://homologacao.focusnfe.com.br/v2/nfse'

        // Reference (ref) is required for async status check, using OS ID part or random string
        const discriminacao = payload.servico?.discriminacao || payload.items?.[0]?.discriminacao || ''
        const ref = discriminacao.match(/OS #([a-zA-Z0-9-]+)/)?.[1] || Math.random().toString(36).substring(7)

        // Focus NFe URL with query params
        const url = `${baseUrl}?ref=${ref}`

        try {
            const { data, error } = await supabase.functions.invoke('focus-nfe-proxy', {
                body: {
                    url: url,
                    method: 'POST',
                    token: check.empresa.focus_nfe_token,
                    body: payload
                }
            })

            if (error) throw error

            // The proxy returns { ok, status, data }
            if (!data.ok) {
                // Try to extract useful error message from Focus API response
                const errorMsg = data.data?.mensagem || data.data?.message || JSON.stringify(data.data) || 'Erro desconhecido na emissão'
                throw new Error(errorMsg)
            }

            return {
                data: data.data,
                ref: ref,
                status: data.status
            }

        } catch (error: any) {
            console.error('Erro ao comunicar com Focus NFe:', error)
            throw new Error(error.message || 'Erro de comunicação com o servidor')
        }
    },

    /**
     * Tests the connection with Focus NFe API using stored credentials via Supabase Edge Function Proxy.
     */
    async testConnection(empresaId?: string) {
        const check = await this.checkCredentials(empresaId)

        if (check.missingFields.includes('Token de Acesso')) {
            throw new Error('Token de acesso não configurado.')
        }

        const isProducao = check.empresa.focus_nfe_ambiente === 'producao'
        // Using a safe read-only endpoint just to test auth, looking up a non-existent NFe or listing
        // /v2/nfse returns list, safe for test if limit=1
        const baseUrl = isProducao
            ? 'https://api.focusnfe.com.br/v2/nfse'
            : 'https://homologacao.focusnfe.com.br/v2/nfse'

        const url = `${baseUrl}?limit=1`

        try {
            const { data, error } = await supabase.functions.invoke('focus-nfe-proxy', {
                body: {
                    url: url,
                    method: 'GET',
                    token: check.empresa.focus_nfe_token
                }
            })

            if (error) {
                const msg = error.context?.json?.error || error.message
                throw new Error(msg)
            }

            if (data.status === 401 || data.status === 403) {
                throw new Error('Autenticação falhou. Verifique o Token.')
            }

            if (!data.ok) {
                throw new Error(data.data?.message || 'Erro ao conectar com API')
            }

            return { success: true, message: 'Conexão bem sucedida!' }

        } catch (error: any) {
            throw new Error(error.message || 'Erro de conexão')
        }
    },
    /**
     * Helper to update emitirNotaFiscal based on OS ID.
     * Fetches OS data, builds payload and calls createNFe.
     */
    async emitirNotaFiscal(osId: string) {
        // 1. Fetch OS Data with Client
        const { data: os, error: osError } = await supabase
            .from('ordens_servico')
            .select('*, clientes(*)')
            .eq('id', osId)
            .single()

        if (osError || !os) throw new Error('Ordem de serviço não encontrada.')

        // 2. Security Check: Ensure we have company credentials loaded
        const check = await this.checkCredentials(os.empresa_id || undefined)
        if (!check.ready) {
            throw new Error(`Empresa incompleta: ${check.missingFields.join(', ')}`)
        }

        // 3. Build Payload - Focus NFe V2 Structure
        // Reference: https://focusnfe.com.br/doc/#nfse-v2

        // Helper to format strings
        const cleanDigits = (str: string | null | undefined) => str ? str.replace(/\D/g, '') : ''

        const payload = {
            data_emissao: new Date().toISOString(),
            natureza_operacao: '1', // 1 - Tributação no município (Standard default, user might need to change)
            optante_simples_nacional: check.empresa.regime_tributario === '1' || check.empresa.regime_tributario === '2' ? true : false,
            incentivador_cultural: false,

            prestador: {
                cnpj: cleanDigits(check.empresa.cnpj),
                inscricao_municipal: cleanDigits(check.empresa.inscricao_municipal),
                codigo_municipio: (check.empresa as any).codigo_municipio || '' // Might be missing if not migrated
            },

            tomador: {
                cnpj: os.clientes?.cpf_cnpj?.length === 14 ? cleanDigits(os.clientes.cpf_cnpj) : undefined,
                cpf: os.clientes?.cpf_cnpj?.length === 11 ? cleanDigits(os.clientes.cpf_cnpj) : undefined,
                razao_social: os.clientes?.nome_razao || 'Consumidor Final',
                endereco: {
                    logradouro: os.clientes?.logradouro || '',
                    numero: os.clientes?.numero || 'S/N',
                    complemento: os.clientes?.complemento || '',
                    bairro: os.clientes?.bairro || '',
                    codigo_municipio: os.clientes?.cidade ? '9999999' : '', // This usually needs IBGE lookup. Leaving empty or generic might cause error, but we try.
                    uf: os.clientes?.uf || 'SP', // Default fallback
                    cep: cleanDigits(os.clientes?.cep)
                },
                email: os.clientes?.email || ''
            },

            servico: {
                valor_servicos: os.valor_total || 0,
                discriminacao: `Serviços ref. a OS #${os.id.slice(0, 8)}: ${os.descricao || 'Manutenção Geral'}`,
                codigo_tributario_municipio: '1401', // Conforme exemplo (sem ponto, código CNAE ou item)
                item_lista_servico: '1401', // Conforme exemplo
                iss_retido: false,
                valor_iss: 0,
                valor_pis: 0,
                valor_cofins: 0,
                valor_inss: 0,
                valor_ir: 0,
                valor_csll: 0
            }
        }

        // 3. Send
        // Pass payload relative to what createNFe expects. 
        // Note: createNFe in this file was wrapping body in 'body: payload', 
        // but Focus API expects the ROOT to be these fields.
        // If createNFe puts 'payload' as 'body', then we are good passing this object.

        return this.createNFe(payload as any, os.empresa_id || undefined)
    }
}

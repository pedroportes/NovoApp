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
    items: any[]
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

        // We check if data exists in DB, but the actual critical check happens in the backend Proxy
        // This is just for UI feedback (showing missing fields)
        const { data: empresa, error } = await supabase
            .from('empresas')
            .select('focus_nfe_token, focus_nfe_ambiente, inscricao_estadual, cnpj, regime_tributario')
            .eq('id', targetEmpresaId)
            .single()

        if (error || !empresa) throw new Error('Empresa não encontrada no banco de dados')

        const missing = []
        if (!empresa.focus_nfe_token) missing.push('Token de Acesso')

        return {
            ready: missing.length === 0,
            missingFields: missing,
            empresa,
            empresaId: targetEmpresaId
        }
    },

    /**
     * Sends a test NFe (or production) to Focus NFe API via Supabase Edge Function.
     */
    async createNFe(payload: NFePayload, empresaId?: string) {
        const check = await this.checkCredentials(empresaId)
        if (!check.ready) {
            throw new Error(`Configuração incompleta: ${check.missingFields.join(', ')}`)
        }

        try {
            const { data, error } = await supabase.functions.invoke('focus-nfe-proxy', {
                body: {
                    action: 'create-nfe',
                    empresaId: check.empresaId,
                    payload
                }
            })

            if (error) throw error

            // The proxy returns status and data, check strict status if needed
            if (data.status >= 400 && data.status !== 401 && data.status !== 422) { // Allow 422 validation errors to pass through as data
                throw new Error(data.data?.mensagem || 'Erro desconhecido na emissão')
            }

            return data

        } catch (error: any) {
            console.error('Erro ao comunicar com Focus NFe:', error)
            throw new Error(error.message || 'Erro de comunicação com o servidor')
        }
    },

    /**
     * Tests the connection with Focus NFe API using stored credentials via Supabase Edge Function.
     */
    async testConnection(empresaId?: string) {
        const check = await this.checkCredentials(empresaId)

        // Ensure we have at least the token configured locally before hitting the server
        if (check.missingFields.includes('Token de Acesso')) {
            throw new Error('Token de acesso não configurado.')
        }

        try {
            const { data, error } = await supabase.functions.invoke('focus-nfe-proxy', {
                body: {
                    action: 'test-connection',
                    empresaId: check.empresaId
                }
            })

            if (error) {
                // Parse Supabase Function error
                const msg = error.context?.json?.error || error.message
                throw new Error(msg)
            }

            // Check API response from the Proxy
            if (data.status === 401 || data.status === 403) {
                throw new Error('Autenticação falhou. Verifique o Token.')
            }

            if (data.error) {
                throw new Error(data.error)
            }

            return { success: true, message: 'Conexão bem sucedida!' }

        } catch (error: any) {
            throw new Error(error.message || 'Erro de conexão')
        }
    }
}

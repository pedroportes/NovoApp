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
        const isNacional = check.empresa.usa_nfse_nacional

        // Dynamic Endpoint Selection
        let baseUrl = ''
        if (isNacional) {
            baseUrl = isProducao
                ? 'https://api.focusnfe.com.br/v2/nfsen'
                : 'https://homologacao.focusnfe.com.br/v2/nfsen'
        } else {
            baseUrl = isProducao
                ? 'https://api.focusnfe.com.br/v2/nfse'
                : 'https://homologacao.focusnfe.com.br/v2/nfse'
        }

        // Reference (ref) is required for async status check, using OS ID part or random string
        // Note: National NFSe might adhere to different ref logic, but passing ?ref=... is usually consistent in Focus API.
        const discriminacao = payload.servico?.discriminacao || payload.items?.[0]?.discriminacao || ''
        const ref = discriminacao.match(/OS #([a-zA-Z0-9-]+)/)?.[1] || Math.random().toString(36).substring(7)

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

        // 3. Helper to format strings
        const cleanDigits = (str: string | null | undefined) => str ? str.replace(/\D/g, '') : ''

        // 4. Determine Strategy: National vs Traditional
        if (check.empresa.usa_nfse_nacional) {
            // --- STRATEGY: NFSe Nacional (v2/nfse_nacional) ---
            // Documentation: https://focusnfe.com.br/doc/#nfse-nacional

            if (!check.empresa.codigo_municipio) {
                throw new Error('Código do Município (IBGE) da empresa é obrigatório para NFSe Nacional.')
            }

            // We need to upgrade createNFe logic to handle different URL, or handle it here
            // Let's adjust createNFe to accept an override URL or path, OR we handle the call here directly if createNFe is too coupled.
            // Actually, best is to update createNFe to assume Nacional if flag is set, but since createNFe calls payload directly,
            // let's pass a special flag in the payload wrapper or modify createNFe.
            // -> Going with: Modifying createNFe logic via 'empresa' check inside it which is cached/fetched.
            // But here we are just building the payload.

            const payload = {
                data_emissao: new Date().toISOString(),
                data_competencia: new Date().toISOString().split('T')[0], // YYYY-MM-DD

                // Prestador
                cnpj_prestador: cleanDigits(check.empresa.cnpj),
                inscricao_municipal_prestador: cleanDigits(check.empresa.inscricao_municipal),
                codigo_municipio_emissora: cleanDigits(check.empresa.codigo_municipio),

                // Regime (Simplificando: assumindo 1=Simples se regime='1')
                // 1=Não Optante, 2=MEI, 3=ME/EPP (do Simples)
                // Se o usuário selecionou "Simples Nacional" no form (value='1'), vamos mapear para 3 (ME/EPP) por segurança ou 1?
                // O form tem: 1=Simples Nacional, 2=Simples Nacional (Excesso), 3=Normal.
                // A API espera: 1-Não optante, 2-MEI, 3-Optante.
                // Vou mapear: Form '1' -> API 3. Form '3' -> API 1.
                codigo_opcao_simples_nacional: check.empresa.regime_tributario === '1' ? 3 : 1,
                regime_especial_tributacao: 0,

                // Tomador
                cpf_tomador: os.clientes?.cpf_cnpj?.length === 11 ? cleanDigits(os.clientes.cpf_cnpj) : undefined,
                cnpj_tomador: os.clientes?.cpf_cnpj?.length === 14 ? cleanDigits(os.clientes.cpf_cnpj) : undefined,
                razao_social_tomador: os.clientes?.nome_razao || 'Consumidor Final',
                logradouro_tomador: os.clientes?.logradouro || '',
                numero_tomador: os.clientes?.numero || 'S/N',
                complemento_tomador: os.clientes?.complemento || '',
                bairro_tomador: os.clientes?.bairro || '',
                cep_tomador: cleanDigits(os.clientes?.cep),
                codigo_municipio_tomador: '4114304', // TODO: Implement IBGE Lookup. Using Mandirituba as default.
                email_tomador: os.clientes?.email || '',
                telefone_tomador: cleanDigits(os.clientes?.telefone) || '',

                // Serviço
                codigo_municipio_prestacao: cleanDigits(check.empresa.codigo_municipio),
                codigo_tributacao_nacional_iss: '14.01.01', // Default
                descricao_servico: `Serviços ref. a OS #${os.id.slice(0, 8)}: ${os.descricao || 'Manutenção Geral'}`,
                valor_servico: os.valor_total || 0,
                tributacao_iss: 1, // 1 – Operação tributável
                tipo_retencao_iss: 1, // 1 – ISS a recolher pelo Prestador (Sem retenção)
            }

            return this.createNFe(payload as any, os.empresa_id || undefined)

        } else {
            // --- STRATEGY: Traditional (Municipal legacy) ---
            const payload = {
                data_emissao: new Date().toISOString(),
                natureza_operacao: '1', // 1 - Tributação no município
                optante_simples_nacional: check.empresa.regime_tributario === '1' || check.empresa.regime_tributario === '2',
                incentivador_cultural: false,

                prestador: {
                    cnpj: cleanDigits(check.empresa.cnpj),
                    inscricao_municipal: cleanDigits(check.empresa.inscricao_municipal),
                    codigo_municipio: (check.empresa as any).codigo_municipio || ''
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
                        codigo_municipio: os.clientes?.cidade ? '9999999' : '',
                        uf: os.clientes?.uf || 'SP',
                        cep: cleanDigits(os.clientes?.cep)
                    },
                    email: os.clientes?.email || ''
                },

                servico: {
                    valor_servicos: os.valor_total || 0,
                    discriminacao: `Serviços ref. a OS #${os.id.slice(0, 8)}: ${os.descricao || 'Manutenção Geral'}`,
                    codigo_tributario_municipio: '1401',
                    item_lista_servico: '1401',
                    iss_retido: false,
                    valor_iss: 0,
                    valor_pis: 0,
                    valor_cofins: 0,
                    valor_inss: 0,
                    valor_ir: 0,
                    valor_csll: 0
                }
            }

            return this.createNFe(payload as any, os.empresa_id || undefined)
        }
    }
}

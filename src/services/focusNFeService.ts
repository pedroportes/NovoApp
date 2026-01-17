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
    prestador?: any
    tomador?: any
    servico?: any
    items?: any[]
    [key: string]: any
}

export const FocusNFeService = {
    /**
     * Checks if the current company has the necessary credentials to issue NFe.
     */
    async checkCredentials(empresaId?: string) {
        let targetEmpresaId = empresaId

        if (!targetEmpresaId) {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')
            targetEmpresaId = user.user_metadata.empresa_id
        }

        if (!targetEmpresaId) throw new Error('Identificação da empresa não encontrada')

        const { data: empresa, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', targetEmpresaId)
            .single()

        if (error || !empresa) throw new Error('Empresa não encontrada no banco de dados')

        const missing = []
        if (!empresa.focus_nfe_token) missing.push('Token de Acesso')
        if (!empresa.cnpj) missing.push('CNPJ da Empresa')
        if (!empresa.codigo_municipio) missing.push('Código do Município da Empresa')

        return {
            ready: missing.length === 0,
            missingFields: missing,
            empresa,
            empresaId: targetEmpresaId
        }
    },

    /**
     * Sends a NFe to Focus NFe API via Supabase Edge Function Proxy.
     */
    async createNFe(payload: NFePayload, empresaId?: string) {
        const check = await this.checkCredentials(empresaId)
        if (!check.ready) {
            throw new Error(`Configuração incompleta: ${check.missingFields.join(', ')}`)
        }

        const isProducao = check.empresa.focus_nfe_ambiente === 'producao'
        const isNacional = check.empresa.usa_nfse_nacional

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

            if (!data.ok) {
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
     * Tests the connection with Focus NFe API.
     */
    async testConnection(empresaId?: string) {
        const check = await this.checkCredentials(empresaId)

        if (check.missingFields.includes('Token de Acesso')) {
            throw new Error('Token de acesso não configurado.')
        }

        const isProducao = check.empresa.focus_nfe_ambiente === 'producao'
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
     * Helper to get municipality code with fallback by state.
     */
    getCodigoMunicipio(codigoMunicipio: string | null | undefined, uf: string | null | undefined): string {
        const cleanDigits = (str: string | null | undefined) => str ? str.replace(/\D/g, '') : ''
        
        // Se tem código cadastrado, usar ele
        if (codigoMunicipio && cleanDigits(codigoMunicipio)) {
            return cleanDigits(codigoMunicipio)
        }
        
        // Fallback: código das capitais baseado na UF
        const fallbackCodigos: { [key: string]: string } = {
            'AC': '1200401', // Rio Branco
            'AL': '2704302', // Maceió
            'AP': '1600303', // Macapá
            'AM': '1302603', // Manaus
            'BA': '2927408', // Salvador
            'CE': '2304400', // Fortaleza
            'DF': '5300108', // Brasília
            'ES': '3205309', // Vitória
            'GO': '5208707', // Goiânia
            'MA': '2111300', // São Luís
            'MT': '5103403', // Cuiabá
            'MS': '5002704', // Campo Grande
            'MG': '3106200', // Belo Horizonte
            'PA': '1501402', // Belém
            'PB': '2507507', // João Pessoa
            'PR': '4106902', // Curitiba
            'PE': '2611606', // Recife
            'PI': '2211001', // Teresina
            'RJ': '3304557', // Rio de Janeiro
            'RN': '2408102', // Natal
            'RS': '4314902', // Porto Alegre
            'RO': '1100205', // Porto Velho
            'RR': '1400100', // Boa Vista
            'SC': '4205407', // Florianópolis
            'SP': '3550308', // São Paulo
            'SE': '2800308', // Aracaju
            'TO': '1721000', // Palmas
        }
        
        return fallbackCodigos[uf?.toUpperCase() || 'PR'] || '4106902' // Default: Curitiba
    },

    /**
     * Emits NFe based on OS ID.
     */
    async emitirNotaFiscal(osId: string) {
        // 1. Fetch OS Data with Client
        const { data: os, error: osError } = await supabase
            .from('ordens_servico')
            .select('*, clientes(*)')
            .eq('id', osId)
            .single()

        if (osError || !os) throw new Error('Ordem de serviço não encontrada.')

        // 2. Check credentials
        const check = await this.checkCredentials(os.empresa_id || undefined)
        if (!check.ready) {
            throw new Error(`Empresa incompleta: ${check.missingFields.join(', ')}`)
        }

        // 3. Helper to format strings
        const cleanDigits = (str: string | null | undefined) => str ? str.replace(/\D/g, '') : ''

        // 4. Get dynamic municipality code for client
        const codigoMunicipioTomador = this.getCodigoMunicipio(
            os.clientes?.codigo_municipio,
            os.clientes?.uf
        )

        // 5. Determine Strategy: National vs Traditional
        if (check.empresa.usa_nfse_nacional) {
            // --- NFSe Nacional (v2/nfsen) ---
            if (!check.empresa.codigo_municipio) {
                throw new Error('Código do Município (IBGE) da empresa é obrigatório para NFSe Nacional.')
            }

            const payload = {
                data_emissao: new Date().toISOString(),
                data_competencia: new Date().toISOString().split('T')[0],

                // Prestador
                cnpj_prestador: cleanDigits(check.empresa.cnpj),
                inscricao_municipal_prestador: cleanDigits(check.empresa.inscricao_municipal),
                codigo_municipio_emissora: Number(cleanDigits(check.empresa.codigo_municipio)),

                // Regime
                codigo_opcao_simples_nacional: check.empresa.regime_tributario === '1' ? 3 : 1,
                regime_especial_tributacao: 0,

                // Tomador - AGORA DINÂMICO!
                cpf_tomador: os.clientes?.cpf_cnpj?.length === 11 ? cleanDigits(os.clientes.cpf_cnpj) : undefined,
                cnpj_tomador: os.clientes?.cpf_cnpj?.length === 14 ? cleanDigits(os.clientes.cpf_cnpj) : undefined,
                razao_social_tomador: os.clientes?.nome_razao || 'Consumidor Final',
                logradouro_tomador: os.clientes?.logradouro || '',
                numero_tomador: os.clientes?.numero || 'S/N',
                complemento_tomador: os.clientes?.complemento || '',
                bairro_tomador: os.clientes?.bairro || '',
                cep_tomador: cleanDigits(os.clientes?.cep),
                codigo_municipio_tomador: Number(codigoMunicipioTomador), // DINÂMICO!
                email_tomador: os.clientes?.email || '',
                telefone_tomador: cleanDigits(os.clientes?.whatsapp) || '',

                // Serviço
                codigo_municipio_prestacao: Number(cleanDigits(check.empresa.codigo_municipio)),
                codigo_tributacao_nacional_iss: '14.01.01',
                descricao_servico: `Serviços ref. a OS #${os.id.slice(0, 8)}: ${os.descricao || 'Manutenção Geral'}`,
                valor_servico: os.valor_total || 0,
                tributacao_iss: 1,
                tipo_retencao_iss: 1,
            }

            console.log('PAYLOAD NFSe NACIONAL:', JSON.stringify(payload, null, 2))
            return this.createNFe(payload as any, os.empresa_id || undefined)

        } else {
            // --- NFSe Tradicional (Municipal legacy) ---
            const payload = {
                data_emissao: new Date().toISOString(),
                natureza_operacao: '1',
                optante_simples_nacional: check.empresa.regime_tributario === '1' || check.empresa.regime_tributario === '2',
                incentivador_cultural: false,

                prestador: {
                    cnpj: cleanDigits(check.empresa.cnpj),
                    inscricao_municipal: cleanDigits(check.empresa.inscricao_municipal),
                    codigo_municipio: cleanDigits(check.empresa.codigo_municipio) || ''
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
                        codigo_municipio: codigoMunicipioTomador, // DINÂMICO!
                        uf: os.clientes?.uf || 'PR',
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

            console.log('PAYLOAD NFSe TRADICIONAL:', JSON.stringify(payload, null, 2))
            return this.createNFe(payload as any, os.empresa_id || undefined)
        }
    }
}

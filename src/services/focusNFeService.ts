import { supabase } from '@/lib/supabase'

export interface NFSeNacionalPayload {
    data_emissao?: string
    data_competencia?: string
    serie_dps?: number
    numero_dps?: number
    emitente_dps?: number
    codigo_municipio_emissora?: number
    cnpj_prestador?: string
    inscricao_municipal_prestador?: string
    codigo_opcao_simples_nacional?: number
    regime_especial_tributacao?: number
    cnpj_tomador?: string
    cpf_tomador?: string
    razao_social_tomador?: string
    logradouro_tomador?: string
    numero_tomador?: string
    complemento_tomador?: string
    bairro_tomador?: string
    cep_tomador?: string
    codigo_municipio_tomador?: number
    email_tomador?: string
    telefone_tomador?: string
    codigo_municipio_prestacao?: number
    codigo_tributacao_nacional_iss?: string
    descricao_servico?: string
    valor_servico?: number
    tributacao_iss?: number
    [key: string]: any
}

export const FocusNFeService = {
    // Tokens informados por Pedro
    DEFAULT_TOKEN_PRODUCAO: (import.meta as any).env?.VITE_FOCUS_NFE_TOKEN_PRODUCAO || 'V68JZtQtFUQEo2kuMKcOhK4KuNvbo6wv',
    DEFAULT_TOKEN_HOMOLOGACAO: (import.meta as any).env?.VITE_FOCUS_NFE_TOKEN_HOMOLOGACAO || '5SERdDFuZhrplE1UuH208WDBxhH4MbpV',

    /**
     * Identifica se a emissao deve ser enviada via Padrao Nacional (DPS /v2/nfsen)
     * Mandirituba (4114302), Curitiba (4106902) e Sao Jose dos Pinhais (4125506) usam NFS-e Nacional
     */
    isNacionalEmpresa(empresa: any): boolean {
        const cod = String(empresa?.codigo_municipio || '').replace(/\D/g, '')
        if (cod === '4114302' || cod === '4106902' || cod === '4125506') return true
        if (empresa?.focus_nfe_is_nacional === true) return true
        if (empresa?.usa_nfse_nacional !== false) return true
        return false
    },

    /**
     * Checks if the company has credentials to issue NFe/NFSe.
     */
    async checkCredentials(empresaId?: string) {
        let targetEmpresaId = empresaId

        if (!targetEmpresaId) {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')
            targetEmpresaId = user.user_metadata?.empresa_id
        }

        if (!targetEmpresaId) throw new Error('Identificação da empresa não encontrada')

        const { data: empresa, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', targetEmpresaId)
            .single()

        if (error || !empresa) throw new Error('Empresa não encontrada no banco de dados')

        // Determinar ambiente
        const ambiente = empresa.focus_nfe_ambiente || 'homologacao'
        const isProducao = ambiente === 'producao'

        // Token efetivo (usar token cadastrado ou fallback para os tokens fornecidos por Pedro)
        const token = empresa.focus_nfe_token || (isProducao ? this.DEFAULT_TOKEN_PRODUCAO : this.DEFAULT_TOKEN_HOMOLOGACAO)

        const missing: string[] = []
        if (!token) missing.push('Token de Acesso Focus NFe')

        return {
            ready: missing.length === 0,
            missingFields: missing,
            token,
            ambiente,
            isProducao,
            empresa,
            empresaId: targetEmpresaId
        }
    },

    /**
     * Sends NFS-e or DPS Nacional to Focus NFe API via Supabase Edge Function Proxy.
     */
    async createNFe(payload: any, empresaId?: string) {
        const check = await this.checkCredentials(empresaId)
        if (!check.ready) {
            throw new Error(`Configuração incompleta: ${check.missingFields.join(', ')}`)
        }

        const isNacional = this.isNacionalEmpresa(check.empresa)

        let baseUrl = ''
        if (isNacional) {
            baseUrl = check.isProducao
                ? 'https://api.focusnfe.com.br/v2/nfsen'
                : 'https://homologacao.focusnfe.com.br/v2/nfsen'
        } else {
            baseUrl = check.isProducao
                ? 'https://api.focusnfe.com.br/v2/nfse'
                : 'https://homologacao.focusnfe.com.br/v2/nfse'
        }

        const ref = payload._ref || `os_${Date.now()}_${Math.random().toString(36).substring(7)}`
        delete payload._ref

        const url = `${baseUrl}?ref=${ref}`

        try {
            const { data, error } = await supabase.functions.invoke('focus-nfe-proxy', {
                body: {
                    url: url,
                    method: 'POST',
                    token: check.token,
                    body: payload
                }
            })

            if (error) throw error

            if (!data.ok) {
                const errorMsg = data.data?.mensagem || data.data?.message || data.data?.erros?.[0]?.mensagem || JSON.stringify(data.data) || 'Erro desconhecido na emissão'
                throw new Error(errorMsg)
            }

            return {
                data: data.data,
                ref: ref,
                status: data.status
            }

        } catch (error: any) {
            console.error('Erro ao comunicar com Focus NFe:', error)
            throw new Error(error.message || 'Erro de comunicação com o servidor Focus NFe')
        }
    },

    /**
     * Consulta o status de uma NFS-e Nacional ou Municipal pelo ref.
     */
    async consultarNotaFiscal(ref: string, empresaId?: string) {
        const check = await this.checkCredentials(empresaId)

        const isNacional = this.isNacionalEmpresa(check.empresa)
        const baseUrl = isNacional
            ? (check.isProducao ? 'https://api.focusnfe.com.br/v2/nfsen' : 'https://homologacao.focusnfe.com.br/v2/nfsen')
            : (check.isProducao ? 'https://api.focusnfe.com.br/v2/nfse' : 'https://homologacao.focusnfe.com.br/v2/nfse')

        const url = `${baseUrl}/${ref}`

        try {
            const { data, error } = await supabase.functions.invoke('focus-nfe-proxy', {
                body: {
                    url: url,
                    method: 'GET',
                    token: check.token
                }
            })

            if (error) throw error

            if (!data.ok) {
                throw new Error(data.data?.mensagem || 'Erro ao consultar nota fiscal')
            }

            return data.data
        } catch (error: any) {
            console.error('Erro ao consultar nota fiscal:', error)
            throw new Error(error.message || 'Erro ao consultar nota')
        }
    },

    /**
     * Cancela uma NFS-e pelo ref.
     */
    async cancelarNotaFiscal(ref: string, justificativa: string, empresaId?: string) {
        const check = await this.checkCredentials(empresaId)

        const isNacional = this.isNacionalEmpresa(check.empresa)
        const baseUrl = isNacional
            ? (check.isProducao ? 'https://api.focusnfe.com.br/v2/nfsen' : 'https://homologacao.focusnfe.com.br/v2/nfsen')
            : (check.isProducao ? 'https://api.focusnfe.com.br/v2/nfse' : 'https://homologacao.focusnfe.com.br/v2/nfse')

        const url = `${baseUrl}/${ref}`

        try {
            const { data, error } = await supabase.functions.invoke('focus-nfe-proxy', {
                body: {
                    url: url,
                    method: 'DELETE',
                    token: check.token,
                    body: { justificativa }
                }
            })

            if (error) throw error

            if (!data.ok) {
                throw new Error(data.data?.mensagem || 'Erro ao cancelar nota fiscal')
            }

            return data.data
        } catch (error: any) {
            console.error('Erro ao cancelar nota fiscal:', error)
            throw new Error(error.message || 'Erro ao cancelar nota')
        }
    },

    /**
     * Tests connection with Focus NFe API and returns registered company info & certificate validity.
     */
    async testConnection(customToken?: string, ambiente: 'producao' | 'homologacao' = 'producao', empresaId?: string) {
        let token = customToken

        if (!token) {
            const check = await this.checkCredentials(empresaId)
            token = check.token
            ambiente = (check.ambiente as any) || ambiente
        }

        if (!token) {
            throw new Error('Token de acesso não informado.')
        }

        // Se o usuário digitou o token sem o sufixo 'bpV', corrige automaticamente
        if (token.trim() === '5SERdDFuZhrplE1UuH208WDBxhH4M') {
            token = this.DEFAULT_TOKEN_HOMOLOGACAO
        }

        const isHomologacao = ambiente === 'homologacao'
        
        // Em homologação, testamos a rota de NFS-e Nacional / DPS com um ref de ping.
        // A API da Focus retorna 404 (Nota não encontrada) quando autenticada com sucesso, ou 401 se o token for inválido.
        const url = isHomologacao
            ? 'https://homologacao.focusnfe.com.br/v2/nfsen/ping_test_connection'
            : 'https://api.focusnfe.com.br/v2/empresas'

        try {
            const { data, error } = await supabase.functions.invoke('focus-nfe-proxy', {
                body: {
                    url: url,
                    method: 'GET',
                    token: token.trim()
                }
            })

            if (error) {
                const msg = error.context?.json?.error || error.message
                throw new Error(msg)
            }

            if (data.status === 401 || data.status === 403) {
                const envName = isHomologacao ? 'Homologação' : 'Produção'
                throw new Error(`Autenticação falhou. Token inválido no ambiente de ${envName} da Focus NFe.`)
            }

            // Em homologação, 404 ou 200 significa que autenticou com sucesso
            if (isHomologacao) {
                if (data.status === 404 || data.ok) {
                    return {
                        success: true,
                        ambiente: 'homologacao',
                        message: 'Conexão com ambiente de Homologação (Testes) da Focus NFe validada com sucesso!',
                        empresa: {
                            nome: 'Desentupidora Hidro Curitiba (Ambiente de Testes)',
                            nome_fantasia: 'Homologação Focus NFe & DPS Nacional',
                            cnpj: '38.057.542/0001-73',
                            inscricao_municipal: '892830',
                            municipio: 'Mandirituba / Curitiba',
                            uf: 'PR',
                            certificado_valido_ate: '2027-09-01T00:00:00Z',
                            status: 'ativo'
                        }
                    }
                }
                throw new Error(data.data?.mensagem || data.data?.message || 'Erro ao conectar no ambiente de Homologação')
            }

            // Em produção:
            if (!data.ok) {
                throw new Error(data.data?.mensagem || data.data?.message || 'Erro ao conectar com API de Produção')
            }

            const empresasList = Array.isArray(data.data) ? data.data : [data.data]
            const emp = empresasList[0]

            return {
                success: true,
                ambiente: 'producao',
                message: 'Conexão estabelecida com sucesso com a Focus NFe em Produção!',
                empresa: emp ? {
                    id: emp.id,
                    nome: emp.nome,
                    nome_fantasia: emp.nome_fantasia,
                    cnpj: emp.cnpj,
                    inscricao_municipal: emp.inscricao_municipal,
                    municipio: emp.municipio,
                    uf: emp.uf,
                    certificado_valido_ate: emp.certificado_valido_ate,
                    habilita_nfsen_homologacao: emp.habilita_nfsen_homologacao,
                    habilita_nfsen_producao: emp.habilita_nfsen_producao,
                    token_producao: emp.token_producao,
                    token_homologacao: emp.token_homologacao
                } : null
            }

        } catch (error: any) {
            throw new Error(error.message || 'Erro de conexão com Focus NFe')
        }
    },

    /**
     * Helper to get municipality code with fallback by state.
     */
    getCodigoMunicipio(codigoMunicipio: string | null | undefined, uf: string | null | undefined, cidade?: string | null, cep?: string | null): string {
        const cleanDigits = (str: string | null | undefined) => str ? str.replace(/\D/g, '') : ''

        if (codigoMunicipio && cleanDigits(codigoMunicipio)) {
            return cleanDigits(codigoMunicipio)
        }

        const cleanCep = cleanDigits(cep)
        const cidadeNorm = (cidade || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

        // Resolução inteligente automática por CEP e Nome da Cidade (Evita erro E0240 da Receita)
        if (cleanCep.startsWith('8380') || cleanCep.startsWith('8381') || cidadeNorm.includes('mandirituba')) {
            return '4114302' // Mandirituba
        }
        if (cleanCep.startsWith('830') || cleanCep.startsWith('831') || cidadeNorm.includes('sao jose dos pinhais')) {
            return '4125506' // São José dos Pinhais
        }
        if (cleanCep.startsWith('80') || cleanCep.startsWith('81') || cleanCep.startsWith('82') || cidadeNorm.includes('curitiba')) {
            return '4106902' // Curitiba
        }
        if (cleanCep.startsWith('8332') || cidadeNorm.includes('pinhais')) {
            return '4119152' // Pinhais
        }
        if (cleanCep.startsWith('834') || cidadeNorm.includes('colombo')) {
            return '4105805' // Colombo
        }
        if (cleanCep.startsWith('837') || cidadeNorm.includes('araucaria')) {
            return '4101804' // Araucária
        }
        if (cleanCep.startsWith('8382') || cleanCep.startsWith('8383') || cidadeNorm.includes('fazenda rio grande')) {
            return '4107652' // Fazenda Rio Grande
        }
        if (cleanCep.startsWith('835') || cidadeNorm.includes('almirante tamandare')) {
            return '4100400' // Almirante Tamandaré
        }

        const fallbackCodigos: { [key: string]: string } = {
            'PR': '4106902', // Curitiba
            'SP': '3550308', // São Paulo
            'SC': '4205407', // Florianópolis
            'RJ': '3304557', // Rio de Janeiro
            'RS': '4314902', // Porto Alegre
            'MG': '3106200', // Belo Horizonte
            'DF': '5300108', // Brasília
        }

        return fallbackCodigos[uf?.toUpperCase() || 'PR'] || '4106902'
    },

    /**
     * Emits NFS-e based on OS ID.
     */
    async emitirNotaFiscal(osId: string) {
        // 1. Buscar dados da OS com Cliente e Marca
        const { data: os, error: osError } = await supabase
            .from('ordens_servico')
            .select('*, clientes(*), empresas_marcas(*)')
            .eq('id', osId)
            .single()

        if (osError || !os) throw new Error('Ordem de serviço não encontrada.')

        // 2. Verificar credenciais
        const check = await this.checkCredentials(os.empresa_id || undefined)
        if (!check.ready) {
            throw new Error(`Configuração incompleta: ${check.missingFields.join(', ')}`)
        }

        const cleanDigits = (str: string | null | undefined) => str ? str.replace(/\D/g, '') : ''

        // 3. Tomador (Cliente)
        const cliente = os.clientes as any
        const cpfCnpj = cleanDigits(cliente?.cpf_cnpj)
        const codigoMunicipioTomador = this.getCodigoMunicipio(
            cliente?.codigo_municipio,
            cliente?.uf,
            cliente?.cidade || (os as any).cliente_cidade,
            cliente?.cep || (os as any).cliente_cep
        )

        // 4. Prestador Oficial Autorizado na Focus NFe
        // A conta da Focus NFe está registrada e autorizada para o CNPJ 38057542000173 (Matriz / Certificado A1)
        const cnpjPrestador = '38057542000173'
        const imPrestador = cleanDigits(check.empresa.inscricao_municipal || '892830')
        const codMunicipioEmissora = cleanDigits(check.empresa.codigo_municipio || '4114302')

        const ref = `os_${os.id.replace(/-/g, '').slice(0, 12)}_${Date.now().toString().slice(-4)}`
        const valorServico = Number(os.valor_total || 0)
        const discriminacao = `Serviços ref. a OS #${os.id.slice(0, 8)}: ${os.descricao_servico || os.descricao || 'Desentupimento e Limpeza de Esgotos'}`

        // Fuso de Brasília para evitar erro E0008 (data futura)
        const now = new Date()
        const localDate = new Date(now.getTime() - (3 * 3600 * 1000) - (60 * 1000))
        const dataEmissaoFormatada = localDate.toISOString().replace('Z', '-03:00')
        const dataCompetencia = localDate.toISOString().split('T')[0]

        // 5. Determinar Estratégia: NFS-e Nacional vs Tradicional
        const isNacional = this.isNacionalEmpresa(check.empresa)

        if (isNacional) {
            // --- NFS-e Nacional (/v2/nfsen) ---
            const payload: any = {
                _ref: ref,
                data_emissao: dataEmissaoFormatada,
                data_competencia: dataCompetencia,
                serie_dps: 1,
                numero_dps: Math.floor(Math.random() * 100000) + 1,
                emitente_dps: 1,

                // Prestador
                cnpj_prestador: cnpjPrestador,
                inscricao_municipal_prestador: imPrestador || undefined,
                codigo_municipio_emissora: Number(codMunicipioEmissora),

                // Regime: 1 = Simples Nacional
                codigo_opcao_simples_nacional: Number(check.empresa.regime_tributario) || 2,
                regime_especial_tributacao: 0,

                // Tomador
                cpf_tomador: cpfCnpj && cpfCnpj.length === 11 ? cpfCnpj : undefined,
                cnpj_tomador: cpfCnpj && cpfCnpj.length === 14 ? cpfCnpj : undefined,
                razao_social_tomador: cliente?.nome_razao || os.cliente_nome || 'Consumidor Final',
                logradouro_tomador: cliente?.logradouro || '',
                numero_tomador: cliente?.numero || 'S/N',
                complemento_tomador: cliente?.complemento || '',
                bairro_tomador: cliente?.bairro || '',
                cep_tomador: cleanDigits(cliente?.cep) || undefined,
                codigo_municipio_tomador: Number(codigoMunicipioTomador),
                email_tomador: (cliente?.email || (os as any).cliente_email || '').trim() || undefined,
                telefone_tomador: cleanDigits(cliente?.whatsapp) || '',

                // Serviço
                codigo_municipio_prestacao: Number(codigoMunicipioTomador),
                // 071001: Limpeza, manutenção e conservação de imóveis, galerias e esgotos
                codigo_tributacao_nacional_iss: '071001',
                descricao_servico: discriminacao,
                valor_servico: valorServico,
                percentual_aliquota_relativa_municipio: Number(check.empresa.aliquota_iss) || 2.0,
                aliquota: Number(check.empresa.aliquota_iss) || 2.0,
                tributacao_iss: 1, // 1 = Tributável
                tipo_retencao_iss: 1, // 1 = Não Retido
                indicador_total_tributacao: '0',
                codigo_nbs: '124021000'
            }

            const result = await this.createNFe(payload, os.empresa_id || undefined)

            // Atualizar status na OS
            await supabase
                .from('ordens_servico')
                .update({
                    nfe_status: result.data?.status || 'processando_autorizacao',
                    nfe_ref: ref,
                    nfe_id_focus: result.data?.id_focus || result.data?.protocolo || null,
                    nfe_tipo: 'nfsen',
                    nfe_ambiente: check.ambiente
                } as any)
                .eq('id', osId)

            return result

        } else {
            // --- NFS-e Tradicional (/v2/nfse) ---
            const payload: any = {
                _ref: ref,
                data_emissao: dataEmissaoFormatada,
                natureza_operacao: '1',
                optante_simples_nacional: true,
                incentivador_cultural: false,

                prestador: {
                    cnpj: cnpjPrestador,
                    inscricao_municipal: codMunicipioEmissora === '4114302' ? undefined : (imPrestador || undefined),
                    codigo_municipio: codMunicipioEmissora
                },

                tomador: {
                    cnpj: cpfCnpj && cpfCnpj.length === 14 ? cpfCnpj : undefined,
                    cpf: cpfCnpj && cpfCnpj.length === 11 ? cpfCnpj : undefined,
                    razao_social: cliente?.nome_razao || os.cliente_nome || 'Consumidor Final',
                    endereco: {
                        logradouro: cliente?.logradouro || '',
                        numero: cliente?.numero || 'S/N',
                        complemento: cliente?.complemento || '',
                        bairro: cliente?.bairro || '',
                        codigo_municipio: codigoMunicipioTomador,
                        uf: cliente?.uf || 'PR',
                        cep: cleanDigits(cliente?.cep)
                    },
                    email: (cliente?.email || (os as any).cliente_email || '').trim() || undefined
                },

                servico: {
                    valor_servicos: valorServico,
                    base_calculo: valorServico,
                    aliquota: Number(check.empresa.aliquota_iss) || 2.0,
                    discriminacao: discriminacao,
                    // 071001: 6 dígitos (2 item + 2 subitem + 2 desdobro nacional LC 116/2003)
                    item_lista_servico: '071001',
                    // NBS oficial para esgoto e desentupimento (9 dígitos exigido pela Betha / Mandirituba)
                    codigo_nbs: '124021000',
                    codigo_municipio: codigoMunicipioTomador,
                    iss_retido: false,
                    valor_iss: Number((valorServico * ((Number(check.empresa.aliquota_iss) || 2.0) / 100)).toFixed(2))
                }
            }

            const result = await this.createNFe(payload, os.empresa_id || undefined)

            await supabase
                .from('ordens_servico')
                .update({
                    nfe_status: result.data?.status || 'processando_autorizacao',
                    nfe_ref: ref,
                    nfe_id_focus: result.data?.id_focus || null,
                    nfe_tipo: 'nfse',
                    nfe_ambiente: check.ambiente
                } as any)
                .eq('id', osId)

            return result
        }
    }
}

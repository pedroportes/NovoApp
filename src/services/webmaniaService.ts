import { supabase } from '@/lib/supabase'

interface NFSePayload {
    ambiente: 1 | 2  // 1=Produção, 2=Homologação
    url_notificacao?: string
    rps: RPSItem[]
}

interface RPSItem {
    servico: {
        valor_servicos: string
        discriminacao: string
        classe_imposto?: string
        iss_retido?: 1 | 2  // 1=Sim, 2=Não
        impostos?: {
            iss?: string
            pis?: string
            cofins?: string
            inss?: string
            ir?: string
            csll?: string
        }
    }
    tomador: {
        cpf?: string
        cnpj?: string
        nome_completo: string
        endereco?: string
        numero?: string
        complemento?: string
        bairro?: string
        cidade?: string
        uf?: string
        cep?: string
        email?: string
        telefone?: string
    }
}

interface WebmaniaResponse {
    uuid: string
    modelo: string
    status: 'processando' | 'aprovado' | 'agendado' | 'reprovado' | 'cancelado' | 'contingencia'
    motivo: string
    numero?: string
    codigo_verificacao?: string
    serie_rps?: string
    numero_rps?: number
    xml?: string
    pdf_nfse?: string
    pdf_nfse_status?: string
    pdf_rps?: string
    log?: any
    atualizado_em?: string
}

export const WebmaniaService = {
    /**
     * Verifica se a empresa tem as credenciais necessárias para emitir NFS-e.
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

        const missing: string[] = []
        if (!empresa.webmania_access_token) missing.push('Access Token Webmania')
        if (!empresa.cnpj) missing.push('CNPJ da Empresa')
        if (!empresa.codigo_municipio) missing.push('Código do Município (IBGE)')

        return {
            ready: missing.length === 0,
            missingFields: missing,
            empresa,
            empresaId: targetEmpresaId
        }
    },

    /**
     * Envia NFS-e para API Webmania via Edge Function Proxy.
     */
    async createNFSe(payload: NFSePayload, empresaId?: string): Promise<WebmaniaResponse> {
        const check = await this.checkCredentials(empresaId)
        if (!check.ready) {
            throw new Error(`Configuração incompleta: ${check.missingFields.join(', ')}`)
        }

        const url = 'https://api.webmania.com.br/2/nfse/emissao'

        try {
            const { data, error } = await supabase.functions.invoke('webmania-proxy', {
                body: {
                    url,
                    method: 'POST',
                    token: check.empresa.webmania_access_token,
                    body: payload
                }
            })

            if (error) throw error

            if (!data.ok) {
                const errorMsg = data.data?.msg || data.data?.mensagem || data.data?.message || JSON.stringify(data.data) || 'Erro desconhecido na emissão'
                throw new Error(errorMsg)
            }

            return data.data as WebmaniaResponse

        } catch (error: any) {
            console.error('Erro ao comunicar com Webmania:', error)
            throw new Error(error.message || 'Erro de comunicação com o servidor')
        }
    },

    /**
     * Testa a conexão com a API Webmania.
     */
    async testConnection(empresaId?: string) {
        const check = await this.checkCredentials(empresaId)

        if (check.missingFields.includes('Access Token Webmania')) {
            throw new Error('Access Token não configurado.')
        }

        // Consulta status do município para testar conexão
        const url = 'https://api.webmania.com.br/2/nfse/status'

        try {
            const { data, error } = await supabase.functions.invoke('webmania-proxy', {
                body: {
                    url,
                    method: 'GET',
                    token: check.empresa.webmania_access_token
                }
            })

            if (error) {
                const msg = error.context?.json?.error || error.message
                throw new Error(msg)
            }

            if (data.status === 401 || data.status === 403) {
                throw new Error('Autenticação falhou. Verifique o Access Token.')
            }

            if (!data.ok && data.status !== 200) {
                throw new Error(data.data?.msg || data.data?.message || 'Erro ao conectar com API')
            }

            return { 
                success: true, 
                message: 'Conexão bem sucedida!',
                municipio: data.data 
            }

        } catch (error: any) {
            throw new Error(error.message || 'Erro de conexão')
        }
    },

    /**
     * Consulta status de uma NFS-e.
     */
    async consultarNFSe(uuid: string, empresaId?: string): Promise<WebmaniaResponse> {
        const check = await this.checkCredentials(empresaId)
        if (!check.empresa.webmania_access_token) {
            throw new Error('Access Token não configurado.')
        }

        const url = `https://api.webmania.com.br/2/nfse/consulta?uuid=${uuid}`

        try {
            const { data, error } = await supabase.functions.invoke('webmania-proxy', {
                body: {
                    url,
                    method: 'GET',
                    token: check.empresa.webmania_access_token
                }
            })

            if (error) throw error

            if (!data.ok) {
                throw new Error(data.data?.msg || 'Erro ao consultar NFS-e')
            }

            return data.data as WebmaniaResponse

        } catch (error: any) {
            throw new Error(error.message || 'Erro ao consultar NFS-e')
        }
    },

    /**
     * Cancela uma NFS-e.
     */
    async cancelarNFSe(uuid: string, motivo: 1 | 2 | 4, empresaId?: string) {
        // 1=Erro na emissão, 2=Serviço não prestado, 4=Duplicidade
        const check = await this.checkCredentials(empresaId)
        if (!check.empresa.webmania_access_token) {
            throw new Error('Access Token não configurado.')
        }

        const url = 'https://api.webmania.com.br/2/nfse/cancelar'

        try {
            const { data, error } = await supabase.functions.invoke('webmania-proxy', {
                body: {
                    url,
                    method: 'PUT',
                    token: check.empresa.webmania_access_token,
                    body: { uuid, motivo }
                }
            })

            if (error) throw error

            if (!data.ok) {
                throw new Error(data.data?.msg || 'Erro ao cancelar NFS-e')
            }

            return data.data

        } catch (error: any) {
            throw new Error(error.message || 'Erro ao cancelar NFS-e')
        }
    },

    /**
     * Helper para obter código do município com fallback por estado.
     */
    getCodigoMunicipio(codigoMunicipio: string | null | undefined, uf: string | null | undefined): string {
        const cleanDigits = (str: string | null | undefined) => str ? str.replace(/\D/g, '') : ''
        
        if (codigoMunicipio && cleanDigits(codigoMunicipio)) {
            return cleanDigits(codigoMunicipio)
        }
        
        // Fallback: código das capitais baseado na UF
        const fallbackCodigos: { [key: string]: string } = {
            'AC': '1200401', 'AL': '2704302', 'AP': '1600303', 'AM': '1302603',
            'BA': '2927408', 'CE': '2304400', 'DF': '5300108', 'ES': '3205309',
            'GO': '5208707', 'MA': '2111300', 'MT': '5103403', 'MS': '5002704',
            'MG': '3106200', 'PA': '1501402', 'PB': '2507507', 'PR': '4106902',
            'PE': '2611606', 'PI': '2211001', 'RJ': '3304557', 'RN': '2408102',
            'RS': '4314902', 'RO': '1100205', 'RR': '1400100', 'SC': '4205407',
            'SP': '3550308', 'SE': '2800308', 'TO': '1721000',
        }
        
        return fallbackCodigos[uf?.toUpperCase() || 'PR'] || '4106902' // Default: Curitiba
    },

    /**
     * Emite NFS-e a partir de uma Ordem de Serviço.
     */
    async emitirNotaFiscal(osId: string) {
        // 1. Buscar dados da OS com Cliente
        const { data: os, error: osError } = await supabase
            .from('ordens_servico')
            .select('*, clientes(*)')
            .eq('id', osId)
            .single()

        if (osError || !os) throw new Error('Ordem de serviço não encontrada.')

        // 2. Verificar credenciais
        const check = await this.checkCredentials(os.empresa_id || undefined)
        if (!check.ready) {
            throw new Error(`Empresa incompleta: ${check.missingFields.join(', ')}`)
        }

        if (!check.empresa.webmania_habilitado) {
            throw new Error('Emissão de NFS-e não está habilitada para esta empresa.')
        }

        // 3. Helper para limpar strings
        const cleanDigits = (str: string | null | undefined) => str ? str.replace(/\D/g, '') : ''

        // 4. Determinar ambiente
        const ambiente = check.empresa.webmania_ambiente === 'producao' ? 1 : 2

        // 5. Preparar dados do tomador (cliente)
        const cliente = os.clientes as any
        const cpfCnpj = cleanDigits(cliente?.cpf_cnpj)
        
        const tomador: RPSItem['tomador'] = {
            nome_completo: cliente?.nome_razao || os.cliente_nome || 'Consumidor Final',
        }

        // CPF ou CNPJ
        if (cpfCnpj) {
            if (cpfCnpj.length === 11) {
                tomador.cpf = cpfCnpj
            } else if (cpfCnpj.length === 14) {
                tomador.cnpj = cpfCnpj
            }
        }

        // Endereço
        if (cliente?.logradouro) tomador.endereco = cliente.logradouro
        if (cliente?.numero) tomador.numero = cliente.numero
        if (cliente?.complemento) tomador.complemento = cliente.complemento
        if (cliente?.bairro) tomador.bairro = cliente.bairro
        if (cliente?.cidade) tomador.cidade = cliente.cidade
        if (cliente?.uf) tomador.uf = cliente.uf
        if (cliente?.cep) tomador.cep = cleanDigits(cliente.cep)
        if (cliente?.email) tomador.email = cliente.email
        if (cliente?.whatsapp) tomador.telefone = cleanDigits(cliente.whatsapp)

        // 6. Preparar dados do serviço
        const valorTotal = os.valor_total || 0
        const discriminacao = `Serviços ref. OS #${os.id.slice(0, 8)}: ${os.descricao_servico || os.descricao || 'Prestação de Serviços'}`

        const servico: RPSItem['servico'] = {
            valor_servicos: valorTotal.toFixed(2),
            discriminacao,
        }

        // Usar classe de imposto se configurada
        if (check.empresa.webmania_classe_imposto) {
            servico.classe_imposto = check.empresa.webmania_classe_imposto
        }

        // 7. Montar payload
        const payload: NFSePayload = {
            ambiente,
            rps: [{
                servico,
                tomador
            }]
        }



        // 8. Enviar para API
        const response = await this.createNFSe(payload, os.empresa_id || undefined)

        // 9. Atualizar OS com dados da NF
        const updateData: any = {
            nf_uuid: response.uuid,
            nfe_status: response.status,
            nfe_numero: response.numero || null,
            nf_codigo_verificacao: response.codigo_verificacao || null,
            nfe_xml_url: response.xml || null,
            nfe_pdf_url: response.pdf_nfse || null,
            nfe_mensagem_erro: response.status === 'reprovado' ? response.motivo : null,
            nfe_tipo: 'nfse',
        }

        if (response.status === 'aprovado') {
            updateData.nfe_emitida_em = new Date().toISOString()
        }

        await supabase
            .from('ordens_servico')
            .update(updateData)
            .eq('id', osId)

        return response
    }
}

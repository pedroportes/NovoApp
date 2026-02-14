// Serviço para busca de CNPJ via BrasilAPI

export interface CnpjResponse {
    cnpj: string
    razao_social: string
    nome_fantasia?: string
    descricao_tipo_de_logradouro?: string // "RUA", "AVENIDA", etc.
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    municipio?: string
    uf?: string
    cep?: string
    ddd_telefone_1?: string
    email?: string
}

export async function searchCnpj(cnpj: string): Promise<CnpjResponse | null> {
    // Limpa o CNPJ (remove pontos, traços, barras)
    const cleanCnpj = cnpj.replace(/\D/g, '')

    if (cleanCnpj.length !== 14) {
        return null
    }

    // TENTATIVA 1: BrasilAPI
    try {

        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`)

        if (response.ok) {
            const data = await response.json()
            return data as CnpjResponse
        }
    } catch (error) {
        console.warn('Erro na BrasilAPI, tentando fallback...', error)
    }

    // TENTATIVA 2: ReceitaWS (Fallback)
    // Nota: ReceitaWS Free tem limite de 3 requisições por minuto, mas é um bom backup
    try {

        // Usando JSONP ou Proxy seria ideal, mas o fetch direto funciona em muitos casos se a API permitir CORS ou se for ignorado em dev
        // Para garantir, vamos usar uma alternativa pública que aceita CORS: https://publica.cnpj.ws/cnpj/{cnpj}

        const response = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`)

        if (response.ok) {
            const data = await response.json()

            // Mapeamento de campos do CNPJ.ws para nossa interface
            return {
                cnpj: cleanCnpj,
                razao_social: data.razao_social,
                nome_fantasia: data.nome_fantasia,
                descricao_tipo_de_logradouro: data.estabelecimento?.tipo_logradouro,
                logradouro: data.estabelecimento?.logradouro,
                numero: data.estabelecimento?.numero,
                complemento: data.estabelecimento?.complemento,
                bairro: data.estabelecimento?.bairro,
                municipio: data.estabelecimento?.cidade?.nome,
                uf: data.estabelecimento?.estado?.sigla,
                cep: data.estabelecimento?.cep,
                ddd_telefone_1: data.estabelecimento?.ddd1 && data.estabelecimento?.telefone1
                    ? `${data.estabelecimento.ddd1}${data.estabelecimento.telefone1}`
                    : undefined,
                email: data.estabelecimento?.email
            }
        }
    } catch (error) {
        console.error('Erro ao buscar CNPJ em todos os provedores:', error)
    }

    return null
}

// Formata logradouro completo com tipo (Rua, Avenida, etc.)
export function formatLogradouro(tipo?: string, logradouro?: string): string {
    if (!logradouro) return ''
    if (!tipo) return logradouro
    // Capitaliza o tipo: "RUA" -> "Rua"
    const tipoFormatado = tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase()
    return `${tipoFormatado} ${logradouro}`
}

// Formata telefone com DDD
export function formatPhone(dddPhone: string | undefined): string {
    if (!dddPhone) return ''
    const clean = dddPhone.replace(/\D/g, '')
    if (clean.length === 10) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
    }
    if (clean.length === 11) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
    }
    return dddPhone
}

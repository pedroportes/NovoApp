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

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`)

        if (!response.ok) {
            console.warn('CNPJ não encontrado:', cleanCnpj)
            return null
        }

        const data = await response.json()
        return data as CnpjResponse
    } catch (error) {
        console.error('Erro ao buscar CNPJ:', error)
        return null
    }
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

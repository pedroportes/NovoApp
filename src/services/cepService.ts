// Serviço para busca de CEP via BrasilAPI

export interface CepResponse {
    cep: string
    state: string
    city: string
    neighborhood: string
    street: string
    service: string
}

export async function searchCep(cep: string): Promise<CepResponse | null> {
    // Limpa o CEP (remove pontos, traços, espaços)
    const cleanCep = cep.replace(/\D/g, '')

    if (cleanCep.length !== 8) {
        return null
    }

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`)

        if (!response.ok) {
            console.warn('CEP não encontrado:', cleanCep)
            return null
        }

        const data = await response.json()
        return data as CepResponse
    } catch (error) {
        console.error('Erro ao buscar CEP:', error)
        return null
    }
}

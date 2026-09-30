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

// ---------- CEP a partir do endereço (rua + número + cidade/UF), qualquer cidade do Brasil ----------
// ViaCEP devolve os CEPs da rua; ruas longas têm um CEP por trecho ("até 1099/1100",
// "de 1101/1102 ao fim", "lado ímpar"). Só devolve quando dá para ter certeza.

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '')
const normalizar = (t: unknown) => semAcento(String(t ?? '')).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
// "R. Guaianazes" / "Av Pres. Getúlio Vargas" -> nome sem o tipo, que é como a busca funciona melhor
const TIPOS = /^(rua|r|avenida|av|travessa|tv|trav|alameda|al|estrada|est|rodovia|rod|praca|pca|largo|servidao|marginal|via|vila|beco)\b\s*/
const nomeDaRua = (rua: string) => normalizar(rua).replace(TIPOS, '').trim()

// O número cabe no trecho descrito no "complemento" do CEP?
export function numeroNoTrecho(numero: number, complemento: string): boolean {
    const c = normalizar(complemento)
    if (!c) return true
    if (/lado par/.test(c) && numero % 2 !== 0) return false
    if (/lado impar/.test(c) && numero % 2 === 0) return false
    const nums = (c.match(/\d+/g) || []).map(Number)
    const ate = c.match(/^ate (\d+)(?: (\d+))?/)
    if (ate) return numero <= Math.max(Number(ate[1]), Number(ate[2] || 0))
    const fim = c.match(/^de (\d+)(?: (\d+))? ao fim/)
    if (fim) return numero >= Math.min(Number(fim[1]), Number(fim[2] || fim[1]))
    const faixa = c.match(/^de (\d+)(?: (\d+))? (?:a|ate) (\d+)(?: (\d+))?/)
    if (faixa) {
        const ini = Math.min(Number(faixa[1]), Number(faixa[2] || faixa[1]))
        const fimN = Math.max(Number(faixa[3]), Number(faixa[4] || faixa[3]))
        return numero >= ini && numero <= fimN
    }
    return nums.length === 0 // complemento sem números (ex.: "lado par") já foi tratado acima
}

export interface CepPorEndereco { cep: string; logradouro: string; bairro: string; cidade: string; uf: string }

export async function descobrirCep(uf: string, cidade: string, rua: string, numero?: string, bairro?: string): Promise<CepPorEndereco | null> {
    const estado = String(uf || '').trim().toUpperCase()
    const nome = nomeDaRua(rua)
    if (!/^[A-Z]{2}$/.test(estado) || String(cidade || '').trim().length < 3 || nome.length < 3) return null
    try {
        const url = `https://viacep.com.br/ws/${estado}/${encodeURIComponent(cidade.trim())}/${encodeURIComponent(nome)}/json/`
        const r = await fetch(url)
        if (!r.ok) return null
        const lista = await r.json()
        if (!Array.isArray(lista) || lista.length === 0) return null
        // Mesma rua (o nome buscado é o fim do nome oficial: "guaianazes" em "rua guaianazes")
        let cand = lista.filter((x: any) => normalizar(x.logradouro).endsWith(nome))
        if (cand.length === 0) return null
        const n = parseInt(String(numero || '').replace(/\D/g, ''), 10)
        if (cand.length > 1 && n > 0) cand = cand.filter((x: any) => numeroNoTrecho(n, x.complemento))
        if (cand.length > 1 && bairro) {
            const b = normalizar(bairro)
            const mesmoBairro = cand.filter((x: any) => normalizar(x.bairro) === b)
            if (mesmoBairro.length > 0) cand = mesmoBairro
        }
        const ceps = [...new Set(cand.map((x: any) => x.cep))]
        if (ceps.length !== 1) return null
        const x = cand[0]
        // Bairro escrito no cadastro diferente do bairro do CEP: não arrisca
        if (bairro) {
            const b = normalizar(bairro), bx = normalizar(x.bairro)
            if (b && bx && !b.includes(bx) && !bx.includes(b)) return null
        }
        return { cep: x.cep, logradouro: x.logradouro, bairro: x.bairro, cidade: x.localidade, uf: x.uf }
    } catch {
        return null
    }
}

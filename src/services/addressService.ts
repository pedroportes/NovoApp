// Serviço para autocomplete de endereço via Geoapify

const GEOAPIFY_API_KEY = 'e398041403a845a18f2948f7a9d347f4'

export interface AddressSuggestion {
    formatted: string
    street?: string
    housenumber?: string
    postcode?: string
    city?: string
    state?: string
    state_code?: string
    neighbourhood?: string
    lat: number
    lon: number
}

export interface GeoapifyResult {
    properties: {
        formatted: string
        street?: string
        housenumber?: string
        postcode?: string
        city?: string
        state?: string
        state_code?: string
        suburb?: string
        neighbourhood?: string
        lat: number
        lon: number
    }
}

export async function searchAddress(query: string): Promise<AddressSuggestion[]> {
    if (!query || query.length < 3) {
        return []
    }

    try {
        const response = await fetch(
            `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&filter=countrycode:br&lang=pt&limit=5&apiKey=${GEOAPIFY_API_KEY}`
        )

        if (!response.ok) {
            console.warn('Erro na busca de endereço:', response.status)
            return []
        }

        const data = await response.json()

        if (!data.features || data.features.length === 0) {
            return []
        }

        return data.features.map((feature: GeoapifyResult) => ({
            formatted: feature.properties.formatted,
            street: feature.properties.street,
            housenumber: feature.properties.housenumber,
            postcode: feature.properties.postcode,
            city: feature.properties.city,
            state: feature.properties.state,
            state_code: feature.properties.state_code,
            neighbourhood: feature.properties.suburb || feature.properties.neighbourhood,
            lat: feature.properties.lat,
            lon: feature.properties.lon
        }))
    } catch (error) {
        console.error('Erro ao buscar endereço:', error)
        return []
    }
}

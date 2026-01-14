export interface SmartFilter {
    term?: string;
    city?: string;
    status?: string;
    date?: string;
}

export const SearchAssistant = {
    /**
     * Parses a natural language query into a structured SmartFilter object.
     * Initially uses regex for efficiency, can be expanded to use LLM.
     */
    parseQuery(query: string): SmartFilter {
        const lowerQuery = query.toLowerCase().trim();
        const filter: SmartFilter = { term: query };

        // 1. Detect Status
        if (lowerQuery.includes('pendente')) filter.status = 'pendente';
        else if (lowerQuery.includes('andamento')) filter.status = 'em_andamento';
        else if (lowerQuery.includes('concluido') || lowerQuery.includes('concluída')) filter.status = 'concluido';
        else if (lowerQuery.includes('cancelada') || lowerQuery.includes('cancelado')) filter.status = 'nao_feito_cancelado';
        else if (lowerQuery.includes('orçamento')) filter.status = 'orcamento';

        // 2. Detect City (e.g., "de Curitiba", "em São Paulo")
        const cityMatch = lowerQuery.match(/(?:de|em)\s+([a-zA-Záàâãéèêíïóôõöúçñ\s]+)$/i);
        if (cityMatch) {
            filter.city = cityMatch[1].trim();
            // Remove city from general term to focus search
            filter.term = lowerQuery.replace(cityMatch[0], '').trim();
        }

        // 3. Detect specialized intents (e.g., "ver ordens", "buscar clientes")
        // We strip these common prefixes
        const commonPrefixes = [
            'buscar por', 'buscar', 'pesquisar por', 'pesquisar',
            'ver', 'mostrar', 'encontrar', 'quem é', 'quem e'
        ];

        let cleanedTerm = filter.term || '';
        for (const prefix of commonPrefixes) {
            if (cleanedTerm.startsWith(prefix)) {
                cleanedTerm = cleanedTerm.substring(prefix.length).trim();
                break;
            }
        }
        filter.term = cleanedTerm;

        return filter;
    }
};

// Regra do "pull" (nuvem -> aparelho). Função pura, sem banco, para poder ser testada isolada.
//
// Garantias:
//  1. Registro local com alteração pendente (synced === 0) NUNCA é sobrescrito nem apagado pelo pull.
//  2. Registro que o usuário excluiu offline (exclusão ainda na fila) NÃO ressuscita pelo pull.
//  3. Registro local já sincronizado que sumiu do servidor é removido (limpa fantasmas/excluídos).
//  4. Só é GRAVADO o que realmente mudou (ou é novo). Regravar tudo fazia as listas reordenarem e
//     redesenharem 5 mil registros a cada abertura do app (~3,8 s de tela travada).

export interface LinhaLocal {
    id: string
    synced?: number
}

export interface PlanoPull<T extends LinhaLocal> {
    /** Linhas do servidor que precisam ser gravadas no aparelho (novas ou alteradas) */
    gravar: T[]
    /** Ids locais que devem ser removidos do aparelho */
    remover: string[]
    /** Quantas linhas do servidor já estavam idênticas no aparelho (não regravadas) */
    semMudanca: number
}

const iguais = (a: unknown, b: unknown): boolean => {
    if (a === b) return true
    // null e undefined significam "vazio" para o app: contam como iguais
    if (a == null && b == null) return true
    if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
        return JSON.stringify(a) === JSON.stringify(b)
    }
    return false
}

/**
 * Diz se a linha do servidor difere da local, olhando só os campos que o servidor trouxe.
 * `ignorar`: campos que o app preenche na hora (ex.: updated_at = agora) e que mudariam sempre.
 */
export function linhaMudou(
    local: Record<string, any>,
    servidor: Record<string, any>,
    ignorar: string[] = ['updated_at'],
): boolean {
    for (const k of Object.keys(servidor)) {
        if (ignorar.includes(k)) continue
        if (!iguais(local[k], servidor[k])) return true
    }
    return false
}

export function planejarPull<L extends LinhaLocal, T extends LinhaLocal>(
    locais: L[],
    doServidor: T[],
    idsExcluidosPendentes: Set<string>,
    /** Só linhas para as quais isto retorna true podem ser apagadas por não existirem mais no servidor */
    podeRemover: (l: L) => boolean,
    /** Se informado, linhas idênticas às locais não são regravadas */
    mudou?: (local: L, servidor: T) => boolean,
): PlanoPull<T> {
    const porId = new Map<string, L>()
    const pendentes = new Set<string>()
    for (const l of locais) {
        porId.set(l.id, l)
        if (l.synced === 0) pendentes.add(l.id)
    }

    const gravar: T[] = []
    let semMudanca = 0
    for (const s of doServidor) {
        if (pendentes.has(s.id) || idsExcluidosPendentes.has(s.id)) continue
        const atual = porId.get(s.id)
        if (mudou && atual && !mudou(atual, s)) { semMudanca++; continue }
        gravar.push(s)
    }

    const idsServidor = new Set<string>()
    for (const s of doServidor) idsServidor.add(s.id)
    const remover = locais
        .filter(l => !idsServidor.has(l.id) && l.synced !== 0 && podeRemover(l))
        .map(l => l.id)

    return { gravar, remover, semMudanca }
}

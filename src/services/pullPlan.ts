// Regra do "pull" (nuvem -> aparelho). Função pura, sem banco, para poder ser testada isolada.
//
// Garantias:
//  1. Registro local com alteração pendente (synced === 0) NUNCA é sobrescrito nem apagado pelo pull.
//  2. Registro que o usuário excluiu offline (exclusão ainda na fila) NÃO ressuscita pelo pull.
//  3. Registro local já sincronizado que sumiu do servidor é removido (limpa fantasmas/excluídos).

export interface LinhaLocal {
    id: string
    synced?: number
}

export interface PlanoPull<T extends LinhaLocal> {
    /** Linhas do servidor que podem ser gravadas no aparelho */
    gravar: T[]
    /** Ids locais que devem ser removidos do aparelho */
    remover: string[]
}

export function planejarPull<T extends LinhaLocal>(
    locais: LinhaLocal[],
    doServidor: T[],
    idsExcluidosPendentes: Set<string>,
    /** Só linhas para as quais isto retorna true podem ser apagadas por não existirem mais no servidor */
    podeRemover: (l: LinhaLocal) => boolean,
): PlanoPull<T> {
    const pendentes = new Set<string>()
    for (const l of locais) if (l.synced === 0) pendentes.add(l.id)

    const gravar = doServidor.filter(s => !pendentes.has(s.id) && !idsExcluidosPendentes.has(s.id))

    const idsServidor = new Set<string>()
    for (const s of doServidor) idsServidor.add(s.id)
    const remover = locais
        .filter(l => !idsServidor.has(l.id) && l.synced !== 0 && podeRemover(l))
        .map(l => l.id)

    return { gravar, remover }
}

// DIA DA OS — regra única de data para períodos (Painel, Relatórios, Extrato) e para exibição.
//
// Muitas OS (as que vêm da planilha) só têm o DIA, sem hora, e ficam gravadas como meia-noite UTC
// ("2026-10-01T00:00:00+00:00"). Em Brasília isso é 30/09 às 21:00; então:
//  - filtrar por instante jogava toda OS do dia 1º no mês ANTERIOR (o mês atual aparecia zerado);
//  - mostrar com `new Date(x).toLocaleDateString()` exibia o dia ANTERIOR (recibo com a data errada).
//
// Regra (a mesma do cartão da OS): data "sem hora" vale o DIA ESCRITO; data com hora vale o instante,
// no fuso local do aparelho. Função pura, sem tela, para poder ser testada isolada.

export interface PeriodoDatas {
    start: Date
    end: Date
}

const SEM_HORA = /^\d{4}-\d{2}-\d{2}([T ]00:00:00(\.0+)?(Z|[+-]00(:?00)?)?)?$/

/** A data tem só o dia (sem hora)? */
export const ehDataSemHora = (iso?: string | null): boolean => !!iso && SEM_HORA.test(String(iso))

/**
 * Data "efetiva" para decidir em que período cai: meio-dia local do dia escrito (data sem hora) ou o
 * próprio instante (data com hora). Devolve null se não for uma data válida.
 */
export function dataEfetivaDaOS(iso?: string | null): Date | null {
    if (!iso) return null
    const texto = String(iso)
    const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
    const d = SEM_HORA.test(texto) && m
        ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0)
        : new Date(texto.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'))
    return isNaN(d.getTime()) ? null : d
}

/** Cai dentro do período (início e fim inclusive, pelo dia)? Sem início ou sem fim = aberto daquele lado. */
export function dentroDoPeriodoDaOS(
    iso: string | null | undefined,
    p: { start?: Date | null; end?: Date | null },
): boolean {
    const d = dataEfetivaDaOS(iso)
    if (!d) return false
    return (!p.start || d >= p.start) && (!p.end || d <= p.end)
}

const UM_DIA = 24 * 60 * 60 * 1000

/**
 * Janela para BUSCAR no banco: o período com 1 dia de folga de cada lado. A busca traz as OS das
 * pontas (ex.: meia-noite UTC do dia 1º, que no instante cai 3 h antes do mês) e depois
 * `dentroDoPeriodoDaOS` decide, pelo dia, quem fica. Folga de 1 dia cobre qualquer fuso.
 */
export function janelaDeBusca(p: PeriodoDatas): { inicioISO: string; fimISO: string } {
    return { inicioISO: new Date(p.start.getTime() - UM_DIA).toISOString(), fimISO: new Date(p.end.getTime() + UM_DIA).toISOString() }
}

/** Fim EXCLUSIVO do período (primeiro instante depois dele), para usar com `.lt(...)` em datas com hora. */
export const fimExclusivoISO = (p: PeriodoDatas): string => new Date(p.end.getTime() + 1).toISOString()

/**
 * Data para MOSTRAR (dd/mm/aaaa): data sem hora mostra o dia escrito; data com hora mostra o dia do
 * instante no fuso local. Texto vazio ou inválido devolve `vazio` (padrão '').
 */
export function formatarDiaDaOS(iso?: string | null, vazio = ''): string {
    const d = dataEfetivaDaOS(iso)
    return d ? d.toLocaleDateString('pt-BR') : vazio
}

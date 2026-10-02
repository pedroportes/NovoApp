// Períodos do filtro do Painel (Dashboard). Função pura, sem tela, para poder ser testada isolada.
// Todas as datas são do horário LOCAL do aparelho (o Pedro está em Brasília); o app converte para
// ISO (UTC) só na hora de consultar o banco.

export type PeriodoKey = 'mes_atual' | 'mes_anterior' | '7' | '15' | '30' | '90'

export const PERIODO_PADRAO: PeriodoKey = 'mes_atual'

export const PERIODOS: { key: PeriodoKey; label: string }[] = [
    { key: 'mes_atual', label: 'Este mês' },
    { key: 'mes_anterior', label: 'Mês passado' },
    { key: '7', label: 'Últimos 7 dias' },
    { key: '15', label: 'Últimos 15 dias' },
    { key: '30', label: 'Últimos 30 dias' },
    { key: '90', label: 'Últimos 90 dias' },
]

export interface Periodo {
    start: Date
    end: Date
}

/**
 * - mes_atual: do dia 1 deste mês, 00:00, até o FIM de hoje.
 * - mes_anterior: do dia 1 do mês passado, 00:00, até o último dia dele, 23:59:59.999.
 * - 7/15/30/90: da 00:00 do dia N dias atrás até o fim de hoje.
 *
 * O fim é "fim do dia de hoje" (antes era "a hora em que a página abriu"), para que uma OS criada
 * depois de abrir o Painel entre na atualização em tempo real.
 */
export function calcularPeriodo(key: PeriodoKey, agora: Date = new Date()): Periodo {
    const ano = agora.getFullYear()
    const mes = agora.getMonth()
    const fimDeHoje = new Date(ano, mes, agora.getDate(), 23, 59, 59, 999)

    if (key === 'mes_atual') {
        return { start: new Date(ano, mes, 1, 0, 0, 0, 0), end: fimDeHoje }
    }
    if (key === 'mes_anterior') {
        // new Date(ano, mes - 1, 1) e new Date(ano, mes, 0) viram o ano sozinhos (janeiro -> dezembro)
        return { start: new Date(ano, mes - 1, 1, 0, 0, 0, 0), end: new Date(ano, mes, 0, 23, 59, 59, 999) }
    }
    // Começa à 00:00 do dia N dias atrás (antes: "agora menos N dias", com a hora do dia). Com a hora,
    // uma OS só com o dia entrava ou não conforme a hora em que o Painel era aberto.
    return { start: new Date(ano, mes, agora.getDate() - Number(key), 0, 0, 0, 0), end: fimDeHoje }
}

// ---------------------------------------------------------------------------------------------
// DIA DA OS. Muitas OS (as que vêm da planilha) só têm o DIA, sem hora, e ficam gravadas como
// meia-noite UTC ("2026-10-01T00:00:00+00:00"). Em Brasília isso é 30/09 às 21:00, então filtrar
// pelo instante jogava toda OS do dia 1º no mês ANTERIOR (e o mês atual aparecia zerado).
// Regra (a mesma do cartão da OS): data "sem hora" vale o DIA ESCRITO; data com hora vale o
// instante, no fuso local.
// ---------------------------------------------------------------------------------------------

const SEM_HORA = /^\d{4}-\d{2}-\d{2}([T ]00:00:00(\.0+)?(Z|[+-]00(:?00)?)?)?$/

/** A data tem só o dia (sem hora)? */
export const ehDataSemHora = (iso?: string | null): boolean => !!iso && SEM_HORA.test(String(iso))

/**
 * Data "efetiva" da OS para decidir em que período ela cai: meio-dia local do dia escrito (data sem
 * hora) ou o próprio instante (data com hora). Devolve null se não for uma data válida.
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

/** A OS cai dentro do período (início e fim inclusive, pelo dia da OS)? */
export function dentroDoPeriodoDaOS(iso: string | null | undefined, p: Periodo): boolean {
    const d = dataEfetivaDaOS(iso)
    return !!d && d >= p.start && d <= p.end
}

const UM_DIA = 24 * 60 * 60 * 1000

/**
 * Janela para BUSCAR no banco: o período com 1 dia de folga de cada lado. A busca traz as OS das
 * pontas (ex.: meia-noite UTC do dia 1º, que no instante cai 3 h antes do mês) e depois
 * `dentroDoPeriodoDaOS` decide, pelo dia da OS, quem fica. Folga de 1 dia cobre qualquer fuso.
 */
export function janelaDeBusca(p: Periodo): { inicioISO: string; fimISO: string } {
    return { inicioISO: new Date(p.start.getTime() - UM_DIA).toISOString(), fimISO: new Date(p.end.getTime() + UM_DIA).toISOString() }
}

/** Fim EXCLUSIVO do período (primeiro instante depois dele), para usar com `.lt(...)` em datas com hora. */
export const fimExclusivoISO = (p: Periodo): string => new Date(p.end.getTime() + 1).toISOString()

/** "01/10/2026 a 02/10/2026" (para mostrar ao lado do filtro) */
export function descreverPeriodo(p: Periodo): string {
    const f = (d: Date) => d.toLocaleDateString('pt-BR')
    return `${f(p.start)} a ${f(p.end)}`
}

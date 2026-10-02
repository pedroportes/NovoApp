// Períodos do filtro do Painel (Dashboard). Função pura, sem tela, para poder ser testada isolada.
// Todas as datas são do horário LOCAL do aparelho (o Pedro está em Brasília); o app converte para
// ISO (UTC) só na hora de consultar o banco.
//
// A regra do "dia da OS" (data sem hora vale o dia escrito) fica em ./diaDaOS e é reexportada aqui.

import type { PeriodoDatas } from './diaDaOS'

export {
    ehDataSemHora, dataEfetivaDaOS, dentroDoPeriodoDaOS, janelaDeBusca, fimExclusivoISO, formatarDiaDaOS,
} from './diaDaOS'

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

export type Periodo = PeriodoDatas

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

/** "01/10/2026 a 02/10/2026" (para mostrar ao lado do filtro) */
export function descreverPeriodo(p: Periodo): string {
    const f = (d: Date) => d.toLocaleDateString('pt-BR')
    return `${f(p.start)} a ${f(p.end)}`
}

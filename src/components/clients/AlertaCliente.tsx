// Alerta do cliente: aviso que aparece no próximo atendimento.
// Níveis: Bom cliente (verde), Atenção (amarelo), Cobrar mais (laranja), Lista negra (vermelho).
// Só dono/administrador marca ou tira (o banco também garante isso); técnico só vê.
// Cada assinante edita o nome do selo, a mensagem, se o nível está ligado e se pede confirmação
// (tabela empresa_alertas_config; sem linha = texto padrão abaixo).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type AlertaNivel = 'bom_cliente' | 'atencao' | 'cobrar_mais' | 'lista_negra'
export const NIVEIS: AlertaNivel[] = ['bom_cliente', 'atencao', 'cobrar_mais', 'lista_negra']

export interface AlertaTexto { rotulo: string; mensagem: string; ativo: boolean; confirmar: boolean }
export type AlertasConfig = Record<AlertaNivel, AlertaTexto>

export const ALERTAS_PADRAO: AlertasConfig = {
    bom_cliente: { rotulo: 'Bom cliente', mensagem: 'Ótimo cliente: paga em dia e é fácil de atender.', ativo: true, confirmar: false },
    atencao: { rotulo: 'Atenção', mensagem: 'Atenção com este cliente: cuidado com o combinado.', ativo: true, confirmar: false },
    cobrar_mais: { rotulo: 'Cobrar mais', mensagem: 'Cobrar mais deste cliente: só atender com valor acima da tabela.', ativo: true, confirmar: false },
    lista_negra: { rotulo: 'Lista negra', mensagem: 'Cliente na LISTA NEGRA: não atender.', ativo: true, confirmar: true },
}

// Cores e ícone de cada nível (fixos; o assinante muda só os textos)
export const CORES: Record<AlertaNivel, { emoji: string; selo: string; faixa: string; botao: string }> = {
    bom_cliente: { emoji: '✅', selo: 'bg-emerald-100 text-emerald-800 border-emerald-300', faixa: 'bg-emerald-50 border-emerald-300 text-emerald-900', botao: 'bg-emerald-600 border-emerald-600 text-white' },
    atencao: { emoji: '⚠️', selo: 'bg-amber-100 text-amber-800 border-amber-300', faixa: 'bg-amber-50 border-amber-300 text-amber-900', botao: 'bg-amber-500 border-amber-500 text-white' },
    cobrar_mais: { emoji: '💲', selo: 'bg-orange-100 text-orange-800 border-orange-300', faixa: 'bg-orange-50 border-orange-300 text-orange-900', botao: 'bg-orange-500 border-orange-500 text-white' },
    lista_negra: { emoji: '⛔', selo: 'bg-red-100 text-red-800 border-red-300', faixa: 'bg-red-50 border-red-400 text-red-900', botao: 'bg-red-600 border-red-600 text-white' },
}

export const nivelValido = (v: unknown): AlertaNivel | null =>
    typeof v === 'string' && (NIVEIS as string[]).includes(v) ? (v as AlertaNivel) : null

// ---------- Textos do assinante (carrega uma vez, guarda para uso offline) ----------
let cache: { empresaId: string; cfg: AlertasConfig } | null = null
const ouvintes = new Set<() => void>()
const chaveLocal = (empresaId: string) => `flowdrain_alertas_${empresaId}`

const mesclar = (linhas: any[] | null | undefined): AlertasConfig => {
    const cfg: AlertasConfig = JSON.parse(JSON.stringify(ALERTAS_PADRAO))
    for (const l of linhas || []) {
        const n = nivelValido(l?.nivel)
        if (!n) continue
        cfg[n] = {
            rotulo: l.rotulo || cfg[n].rotulo,
            mensagem: l.mensagem || cfg[n].mensagem,
            ativo: l.ativo ?? cfg[n].ativo,
            confirmar: l.confirmar ?? cfg[n].confirmar,
        }
    }
    return cfg
}

const avisar = () => ouvintes.forEach(f => f())

export async function carregarAlertasConfig(empresaId: string, forcar = false): Promise<AlertasConfig> {
    if (!forcar && cache?.empresaId === empresaId) return cache.cfg
    try {
        const salvo = localStorage.getItem(chaveLocal(empresaId))
        if (salvo && !cache) { cache = { empresaId, cfg: mesclar(JSON.parse(salvo)) }; avisar() }
    } catch { /* sem localStorage */ }
    if (typeof navigator !== 'undefined' && !navigator.onLine) return cache?.cfg || ALERTAS_PADRAO
    const { data, error } = await (supabase as any).from('empresa_alertas_config').select('*').eq('empresa_id', empresaId)
    if (!error) {
        cache = { empresaId, cfg: mesclar(data) }
        try { localStorage.setItem(chaveLocal(empresaId), JSON.stringify(data || [])) } catch { /* ignore */ }
        avisar()
    }
    return cache?.cfg || ALERTAS_PADRAO
}

export async function salvarAlertasConfig(empresaId: string, cfg: AlertasConfig) {
    const linhas = NIVEIS.map(n => ({
        empresa_id: empresaId, nivel: n,
        rotulo: cfg[n].rotulo.trim() || ALERTAS_PADRAO[n].rotulo,
        mensagem: cfg[n].mensagem.trim() || ALERTAS_PADRAO[n].mensagem,
        ativo: cfg[n].ativo, confirmar: cfg[n].confirmar, updated_at: new Date().toISOString(),
    }))
    const { error } = await (supabase as any).from('empresa_alertas_config').upsert(linhas, { onConflict: 'empresa_id,nivel' })
    if (error) throw error
    cache = { empresaId, cfg: mesclar(linhas) }
    try { localStorage.setItem(chaveLocal(empresaId), JSON.stringify(linhas)) } catch { /* ignore */ }
    avisar()
}

export function useAlertasConfig(): AlertasConfig {
    const { userData } = useAuth()
    const empresaId = userData?.empresa_id || ''
    const [, setVersao] = useState(0)
    useEffect(() => {
        const f = () => setVersao(v => v + 1)
        ouvintes.add(f)
        if (empresaId) carregarAlertasConfig(empresaId)
        return () => { ouvintes.delete(f) }
    }, [empresaId])
    return cache?.empresaId === empresaId ? cache.cfg : ALERTAS_PADRAO
}

/** Nível que deve aparecer (ligado na configuração do assinante). */
export const nivelVisivel = (nivel: unknown, cfg: AlertasConfig): AlertaNivel | null => {
    const n = nivelValido(nivel)
    return n && cfg[n].ativo ? n : null
}

const dataCurta = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

// ---------- Componentes ----------

/** Selo pequeno ao lado do nome (lista de clientes, cards de OS, escolha do cliente). */
export function SeloAlerta({ nivel, compacto = false }: { nivel?: string | null; compacto?: boolean }) {
    const cfg = useAlertasConfig()
    const n = nivelVisivel(nivel, cfg)
    if (!n) return null
    return (
        <span className={`inline-flex items-center gap-1 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold leading-none ${CORES[n].selo}`} title={cfg[n].rotulo}>
            <span aria-hidden>{CORES[n].emoji}</span>{!compacto && cfg[n].rotulo}
        </span>
    )
}

/** Faixa com a mensagem do assinante e o motivo do cliente (Nova OS, aviso de cliente repetido, cadastro). */
export function FaixaAlerta({ nivel, motivo, em, className = '' }: { nivel?: string | null; motivo?: string | null; em?: string | null; className?: string }) {
    const cfg = useAlertasConfig()
    const n = nivelVisivel(nivel, cfg)
    if (!n) return null
    return (
        <div role="alert" className={`rounded-xl border-2 p-3 text-sm ${CORES[n].faixa} ${className}`}>
            <p className="font-bold">{CORES[n].emoji} {cfg[n].mensagem}</p>
            {motivo && <p className="mt-1 whitespace-pre-line">{motivo}</p>}
            {em && <p className="mt-1 text-xs opacity-70">Marcado em {dataCurta(em)}</p>}
        </div>
    )
}

/** Texto da pergunta antes de abrir OS (ou null se o nível não pede confirmação). */
export function perguntaConfirmacao(nivel: unknown, nome: string, motivo: string | null | undefined, cfg: AlertasConfig): string | null {
    const n = nivelVisivel(nivel, cfg)
    if (!n || !cfg[n].confirmar) return null
    return `${CORES[n].emoji} ${nome}: ${cfg[n].mensagem}${motivo ? `\n\nMotivo: ${motivo}` : ''}\n\nAbrir OS mesmo assim?`
}

/** Campo para marcar/trocar/tirar o alerta (só dono/administrador vê editável). */
export function CampoAlerta({ nivel, motivo, onChange, podeEditar }: {
    nivel: string | null | undefined
    motivo: string | null | undefined
    onChange: (nivel: AlertaNivel | null, motivo: string) => void
    podeEditar: boolean
}) {
    const cfg = useAlertasConfig()
    const atual = nivelValido(nivel)
    if (!podeEditar) {
        return atual ? <FaixaAlerta nivel={atual} motivo={motivo} /> : null
    }
    const opcoes = NIVEIS.filter(n => cfg[n].ativo || n === atual)
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button type="button" onClick={() => onChange(null, '')}
                    className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${!atual ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    Sem alerta
                </button>
                {opcoes.map(n => (
                    <button key={n} type="button" onClick={() => onChange(n, motivo || '')} title={cfg[n].mensagem}
                        className={`h-11 rounded-xl border px-2 text-sm font-semibold transition-colors truncate ${atual === n ? CORES[n].botao : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        {CORES[n].emoji} {cfg[n].rotulo}
                    </button>
                ))}
            </div>
            {atual && (
                <textarea
                    className="w-full min-h-[72px] rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder={atual === 'bom_cliente' ? 'Motivo. Ex.: Paga sempre no Pix, indica clientes.' : 'Motivo. Ex.: Não pagou a OS de 10/08, ficou devendo R$ 480.'}
                    value={motivo || ''}
                    onChange={e => onChange(atual, e.target.value)}
                />
            )}
            {atual && <p className="text-xs text-slate-500">Aparece para quem for abrir OS para este cliente: "{cfg[atual].mensagem}"</p>}
        </div>
    )
}

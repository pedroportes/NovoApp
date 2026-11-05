import { useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Endereço onde o serviço foi feito, quando é diferente do cadastro do cliente.
// Ex.: empresa registrada em SC (vai como endereço do tomador na nota) e serviço feito em
// São José dos Pinhais (vai como local da prestação = onde o ISS é devido, subitem 7.10).
// null = serviço no endereço do cliente.
export interface LocalServico {
    cep: string
    endereco: string
    numero: string
    bairro: string
    cidade: string
    uf: string
    codigo_municipio: string // IBGE (7 dígitos), vem do CEP
}

export const LOCAL_VAZIO: LocalServico = { cep: '', endereco: '', numero: '', bairro: '', cidade: '', uf: '', codigo_municipio: '' }

const soDigitos = (t: unknown) => String(t ?? '').replace(/\D/g, '')

// Grava só quando a cidade/UF estão preenchidas; senão a OS fica no endereço do cliente
export function localParaGravar(local: LocalServico | null): LocalServico | null {
    if (!local) return null
    const l = { ...local, cep: soDigitos(local.cep), uf: local.uf.trim().toUpperCase() }
    return l.cidade.trim() && /^[A-Z]{2}$/.test(l.uf) ? l : null
}

interface Props {
    valor: LocalServico | null
    onChange: (v: LocalServico | null) => void
    // Cidade do cadastro do cliente, para mostrar quando o serviço é lá
    cidadeCliente?: string
}

export function CampoLocalServico({ valor, onChange, cidadeCliente }: Props) {
    const [buscando, setBuscando] = useState(false)
    const [erroCep, setErroCep] = useState('')
    const outro = !!valor
    const l = valor || LOCAL_VAZIO
    const mudar = (campos: Partial<LocalServico>) => onChange({ ...l, ...campos })

    // CEP completo: ViaCEP traz rua, bairro, cidade, UF e o código IBGE da cidade
    const buscarCep = async (cep: string) => {
        const d = soDigitos(cep)
        if (d.length !== 8) return
        setBuscando(true); setErroCep('')
        try {
            const r = await fetch(`https://viacep.com.br/ws/${d}/json/`)
            const via = r.ok ? await r.json() : null
            if (!via || via.erro) { setErroCep('CEP não encontrado. Preencha a cidade e a UF.'); return }
            mudar({
                cep: d,
                endereco: l.endereco || via.logradouro || '',
                bairro: l.bairro || via.bairro || '',
                cidade: via.localidade || '',
                uf: String(via.uf || '').toUpperCase(),
                codigo_municipio: soDigitos(via.ibge),
            })
        } catch {
            setErroCep('Sem internet para buscar o CEP. Preencha a cidade e a UF.')
        } finally {
            setBuscando(false)
        }
    }

    return (
        <div className="space-y-3">
            <Label className="text-slate-600 font-medium ml-1">Local do serviço</Label>
            <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onChange(null)}
                    className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold ${!outro ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                    Endereço do cliente
                </button>
                <button type="button" onClick={() => onChange(valor || { ...LOCAL_VAZIO })}
                    className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold ${outro ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                    Outro endereço
                </button>
            </div>

            {!outro && (
                <p className="text-xs text-slate-500 ml-1">
                    <MapPin className="inline h-3.5 w-3.5 mr-1" />
                    O serviço é no endereço do cadastro{cidadeCliente ? ` (${cidadeCliente})` : ''}. Na nota fiscal, essa cidade é o local da prestação.
                </p>
            )}

            {outro && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <p className="text-xs text-slate-600">
                        Use quando a empresa do cliente é de outra cidade (endereço do cadastro) e o serviço foi feito aqui.
                        Na nota fiscal: <b>tomador</b> = endereço do cadastro; <b>local da prestação</b> = este endereço (o ISS é desta cidade).
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1 space-y-1">
                            <Label className="text-xs text-slate-600">CEP</Label>
                            <div className="relative">
                                <Input inputMode="numeric" value={l.cep} placeholder="00000-000"
                                    onChange={e => { mudar({ cep: e.target.value }); if (soDigitos(e.target.value).length === 8) buscarCep(e.target.value) }} />
                                {buscando && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
                            </div>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs text-slate-600">Rua</Label>
                            <Input value={l.endereco} onChange={e => mudar({ endereco: e.target.value })} />
                        </div>
                    </div>
                    {erroCep && <p className="text-xs text-red-600">{erroCep}</p>}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600">Número</Label>
                            <Input value={l.numero} onChange={e => mudar({ numero: e.target.value })} />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs text-slate-600">Bairro</Label>
                            <Input value={l.bairro} onChange={e => mudar({ bairro: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs text-slate-600">Cidade</Label>
                            {/* Cidade digitada à mão: o código IBGE é achado pelo nome na hora da nota */}
                            <Input value={l.cidade} onChange={e => mudar({ cidade: e.target.value, codigo_municipio: '' })} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600">UF</Label>
                            <Input maxLength={2} value={l.uf} onChange={e => mudar({ uf: e.target.value.toUpperCase(), codigo_municipio: '' })} />
                        </div>
                    </div>
                    {!(l.cidade.trim() && /^[A-Za-z]{2}$/.test(l.uf.trim())) && (
                        <p className="text-xs text-amber-700">Preencha pelo menos a cidade e a UF (ou o CEP). Sem isso, a OS fica no endereço do cliente.</p>
                    )}
                </div>
            )}
        </div>
    )
}

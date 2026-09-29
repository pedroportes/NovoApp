// Configurações → Alertas de clientes: cada assinante edita o nome do selo, a mensagem que aparece
// na OS, se o nível está ligado e se pede confirmação antes de abrir OS.
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ALERTAS_PADRAO, AlertasConfig, CORES, NIVEIS, carregarAlertasConfig, salvarAlertasConfig } from './AlertaCliente'

export function ConfiguracaoAlertas({ empresaId }: { empresaId: string }) {
    const [cfg, setCfg] = useState<AlertasConfig | null>(null)
    const [salvando, setSalvando] = useState(false)

    useEffect(() => {
        if (empresaId) carregarAlertasConfig(empresaId, true).then(c => setCfg(JSON.parse(JSON.stringify(c))))
    }, [empresaId])

    if (!cfg) return <div className="py-10 text-center text-muted-foreground">Carregando...</div>

    const muda = (n: keyof AlertasConfig, campo: keyof AlertasConfig['atencao'], valor: string | boolean) =>
        setCfg(prev => prev ? { ...prev, [n]: { ...prev[n], [campo]: valor } } : prev)

    const salvar = async () => {
        setSalvando(true)
        try {
            await salvarAlertasConfig(empresaId, cfg)
            toast.success('Alertas salvos.')
        } catch (e: any) {
            toast.error('Não foi possível salvar: ' + (e?.message || e))
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Marque um alerta no cadastro do cliente e ele aparece para quem for abrir OS para ele.
                Aqui você escolhe o nome de cada alerta e a mensagem que aparece. Só o dono e os administradores marcam alertas; os técnicos só veem.
            </p>

            {NIVEIS.map(n => (
                <div key={n} className={`rounded-2xl border p-4 space-y-3 ${cfg[n].ativo ? 'bg-card' : 'bg-muted/40 opacity-70'}`}>
                    <div className="flex items-center justify-between gap-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${CORES[n].selo}`}>
                            {CORES[n].emoji} {cfg[n].rotulo || ALERTAS_PADRAO[n].rotulo}
                        </span>
                        <label className="flex items-center gap-2 text-sm font-medium">
                            {cfg[n].ativo ? 'Ligado' : 'Desligado'}
                            <Switch checked={cfg[n].ativo} onCheckedChange={v => muda(n, 'ativo', v)} />
                        </label>
                    </div>

                    {cfg[n].ativo && (
                        <>
                            <div className="space-y-1">
                                <Label>Nome do alerta</Label>
                                <Input maxLength={30} value={cfg[n].rotulo} placeholder={ALERTAS_PADRAO[n].rotulo}
                                    onChange={e => muda(n, 'rotulo', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Mensagem que aparece ao abrir OS</Label>
                                <textarea maxLength={200} value={cfg[n].mensagem} placeholder={ALERTAS_PADRAO[n].mensagem}
                                    onChange={e => muda(n, 'mensagem', e.target.value)}
                                    className="w-full min-h-[64px] rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                <div className={`rounded-xl border-2 p-2.5 text-sm font-bold ${CORES[n].faixa}`}>
                                    {CORES[n].emoji} {cfg[n].mensagem || ALERTAS_PADRAO[n].mensagem}
                                </div>
                            </div>
                            <label className="flex items-center justify-between gap-3 text-sm">
                                <span>Perguntar "Abrir OS mesmo assim?" antes de salvar a OS</span>
                                <Switch checked={cfg[n].confirmar} onCheckedChange={v => muda(n, 'confirmar', v)} />
                            </label>
                        </>
                    )}
                </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setCfg(JSON.parse(JSON.stringify(ALERTAS_PADRAO)))}>
                    Voltar aos textos padrão
                </Button>
                <Button type="button" onClick={salvar} disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Salvar alertas'}
                </Button>
            </div>
        </div>
    )
}

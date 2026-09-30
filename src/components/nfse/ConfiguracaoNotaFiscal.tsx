import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, CheckCircle2, AlertTriangle, Wifi, KeyRound, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';
import { ConfigurarFocusNFe } from '@/components/ConfigurarFocusNFe';
import { Switch } from '@/components/ui/switch';

type Provedor = 'focus' | 'contora';

interface ConfigNfse {
    provedor: Provedor;
    contora_ambiente: 'homologacao' | 'producao';
    contora_cnpj: string | null;
    contora_empresa_id: string | null;
    contora_total_tax_rate_sn: number | null;
    local_prestacao_cliente: boolean;
}

interface EmpresaContora {
    id: string;
    cnpj: string;
    razao_social: string;
    nome_fantasia: string | null;
    cidade: string | null;
    uf: string | null;
    regime: string | null;
    certificado_ate: string | null;
    tem_certificado: boolean;
}

interface ResultadoTeste {
    empresas: EmpresaContora[];
    selecionada: EmpresaContora | null;
    pronta: boolean;
    pendencias: string[];
}

const PADRAO: ConfigNfse = {
    provedor: 'focus',
    contora_ambiente: 'producao',
    contora_cnpj: null,
    contora_empresa_id: null,
    contora_total_tax_rate_sn: null,
    local_prestacao_cliente: false,
};

const NOMES: Record<Provedor, string> = { focus: 'Focus NFe', contora: 'Fiscal Contora' };

const formatarCnpj =(c: string) =>
    c.replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

const formatarData = (d: string | null) => (d ? d.split('-').reverse().join('/') : '');

// Chama a Edge Function da Contora. O token nunca volta para o navegador.
async function chamarContora(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('nfse-contora', { body });
    if (error) throw new Error('Serviço de nota fiscal indisponível no momento.');
    return data as any;
}

export function ConfiguracaoNotaFiscal({ empresaId }: { empresaId: string }) {
    const [carregando, setCarregando] = useState(true);
    const [indisponivel, setIndisponivel] = useState(false);
    const [config, setConfig] = useState<ConfigNfse>(PADRAO);
    const [tokenDefinido, setTokenDefinido] = useState(false);
    const [trocandoToken, setTrocandoToken] = useState(false);
    const [tokenNovo, setTokenNovo] = useState('');
    const [percentual, setPercentual] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [salvandoToken, setSalvandoToken] = useState(false);
    const [testando, setTestando] = useState(false);
    const [teste, setTeste] = useState<ResultadoTeste | null>(null);
    // Aba que está sendo VISTA (não muda o emissor em uso)
    const [aba, setAba] = useState<Provedor>('focus');

    // Token que o laboratório (/teste-contora) já guardou neste navegador
    const tokenDoComputador = (() => {
        try { return localStorage.getItem('contora_lab_api_key') || ''; } catch { return ''; }
    })();

    const carregar = useCallback(async () => {
        if (!empresaId) return;
        setCarregando(true);
        try {
            const { data, error } = await (supabase as any)
                .from('empresa_nfse_config')
                .select('provedor, contora_ambiente, contora_cnpj, contora_empresa_id, contora_total_tax_rate_sn, local_prestacao_cliente')
                .eq('empresa_id', empresaId)
                .maybeSingle();
            if (error) throw error;
            const atual = { ...PADRAO, ...(data || {}) } as ConfigNfse;
            setConfig(atual);
            setAba(atual.provedor);
            setPercentual(atual.contora_total_tax_rate_sn != null ? String(atual.contora_total_tax_rate_sn).replace('.', ',') : '');
            setIndisponivel(false);

            const r = await chamarContora({ acao: 'carregar' }).catch(() => null);
            setTokenDefinido(!!r?.token_definido);
        } catch {
            // Tabela ainda não criada no banco: mantém a tela da Focus funcionando como antes
            setIndisponivel(true);
        } finally {
            setCarregando(false);
        }
    }, [empresaId]);

    useEffect(() => { carregar(); }, [carregar]);

    const gravar = async (parcial: Partial<ConfigNfse>) => {
        const novo = { ...config, ...parcial };
        const { error } = await (supabase as any)
            .from('empresa_nfse_config')
            .upsert({ empresa_id: empresaId, ...novo, updated_at: new Date().toISOString() });
        if (error) throw error;
        setConfig(novo);
    };

    const trocarProvedor = async (provedor: Provedor) => {
        if (provedor === config.provedor) return;
        const nome = NOMES[provedor];
        if (!window.confirm(`Passar a emitir as notas das OS pela ${nome}?\n\nNotas já emitidas continuam no emissor onde foram feitas.`)) return;
        try {
            await gravar({ provedor });
            toast.success(provedor === 'focus' ? 'Emissor ativo: Focus NFe' : 'Emissor ativo: Fiscal Contora');
        } catch (e: any) {
            toast.error(`Não foi possível trocar o emissor: ${e.message}`);
        }
    };

    const salvarToken = async (token = tokenNovo) => {
        setSalvandoToken(true);
        try {
            const r = await chamarContora({ acao: 'salvar_token', token });
            if (!r?.ok) { toast.error(r?.erro || 'Token recusado'); return; }
            setTokenDefinido(true);
            setTrocandoToken(false);
            setTokenNovo('');
            toast.success('Token conferido na Contora e salvo');
            await testar();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSalvandoToken(false);
        }
    };

    const testar = async (cnpj?: string) => {
        setTestando(true);
        try {
            const r = await chamarContora({ acao: 'testar', cnpj: cnpj ?? config.contora_cnpj });
            if (!r?.ok) { toast.error(r?.erro || 'Falha no teste'); setTeste(null); return; }
            setTeste(r);
            // Guarda a empresa encontrada para a emissão usar depois
            if (r.selecionada && (r.selecionada.cnpj !== config.contora_cnpj || r.selecionada.id !== config.contora_empresa_id)) {
                await gravar({ contora_cnpj: r.selecionada.cnpj, contora_empresa_id: r.selecionada.id }).catch(() => { });
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setTestando(false);
        }
    };

    const salvarContora = async () => {
        const p = percentual.trim() ? Number(percentual.replace(',', '.')) : null;
        if (p != null && (isNaN(p) || p < 0 || p > 100)) {
            toast.error('O percentual do Simples deve ficar entre 0 e 100');
            return;
        }
        setSalvando(true);
        try {
            await gravar({ contora_ambiente: config.contora_ambiente, contora_total_tax_rate_sn: p, local_prestacao_cliente: config.local_prestacao_cliente });
            toast.success('Configuração da Contora salva');
        } catch (e: any) {
            toast.error(`Não foi possível salvar: ${e.message}`);
        } finally {
            setSalvando(false);
        }
    };

    if (carregando) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando nota fiscal...</div>;
    }

    // Enquanto o banco não tiver a tabela nova, a tela continua exatamente como era
    if (indisponivel) {
        return <ConfigurarFocusNFe empresaId={empresaId} />;
    }

    return (
        <div className="space-y-4">
            {/* Emissor EM USO (é o que o botão "Emitir NFS-e" das OS usa) */}
            <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300/80">As OS emitem nota por</p>
                    <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{NOMES[config.provedor]}</p>
                </div>
            </div>

            {/* Abas: só mostram a configuração, não trocam o emissor */}
            <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ver configuração de</Label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted">
                    {(['focus', 'contora'] as const).map(id => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setAba(id)}
                            className={`h-10 rounded-lg text-sm font-semibold transition-colors ${aba === id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {NOMES[id]}
                            {config.provedor === id && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">em uso</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Aviso quando está vendo o emissor que NÃO está em uso */}
            {aba !== config.provedor && (
                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center gap-3">
                    <p className="text-sm flex-1">
                        A <strong>{NOMES[aba]}</strong> não está em uso. As OS continuam emitindo pela <strong>{NOMES[config.provedor]}</strong>.
                    </p>
                    <Button type="button" variant="outline" onClick={() => trocarProvedor(aba)} className="h-10 shrink-0 border-amber-400 bg-white text-amber-900 hover:bg-amber-100">
                        Passar a usar a {NOMES[aba]}
                    </Button>
                </div>
            )}

            {aba === 'focus' ? (
                <ConfigurarFocusNFe empresaId={empresaId} esconderAtivacao />
            ) : (
                <div className="bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm space-y-5">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                            Empresa, certificado A1, inscrição municipal e códigos do serviço são cadastrados no{' '}
                            <a href="https://fiscal.contora.com.br/console/empresas" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                                painel da Contora <ExternalLink className="inline h-3 w-3" />
                            </a>. Aqui você só conecta o token.
                        </span>
                    </div>

                    {/* Token */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Token da API</Label>
                        {tokenDefinido && !trocandoToken ? (
                            <div className="flex items-center gap-2 h-11 px-3 rounded-lg border border-border bg-muted/40">
                                <KeyRound className="h-4 w-4 text-muted-foreground" />
                                <span className="flex-1 text-sm text-muted-foreground tracking-widest">••••••••••••</span>
                                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">salvo</span>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setTrocandoToken(true)}>Trocar</Button>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-2">
                                {/* type="text" mascarado: evita que o Chrome ofereça senhas salvas neste campo */}
                                <Input
                                    type="text"
                                    name="contora-api-token"
                                    value={tokenNovo}
                                    onChange={e => setTokenNovo(e.target.value)}
                                    placeholder="fct_..."
                                    autoComplete="off"
                                    spellCheck={false}
                                    data-lpignore="true"
                                    data-1p-ignore
                                    style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                                    className="h-11 font-mono text-xs"
                                />
                                <Button type="button" onClick={() => salvarToken()} disabled={salvandoToken || !tokenNovo.trim()} className="h-11">
                                    {salvandoToken ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar token'}
                                </Button>
                            </div>
                        )}
                        {(!tokenDefinido || trocandoToken) && tokenDoComputador && (
                            <button
                                type="button"
                                onClick={() => salvarToken(tokenDoComputador)}
                                disabled={salvandoToken}
                                className="w-full text-left flex items-center gap-2 p-3 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/60 text-emerald-900 text-sm hover:bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-200"
                            >
                                <KeyRound className="h-4 w-4 shrink-0" />
                                <span className="flex-1">
                                    Usar o token já salvo neste computador
                                    <span className="block text-xs opacity-75">o que foi usado no laboratório de testes · termina em …{tokenDoComputador.slice(-4)}</span>
                                </span>
                            </button>
                        )}
                        <p className="text-xs text-muted-foreground">Criado em Chaves de API, no painel da Contora. Fica guardado no servidor e não aparece mais na tela.</p>
                    </div>

                    {/* Ambiente */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ambiente</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {([['homologacao', 'Homologação (testes)'], ['producao', 'Produção (valendo)']] as const).map(([id, nome]) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setConfig(c => ({ ...c, contora_ambiente: id }))}
                                    className={`h-11 rounded-lg border text-sm font-medium transition-colors ${config.contora_ambiente === id
                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200'
                                        : 'border-border bg-background hover:bg-muted'}`}
                                >
                                    {nome}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* % do Simples */}
                    <div className="space-y-2 max-w-xs">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">% total de tributos do Simples (DAS)</Label>
                        <Input
                            value={percentual}
                            onChange={e => setPercentual(e.target.value)}
                            placeholder="ex: 2,00"
                            inputMode="decimal"
                            className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">Obrigatório para empresa do Simples (ME/EPP). Deixe em branco se não for do Simples.</p>
                    </div>

                    {/* Local da prestação */}
                    <div className="rounded-lg border border-border p-3 space-y-1.5">
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                            <span className="text-sm font-semibold">Local da prestação = cidade do cliente</span>
                            <Switch
                                checked={config.local_prestacao_cliente}
                                onCheckedChange={v => setConfig(c => ({ ...c, local_prestacao_cliente: v }))}
                            />
                        </label>
                        <p className="text-xs text-muted-foreground">
                            {config.local_prestacao_cliente
                                ? 'Ligado: a nota sai com a cidade do endereço do cliente (pelo CEP). Serviço em Curitiba sai "Curitiba". Cliente sem CEP sai com a cidade da sede.'
                                : 'Desligado: toda nota sai com a cidade da sede da empresa.'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Para desentupimento e limpeza (item 7.10) o ISS é devido na cidade do serviço. No Simples a alíquota não muda, só a prefeitura que recebe: avise o contador antes de ligar.
                        </p>
                    </div>

                    {/* Resultado do teste */}
                    {teste && (
                        <div className="space-y-2">
                            {teste.empresas.length > 1 && (
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Empresa que emite</Label>
                                    <select
                                        className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm"
                                        value={teste.selecionada?.cnpj || ''}
                                        onChange={e => testar(e.target.value)}
                                    >
                                        <option value="" disabled>Escolha o CNPJ</option>
                                        {teste.empresas.map(e => (
                                            <option key={e.id} value={e.cnpj}>{formatarCnpj(e.cnpj)} · {e.nome_fantasia || e.razao_social}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {teste.selecionada && (
                                teste.pronta ? (
                                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200">
                                        <p className="text-sm font-semibold flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Pronto para emitir</p>
                                        <p className="text-xs mt-0.5">
                                            {teste.selecionada.razao_social} · {formatarCnpj(teste.selecionada.cnpj)}
                                            {teste.selecionada.certificado_ate && ` · certificado até ${formatarData(teste.selecionada.certificado_ate)}`}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200">
                                        <p className="text-sm font-semibold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Falta ajustar no painel da Contora</p>
                                        <p className="text-xs mt-0.5">{teste.selecionada.razao_social} · {formatarCnpj(teste.selecionada.cnpj)}</p>
                                        {teste.pendencias.length > 0 && (
                                            <ul className="list-disc pl-5 text-xs mt-1 space-y-0.5">
                                                {teste.pendencias.map((p, i) => <li key={i}>{p}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                )
                            )}
                            {teste.empresas.length === 0 && teste.pendencias.map((p, i) => (
                                <p key={i} className="text-xs text-red-700 dark:text-red-300">{p}</p>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
                        <Button type="button" onClick={salvarContora} disabled={salvando} className="h-11 bg-emerald-600 hover:bg-emerald-700">
                            {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar
                        </Button>
                        <Button type="button" variant="outline" onClick={() => testar()} disabled={testando || !tokenDefinido} className="h-11">
                            {testando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wifi className="h-4 w-4 mr-2" />}
                            Testar conexão
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Com a Contora ativa, o botão "Emitir NFS-e" das OS emite por ela. Notas antigas da Focus continuam sendo consultadas e canceladas pela Focus.
                    </p>
                </div>
            )}
        </div>
    );
}

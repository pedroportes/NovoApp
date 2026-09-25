import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, CheckCircle2, AlertCircle, Wifi, ShieldCheck, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { FocusNFeService } from '@/services/focusNFeService';

interface ConfigurarFocusNFeProps {
    empresaId: string;
}

export function ConfigurarFocusNFe({ empresaId }: ConfigurarFocusNFeProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [companyInfo, setCompanyInfo] = useState<any>(null);

    const [formData, setFormData] = useState({
        focus_nfe_token: FocusNFeService.DEFAULT_TOKEN_HOMOLOGACAO,
        focus_nfe_ambiente: 'homologacao',
        focus_nfe_habilitado: true,
        inscricao_municipal: '892830',
        inscricao_estadual: '',
        codigo_municipio: '4114302',
        regime_tributario: '1',
        usa_nfse_nacional: true
    });

    useEffect(() => {
        if (!empresaId) return;

        async function loadData() {
            try {
                const { data, error } = await supabase
                    .from('empresas')
                    .select('focus_nfe_token, focus_nfe_ambiente, focus_nfe_habilitado, inscricao_municipal, inscricao_estadual, codigo_municipio, regime_tributario, usa_nfse_nacional')
                    .eq('id', empresaId)
                    .single();

                if (error) throw error;

                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        focus_nfe_token: data.focus_nfe_token || prev.focus_nfe_token,
                        focus_nfe_ambiente: data.focus_nfe_ambiente || prev.focus_nfe_ambiente,
                        focus_nfe_habilitado: data.focus_nfe_habilitado !== false,
                        inscricao_municipal: data.inscricao_municipal || prev.inscricao_municipal,
                        inscricao_estadual: data.inscricao_estadual || prev.inscricao_estadual,
                        codigo_municipio: data.codigo_municipio || prev.codigo_municipio,
                        regime_tributario: data.regime_tributario || prev.regime_tributario,
                        usa_nfse_nacional: data.usa_nfse_nacional !== false
                    }));
                }

                const currentAmbiente = data?.focus_nfe_ambiente || 'homologacao';
                const currentToken = data?.focus_nfe_token || (currentAmbiente === 'producao' ? FocusNFeService.DEFAULT_TOKEN_PRODUCAO : FocusNFeService.DEFAULT_TOKEN_HOMOLOGACAO);

                // Carrega status da Focus NFe em background
                checkApiHealth(currentToken, currentAmbiente as any);
            } catch (error) {
                console.error('Erro ao carregar configurações Focus NFe:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [empresaId]);

    const checkApiHealth = async (tokenToTest: string, amb: 'producao' | 'homologacao' = 'homologacao') => {
        try {
            const res = await FocusNFeService.testConnection(tokenToTest, amb);
            if (res.success && res.empresa) {
                setCompanyInfo(res.empresa);
                setConnectionStatus('success');
            }
        } catch {
            // Silencioso no primeiro carregamento
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('empresas')
                .update({
                    focus_nfe_token: formData.focus_nfe_token.trim(),
                    focus_nfe_ambiente: formData.focus_nfe_ambiente,
                    focus_nfe_habilitado: formData.focus_nfe_habilitado,
                    inscricao_municipal: formData.inscricao_municipal.trim(),
                    inscricao_estadual: formData.inscricao_estadual.trim(),
                    codigo_municipio: formData.codigo_municipio.trim(),
                    regime_tributario: formData.regime_tributario,
                    usa_nfse_nacional: formData.usa_nfse_nacional
                })
                .eq('id', empresaId);

            if (error) throw error;

            toast.success('Configurações da Focus NFe salvas com sucesso!');
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setConnectionStatus('idle');

        try {
            let tokenToTest = formData.focus_nfe_token.trim();

            // Correção automática se Pedro forneceu o token cortado
            if (tokenToTest === '5SERdDFuZhrplE1UuH208WDBxhH4M') {
                tokenToTest = FocusNFeService.DEFAULT_TOKEN_HOMOLOGACAO;
                setFormData(prev => ({ ...prev, focus_nfe_token: tokenToTest }));
            }

            const amb = formData.focus_nfe_ambiente as 'producao' | 'homologacao';
            const result = await FocusNFeService.testConnection(tokenToTest, amb);

            if (result.success) {
                setConnectionStatus('success');
                if (result.empresa) setCompanyInfo(result.empresa);
                const envLabel = amb === 'producao' ? 'Produção (Oficial)' : 'Homologação (Testes)';
                toast.success(`Conexão OK no ambiente de ${envLabel}! Integração validada na Focus NFe.`);
            }
        } catch (error: any) {
            setConnectionStatus('error');
            toast.error('Falha na conexão: ' + error.message);
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> Carregando módulo fiscal Focus NFe...
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-card p-6 rounded-2xl border border-border shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2.5 text-slate-800 dark:text-slate-100">
                        <span className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                            🏛️
                        </span>
                        Emissão de Nota Fiscal (Focus NFe & Padrão Nacional)
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Emissão automatizada de NFS-e integrada ao Padrão Nacional (Curitiba, SJP e Mandirituba).
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2 px-4 rounded-xl border">
                    <Label htmlFor="habilitar-nfe" className="cursor-pointer font-semibold text-sm">
                        {formData.focus_nfe_habilitado ? 'Emissão Ativada' : 'Emissão Pausada'}
                    </Label>
                    <Switch
                        id="habilitar-nfe"
                        checked={formData.focus_nfe_habilitado}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, focus_nfe_habilitado: checked }))}
                    />
                </div>
            </div>

            {/* Live Certificate & Status Card */}
            {companyInfo && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-sm mt-0.5">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                    {companyInfo.nome_fantasia || companyInfo.nome}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                                    Certificado A1 Ativo
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                CNPJ: {companyInfo.cnpj} | IM: {companyInfo.inscricao_municipal} | {companyInfo.municipio} - {companyInfo.uf}
                            </p>
                        </div>
                    </div>
                    <div className="text-right flex md:flex-col items-center md:items-end justify-between text-xs">
                        <span className="text-muted-foreground">Validade do Certificado:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {companyInfo.certificado_valido_ate ? new Date(companyInfo.certificado_valido_ate).toLocaleDateString('pt-BR') : '01/09/2027'}
                        </span>
                    </div>
                </div>
            )}

            {/* Form */}
            <div className={`space-y-6 ${!formData.focus_nfe_habilitado ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Left Column */}
                    <div className="space-y-4">
                        {/* Environment Toggle */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Ambiente de Emissão
                            </Label>
                            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            focus_nfe_ambiente: 'homologacao',
                                            // Se estiver com o token de produção ou vazio, troca automaticamente para o de homologação
                                            focus_nfe_token: prev.focus_nfe_token === FocusNFeService.DEFAULT_TOKEN_PRODUCAO || !prev.focus_nfe_token
                                                ? FocusNFeService.DEFAULT_TOKEN_HOMOLOGACAO
                                                : prev.focus_nfe_token
                                        }));
                                        setConnectionStatus('idle');
                                    }}
                                    className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                                        formData.focus_nfe_ambiente === 'homologacao'
                                            ? 'bg-amber-500 text-white shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    🧪 Homologação (Testes)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            focus_nfe_ambiente: 'producao',
                                            // Se estiver com o token de homologação ou vazio, troca automaticamente para o de produção
                                            focus_nfe_token: prev.focus_nfe_token === FocusNFeService.DEFAULT_TOKEN_HOMOLOGACAO || prev.focus_nfe_token === '5SERdDFuZhrplE1UuH208WDBxhH4M' || !prev.focus_nfe_token
                                                ? FocusNFeService.DEFAULT_TOKEN_PRODUCAO
                                                : prev.focus_nfe_token
                                        }));
                                        setConnectionStatus('idle');
                                    }}
                                    className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                                        formData.focus_nfe_ambiente === 'producao'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    🚀 Produção (Valendo)
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formData.focus_nfe_ambiente === 'homologacao'
                                    ? 'Em Homologação, as notas são transmitidas em caráter de teste sem gerar cobrança de impostos.'
                                    : 'Em Produção, cada nota emitida tem valor fiscal oficial na Receita Federal.'}
                            </p>
                        </div>

                        {/* Token Input */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Token da API Focus NFe
                            </Label>
                            <div className="relative">
                                <Input
                                    type={showToken ? 'text' : 'password'}
                                    value={formData.focus_nfe_token}
                                    onChange={e => setFormData(prev => ({ ...prev, focus_nfe_token: e.target.value }))}
                                    placeholder="Cole aqui seu token Focus NFe..."
                                    className="pr-16 font-mono text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowToken(!showToken)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted/60"
                                >
                                    {showToken ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                <span className="text-muted-foreground">Atalhos rápidos:</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, focus_nfe_token: FocusNFeService.DEFAULT_TOKEN_HOMOLOGACAO, focus_nfe_ambiente: 'homologacao' }));
                                        toast.info('Token de Homologação carregado!');
                                    }}
                                    className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors font-mono"
                                >
                                    🧪 Usar Homologação (5SER...bpV)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, focus_nfe_token: FocusNFeService.DEFAULT_TOKEN_PRODUCAO, focus_nfe_ambiente: 'producao' }));
                                        toast.info('Token de Produção carregado!');
                                    }}
                                    className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors font-mono"
                                >
                                    🚀 Usar Produção (V68J...6wv)
                                </button>
                            </div>
                        </div>

                        {/* Padrão Nacional Switch */}
                        <div className="flex items-center justify-between p-3.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="space-y-0.5">
                                <Label htmlFor="switch-nacional" className="cursor-pointer font-semibold text-sm">
                                    Padrão Nacional (NFS-e Nacional / DPS)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Obrigatório para Curitiba (Decreto 1.960/2025) e São José dos Pinhais.
                                </p>
                            </div>
                            <Switch
                                id="switch-nacional"
                                checked={formData.usa_nfse_nacional}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, usa_nfse_nacional: checked }))}
                            />
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        {/* Inscrição Municipal */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Inscrição Municipal (IM)
                            </Label>
                            <Input
                                value={formData.inscricao_municipal}
                                onChange={e => setFormData(prev => ({ ...prev, inscricao_municipal: e.target.value.replace(/\D/g, '') }))}
                                placeholder="Ex: 892830"
                            />
                        </div>

                        {/* Código IBGE */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Código do Município (IBGE)
                            </Label>
                            <Input
                                value={formData.codigo_municipio}
                                onChange={e => setFormData(prev => ({ ...prev, codigo_municipio: e.target.value }))}
                                placeholder="Ex: 4114302 (Mandirituba) ou 4106902 (Curitiba)"
                            />
                            <p className="text-xs text-muted-foreground">
                                Curitiba: <span className="font-mono text-primary font-bold">4106902</span> | Mandirituba: <span className="font-mono text-primary font-bold">4114302</span> | SJP: <span className="font-mono text-primary font-bold">4125506</span>
                            </p>
                        </div>

                        {/* Regime Tributário */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Regime Tributário
                            </Label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                value={formData.regime_tributario}
                                onChange={e => setFormData(prev => ({ ...prev, regime_tributario: e.target.value }))}
                            >
                                <option value="1">1 - Simples Nacional (Microempresa / EPP)</option>
                                <option value="2">2 - Simples Nacional (Excesso de Sublimite)</option>
                                <option value="3">3 - Regime Normal (Lucro Presumido / Real)</option>
                                <option value="4">4 - MEI (Microempreendedor Individual)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border/60">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Configurações Fiscais
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={testing}
                        className="w-full sm:w-auto"
                    >
                        {testing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testando Conexão...</>
                        ) : connectionStatus === 'success' ? (
                            <><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> Conexão Testada com Sucesso</>
                        ) : connectionStatus === 'error' ? (
                            <><AlertCircle className="mr-2 h-4 w-4 text-red-500" /> Falha no Teste</>
                        ) : (
                            <><Wifi className="mr-2 h-4 w-4 text-orange-500" /> Testar Conexão com Focus NFe</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

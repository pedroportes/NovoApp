import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { WebmaniaService } from '@/services/webmaniaService';

interface ConfigurarWebmaniaProps {
    empresaId: string;
}

export function ConfigurarWebmania({ empresaId }: ConfigurarWebmaniaProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const [formData, setFormData] = useState({
        webmania_access_token: '',
        webmania_ambiente: 'homologacao',
        webmania_habilitado: false,
        webmania_classe_imposto: '',
        inscricao_municipal: '',
        codigo_municipio: '',
        regime_tributario: '',
    });

    useEffect(() => {
        if (!empresaId) return;

        async function loadData() {
            try {
                const { data, error } = await supabase
                    .from('empresas')
                    .select('webmania_access_token, webmania_ambiente, webmania_habilitado, webmania_classe_imposto, inscricao_municipal, codigo_municipio, regime_tributario')
                    .eq('id', empresaId)
                    .single() as any;

                if (error) throw error;

                if (data) {
                    const empresa = data as any;
                    setFormData({
                        webmania_access_token: empresa.webmania_access_token || '',
                        webmania_ambiente: empresa.webmania_ambiente || 'homologacao',
                        webmania_habilitado: empresa.webmania_habilitado || false,
                        webmania_classe_imposto: empresa.webmania_classe_imposto || '',
                        inscricao_municipal: empresa.inscricao_municipal || '',
                        codigo_municipio: empresa.codigo_municipio || '',
                        regime_tributario: empresa.regime_tributario || '',
                    });
                }
            } catch (error) {
                console.error('Erro ao carregar configurações Webmania:', error);
                toast.error('Erro ao carregar configurações.');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [empresaId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const dataToSave = {
                ...formData,
                webmania_access_token: formData.webmania_access_token.trim()
            };

            const { error } = await (supabase
                .from('empresas') as any)
                .update(dataToSave)
                .eq('id', empresaId);

            if (error) throw error;

            toast.success('Configurações Webmania salvas com sucesso!');
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!formData.webmania_access_token) {
            toast.error('Insira o Access Token antes de testar.');
            return;
        }

        setTesting(true);
        setConnectionStatus('idle');

        try {
            // Salvar primeiro para que o teste use as credenciais atuais
            const tokenToSave = formData.webmania_access_token.trim();
            await (supabase
                .from('empresas') as any)
                .update({ webmania_access_token: tokenToSave })
                .eq('id', empresaId);

            const result = await WebmaniaService.testConnection(empresaId);

            if (result.success) {
                setConnectionStatus('success');
                toast.success(result.message);
            }
        } catch (error: any) {
            setConnectionStatus('error');
            toast.error('Falha na conexão: ' + error.message);
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div className="p-4 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando Webmania...</div>;

    return (
        <div className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm h-fit">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">📄</span>
                    Configuração Webmania NFS-e
                </h2>
                <div className="flex items-center gap-2">
                    <Label htmlFor="habilitar-webmania" className="cursor-pointer">Habilitar Emissão</Label>
                    <Switch
                        id="habilitar-webmania"
                        checked={formData.webmania_habilitado}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, webmania_habilitado: checked }))}
                    />
                </div>
            </div>

            <p className="text-sm text-muted-foreground">
                Configure aqui seus dados para emitir notas fiscais via Webmania. O Access Token é gerado no painel da Webmania.
            </p>

            <div className={`space-y-6 ${!formData.webmania_habilitado ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Ambiente</Label>
                            <div className="flex items-center space-x-4 border p-3 rounded-md bg-background">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="homologacao_webmania"
                                        name="ambiente_webmania"
                                        checked={formData.webmania_ambiente === 'homologacao'}
                                        onChange={() => setFormData(prev => ({ ...prev, webmania_ambiente: 'homologacao' }))}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <Label htmlFor="homologacao_webmania" className="cursor-pointer">Homologação (Testes)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="producao_webmania"
                                        name="ambiente_webmania"
                                        checked={formData.webmania_ambiente === 'producao'}
                                        onChange={() => setFormData(prev => ({ ...prev, webmania_ambiente: 'producao' }))}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <Label htmlFor="producao_webmania" className="cursor-pointer">Produção</Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Access Token (Bearer)</Label>
                            <div className="relative">
                                <Input
                                    type={showToken ? "text" : "password"}
                                    value={formData.webmania_access_token}
                                    onChange={e => setFormData(prev => ({ ...prev, webmania_access_token: e.target.value }))}
                                    placeholder="Cole o token do Painel Webmania..."
                                    className="pr-16"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowToken(!showToken)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted/50"
                                >
                                    {showToken ? "Ocultar" : "Mostrar"}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Classe de Imposto Padrão (Opcional)</Label>
                            <Input
                                value={formData.webmania_classe_imposto}
                                onChange={e => setFormData(prev => ({ ...prev, webmania_classe_imposto: e.target.value }))}
                                placeholder="Ex: REF000001 (cadastrada no painel)"
                            />
                            <p className="text-xs text-muted-foreground">Se deixar em branco, os impostos serão zerados ou passados manualmente.</p>
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={testing || !formData.webmania_access_token}
                            className="w-full"
                        >
                            {testing ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testando...</>
                            ) : connectionStatus === 'success' ? (
                                <><CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Conexão OK!</>
                            ) : connectionStatus === 'error' ? (
                                <><AlertCircle className="mr-2 h-4 w-4 text-red-500" /> Falha - Tente novamente</>
                            ) : (
                                <><Wifi className="mr-2 h-4 w-4" /> Testar Conexão</>
                            )}
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Inscrição Municipal (IM)</Label>
                            <Input
                                value={formData.inscricao_municipal}
                                onChange={e => setFormData(prev => ({ ...prev, inscricao_municipal: e.target.value.replace(/\D/g, '') }))}
                                placeholder="Apenas números"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Código do Município (IBGE)</Label>
                            <Input
                                value={formData.codigo_municipio}
                                onChange={e => setFormData(prev => ({ ...prev, codigo_municipio: e.target.value }))}
                                placeholder="Ex: 4106902 (Curitiba)"
                            />
                            <p className="text-xs text-muted-foreground">7 dígitos. Consulte: <a href="https://www.ibge.gov.br/explica/codigos-dos-municipios.php" target="_blank" rel="noopener noreferrer" className="text-primary underline">IBGE</a></p>
                        </div>

                        <div className="space-y-2">
                            <Label>Regime Tributário</Label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                value={formData.regime_tributario}
                                onChange={e => setFormData(prev => ({ ...prev, regime_tributario: e.target.value }))}
                            >
                                <option value="">Selecione...</option>
                                <option value="1">Simples Nacional</option>
                                <option value="2">Simples Nacional (Excesso)</option>
                                <option value="3">Regime Normal</option>
                            </select>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full md:w-auto"
                >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Configurações Webmania
                </Button>
            </div>
        </div>
    );
}

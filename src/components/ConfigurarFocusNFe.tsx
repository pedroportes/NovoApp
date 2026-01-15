import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigurarFocusNFeProps {
    empresaId: string;
}

export function ConfigurarFocusNFe({ empresaId }: ConfigurarFocusNFeProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [formData, setFormData] = useState({
        focus_nfe_token: '',
        focus_nfe_ambiente: 'homologacao',
        focus_nfe_habilitado: false,
        inscricao_municipal: '',
        inscricao_estadual: '',
        codigo_municipio: '',
        regime_tributario: '',
        usa_nfse_nacional: false
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
                    setFormData({
                        focus_nfe_token: data.focus_nfe_token || '',
                        focus_nfe_ambiente: data.focus_nfe_ambiente || 'homologacao',
                        focus_nfe_habilitado: data.focus_nfe_habilitado || false,
                        inscricao_municipal: data.inscricao_municipal || '',
                        inscricao_estadual: data.inscricao_estadual || '',
                        codigo_municipio: data.codigo_municipio || '',
                        regime_tributario: data.regime_tributario || '',
                        usa_nfse_nacional: data.usa_nfse_nacional || false
                    });
                }
            } catch (error) {
                console.error('Erro ao carregar configurações Focus NFe:', error);
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
            const { error } = await supabase
                .from('empresas')
                .update(formData)
                .eq('id', empresaId);

            if (error) throw error;

            toast.success('Configurações salvas com sucesso!');
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando Focus NFe...</div>;

    return (
        <div className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm h-fit">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">🏛️</span>
                    Configuração Focus NFe (Simples)
                </h2>
                <div className="flex items-center gap-2">
                    <Label htmlFor="habilitar-nfe" className="cursor-pointer">Habilitar Emissão</Label>
                    <Switch
                        id="habilitar-nfe"
                        checked={formData.focus_nfe_habilitado}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, focus_nfe_habilitado: checked }))}
                    />
                </div>
            </div>

            <p className="text-sm text-muted-foreground">
                Configure aqui seus dados para emitir notas fiscais. O token deve ser gerado no painel da Focus NFe.
            </p>

            <div className={`space-y-6 ${!formData.focus_nfe_habilitado ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Ambiente</Label>
                            <div className="flex items-center space-x-4 border p-3 rounded-md bg-background">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="homologacao_new"
                                        name="ambiente_new"
                                        checked={formData.focus_nfe_ambiente === 'homologacao'}
                                        onChange={() => setFormData(prev => ({ ...prev, focus_nfe_ambiente: 'homologacao' }))}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <Label htmlFor="homologacao_new" className="cursor-pointer">Homologação (Testes)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="producao_new"
                                        name="ambiente_new"
                                        checked={formData.focus_nfe_ambiente === 'producao'}
                                        onChange={() => setFormData(prev => ({ ...prev, focus_nfe_ambiente: 'producao' }))}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <Label htmlFor="producao_new" className="cursor-pointer">Produção</Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Token de Acesso (API Key)</Label>
                            <div className="relative">
                                <Input
                                    type={showToken ? "text" : "password"}
                                    value={formData.focus_nfe_token}
                                    onChange={e => setFormData(prev => ({ ...prev, focus_nfe_token: e.target.value }))}
                                    placeholder="Ex: WObVcOdpbVaQWIvUgi8RbLcFNku..."
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
                            <Label>Padrão de Emissão</Label>
                            <div className="flex items-center space-x-2 border p-3 rounded-md bg-background">
                                <Switch
                                    id="nfe-nacional"
                                    checked={formData.usa_nfse_nacional}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, usa_nfse_nacional: checked }))}
                                />
                                <Label htmlFor="nfe-nacional" className="cursor-pointer flex flex-col">
                                    <span>Padrão Nacional (NFSe-Nacional)</span>
                                    <span className="text-xs font-normal text-muted-foreground">Ative se sua cidade (ex: Curitiba) migrou para o padrão federal.</span>
                                </Label>
                            </div>
                        </div>
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
                                placeholder="Ex: 3550308 (São Paulo)"
                            />
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
                    Salvar Configurações Focus NFe
                </Button>
            </div>
        </div >
    );
}

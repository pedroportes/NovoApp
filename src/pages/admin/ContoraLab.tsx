import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
    ShieldCheck, 
    Send, 
    Key, 
    Building2, 
    FileText, 
    CheckCircle2, 
    AlertTriangle, 
    Loader2, 
    Download, 
    RefreshCw,
    UploadCloud,
    Lock
} from 'lucide-react';

// Único CNPJ emissor válido: Matriz Mandirituba (o mesmo usado na Focus NFe).
// A Filial Xaxim (0002-54) foi cadastrada por engano na Contora e não deve ser usada.
const MATRIZ_CNPJ = '38057542000173';
const MATRIZ_CONTORA_ID = 'ddba2acf-d7ae-42bc-8ed1-380939eebdc4';
const XAXIM_CONTORA_ID = 'eac0aed9-ab24-4cda-ad85-a652b95e403f';

type LabError = { etapa: string; codigo?: string | null; mensagem: string; detalhes?: string[] };

export function ContoraLab() {
    // 1. Configurações de API
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('contora_lab_api_key') || '');
    const [environment, setEnvironment] = useState<'homologacao' | 'producao'>('homologacao');
    const selectedCnpj = MATRIZ_CNPJ;
    const [healthStatus, setHealthStatus] = useState<string | null>(null);
    const [checkingHealth, setCheckingHealth] = useState(false);
    const [accountInfo, setAccountInfo] = useState<any>(null);

    // 2. Dados da Empresa
    const [companyId, setCompanyId] = useState(() => {
        const saved = localStorage.getItem('contora_lab_company_id');
        return saved && saved !== XAXIM_CONTORA_ID ? saved : MATRIZ_CONTORA_ID;
    });
    const [creatingCompany, setCreatingCompany] = useState(false);
    const [companyInfo, setCompanyInfo] = useState<any>(null);

    // 3. Upload do Certificado
    const [certFile, setCertFile] = useState<File | null>(null);
    const [certPassword, setCertPassword] = useState('');
    const [uploadingCert, setUploadingCert] = useState(false);
    const [certResult, setCertResult] = useState<any>(null);

    // 4. Emissão de Teste
    const [testAmount, setTestAmount] = useState('1.00');
    const [testClientName, setTestClientName] = useState('Cliente Teste Laboratorio');
    const [testClientCpf, setTestClientCpf] = useState('79055770906');
    const [testRpsNumber, setTestRpsNumber] = useState('');
    const [testSeries, setTestSeries] = useState('1');
    const [testTaxRateSn, setTestTaxRateSn] = useState('');
    const [emitting, setEmitting] = useState(false);
    const [lastDraftId, setLastDraftId] = useState<string>('');
    const [dispatching, setDispatching] = useState(false);
    const [emissionStatus, setEmissionStatus] = useState<any>(null);
    const [labError, setLabError] = useState<LabError | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const [rawLogs, setRawLogs] = useState<string[]>([]);

    useEffect(() => {
        if (apiKey) {
            localStorage.setItem('contora_lab_api_key', apiKey);
        }
    }, [apiKey]);

    useEffect(() => {
        if (companyId) {
            localStorage.setItem('contora_lab_company_id', companyId);
        }
    }, [companyId]);

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString('pt-BR');
        setRawLogs(prev => [`[${time}] ${msg}`, ...prev]);
    };

    // Helper para extrair mensagens de erro da Contora
    // Envelope de erro da v1: { ok: false, message, error: { type, ... }, errors?: {campo: [msgs]} }
    const parseErrorMessage = (data: any, status?: number) => {
        const partes: string[] = [];
        if (data?.message) partes.push(data.message);
        const errors = data?.errors || data?.error?.errors || data?.error?.details;
        if (errors && typeof errors === 'object') {
            partes.push(Object.entries(errors)
                .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : typeof msgs === 'string' ? msgs : JSON.stringify(msgs)}`)
                .join(' | '));
        }
        if (data?.error?.type) partes.push(`(${data.error.type})`);
        if (partes.length === 0) partes.push(JSON.stringify(data));
        return `${status ? `HTTP ${status} — ` : ''}${partes.join(' ')}`;
    };

    // Quando a empresa não está pronta, a Contora explica o motivo em /nfse/health
    const fetchHealthBlocks = async (): Promise<string[]> => {
        try {
            const res = await fetch(`https://fiscal.contora.com.br/api/v1/companies/${companyId}/nfse/health`, {
                headers: { 'Authorization': `Bearer ${apiKey.trim()}`, 'Accept': 'application/json' }
            });
            const data = await res.json();
            const health = data?.data?.health;
            addLog(`Saúde NFS-e da empresa: ${JSON.stringify(health)}`);
            return health?.ready ? [] : (health?.blocks || []);
        } catch {
            return [];
        }
    };

    const showError = (err: LabError) => {
        setLabError(err);
        toast.error(`${err.etapa}: ${err.codigo ? `${err.codigo} — ` : ''}${err.mensagem}`, { duration: 15000 });
    };

    // --- Passo 1: Testar Conexão / GET /me e /companies ---
    const handleTestConnection = async () => {
        if (!apiKey.trim()) {
            toast.error('Informe o token da API da Contora');
            return;
        }

        setCheckingHealth(true);
        try {
            addLog('Consultando /api/v1/me na Contora...');
            const meRes = await fetch('https://fiscal.contora.com.br/api/v1/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Accept': 'application/json'
                }
            });

            const meData = await meRes.json();
            if (meRes.ok) {
                setHealthStatus('ONLINE');
                setAccountInfo(meData.data || meData);
                toast.success('Conexão estabelecida com sucesso com a Fiscal Contora!');
                addLog(`Identidade Contora: ${JSON.stringify(meData.data || meData)}`);
            } else {
                setHealthStatus('ERRO');
                toast.error(`Erro de conexão (${meRes.status}): ${parseErrorMessage(meData)}`);
                addLog(`Erro ${meRes.status}: ${JSON.stringify(meData)}`);
            }

            // Consultar empresas cadastradas
            addLog('Consultando lista de empresas (/api/v1/companies)...');
            const compRes = await fetch('https://fiscal.contora.com.br/api/v1/companies', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Accept': 'application/json'
                }
            });

            if (compRes.ok) {
                const compData = await compRes.json();
                const list = compData.data || compData || [];
                addLog(`Empresas cadastradas: ${list.length} encontrada(s)`);
                
                // Procurar empresa correspondente ao CNPJ selecionado
                const matched = list.find((c: any) => c.document === selectedCnpj || c.document?.replace(/\D/g, '') === selectedCnpj);
                if (matched) {
                    setCompanyId(matched.id);
                    setCompanyInfo(matched);
                    addLog(`Empresa ${selectedCnpj} já cadastrada na Contora! ID: ${matched.id}`);
                }
            }

        } catch (err: any) {
            setHealthStatus('FALHA');
            toast.error(`Falha de rede: ${err.message}`);
            addLog(`Exceção: ${err.message}`);
        } finally {
            setCheckingHealth(false);
        }
    };

    // --- Passo 2: Cadastrar Empresa no Contora ---
    const handleRegisterCompany = async () => {
        if (!apiKey.trim()) {
            toast.error('Informe o token da API no Passo 1');
            return;
        }

        setCreatingCompany(true);
        try {
            addLog(`Cadastrando empresa CNPJ ${selectedCnpj} (Matriz Mandirituba)...`);

            const payload = {
                legal_name: "GRACINHA DO CARMO GONCALVES LTDA",
                trade_name: "Desentupidora Hidro Curitiba (Matriz)",
                document: "38057542000173",
                tax_regime: "simples",
                phone: "4135400220",
                state_code: "PR",
                city_code: "4114302", // Mandirituba
                city_name: "Mandirituba",
                street: "R. Principal",
                number: "100",
                district: "Centro",
                postal_code: "83800000",
                default_environment: environment
            };

            const res = await fetch('https://fiscal.contora.com.br/api/v1/companies', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Idempotency-Key': `comp_${Date.now()}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && (data.data?.id || data.id)) {
                const id = data.data?.id || data.id;
                setCompanyId(id);
                setCompanyInfo(data.data || data);
                toast.success('Empresa cadastrada na Contora com sucesso!');
                addLog(`Empresa criada com ID: ${id}`);
            } else {
                const errMsg = parseErrorMessage(data, res.status);
                toast.error(`Erro ao cadastrar: ${errMsg}`);
                addLog(`Erro no cadastro (${res.status}): ${JSON.stringify(data)}`);
            }
        } catch (err: any) {
            toast.error(`Erro: ${err.message}`);
            addLog(`Exceção: ${err.message}`);
        } finally {
            setCreatingCompany(false);
        }
    };

    // --- Passo 3: Upload do Certificado Digital A1 ---
    const handleUploadCertificate = async () => {
        if (!apiKey.trim()) {
            toast.error('Informe a API Key no Passo 1');
            return;
        }
        if (!certFile) {
            toast.error('Selecione o arquivo do certificado digital (.pfx ou .p12)');
            return;
        }
        if (!certPassword) {
            toast.error('Digite a senha do certificado digital');
            return;
        }

        setUploadingCert(true);
        try {
            addLog(`Enviando certificado A1 para CNPJ ${selectedCnpj} (arquivo: ${certFile.name})...`);
            const formData = new FormData();
            formData.append('certificate', certFile);
            formData.append('password', certPassword);

            // Se tiver companyId, usa rota hierárquica. Senão, rota global com X-Company-Document
            const url = companyId.trim()
                ? `https://fiscal.contora.com.br/api/v1/companies/${companyId.trim()}/certificate`
                : `https://fiscal.contora.com.br/api/v1/certificate`;

            addLog(`Disparando POST para ${url} com X-Company-Document: ${selectedCnpj}...`);

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Accept': 'application/json',
                    'X-Company-Document': selectedCnpj
                },
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                setCertResult(data.data || data);
                toast.success('Certificado Digital A1 validado e salvo com sucesso na Contora!');
                addLog(`Certificado gravado com sucesso: ${JSON.stringify(data)}`);
            } else {
                const errMsg = parseErrorMessage(data, res.status);
                toast.error(`Falha no certificado: ${errMsg}`);
                addLog(`Erro no certificado (${res.status}): ${JSON.stringify(data)}`);
            }
        } catch (err: any) {
            toast.error(`Erro ao enviar certificado: ${err.message}`);
            addLog(`Exceção no envio: ${err.message}`);
        } finally {
            setUploadingCert(false);
        }
    };

    // --- Passo 4: Criar Rascunho NFS-e ---
    const handleCreateDraft = async () => {
        if (!apiKey.trim()) {
            toast.error('Informe o token da API');
            return;
        }

        setEmitting(true);
        setLabError(null);
        try {
            addLog(`Criando Rascunho de NFS-e para CNPJ ${selectedCnpj} (ambiente: ${environment})...`);

            // RPS em branco = a Contora aloca o próximo número livre da série no despacho
            const rps = parseInt(testRpsNumber);
            const numero = Number.isFinite(rps) && rps > 0 ? { number: rps } : {};

            const draftPayload = {
                environment: environment,
                series: parseInt(testSeries) || 1,
                ...numero,
                payload: {
                    series: parseInt(testSeries) || 1,
                    ...numero,
                    // Espelho da DPS da NFS-e 580 autorizada via Focus (focusNFeService.ts):
                    // cTribNac 071001, cNBS 124021000, tribISSQN=1 (tributável), tpRetISSQN=1 (não retido).
                    // O "Não optante" (opSimpNac=1) vem do cadastro da empresa na Contora (tax_regime=presumido).
                    service: {
                        description: "Servicos ref. a OS: Desentupimento e Limpeza de Esgotos - Teste Tecnico",
                        national_tax_code: "071001",
                        nbs_code: "124021000",
                        cnae: "8129000",
                        iss_rate: 2,
                        iss_tax_situation: "tributavel",
                        iss_withheld: false,
                        // O Sistema Nacional confirmou (E0160) que a empresa é optante ME/EPP: nesse caso vai o
                        // percentual total do Simples (pTotTribSN). Os percentuais da Lei 12.741 são só para não optante.
                        ...(parseFloat(testTaxRateSn) > 0
                            ? { total_tax_rate_sn: parseFloat(testTaxRateSn) }
                            : { approximate_tax_percentages: { federal: 0, state: 0, municipal: 2 } })
                    },
                    taker: {
                        name: testClientName,
                        document: testClientCpf.replace(/\D/g, '') || "79055770906",
                        email: "teste@flowdrain.com.br",
                        phone: "41984501037",
                        address: {
                            // Mesmo endereço do tomador da NFS-e 580 autorizada via Focus (CEP coerente com o município)
                            street: "Rua Francisco Portes",
                            number: "520",
                            district: "Vila Portes",
                            city_code: "4114302",
                            state_code: "PR",
                            postal_code: "83805070"
                        }
                    },
                    amounts: {
                        service_amount: parseFloat(testAmount),
                        net_amount: parseFloat(testAmount)
                    }
                }
            };

            const draftRes = await fetch('https://fiscal.contora.com.br/api/v1/nfse/drafts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Company-Document': selectedCnpj,
                    'Idempotency-Key': `draft_${Date.now()}`
                },
                body: JSON.stringify(draftPayload)
            });

            const draftData = await draftRes.json();
            if (!draftRes.ok || !(draftData.data?.id || draftData.id)) {
                addLog(`Erro ao criar rascunho: ${JSON.stringify(draftData)}`);
                showError({ etapa: 'Criação do rascunho', codigo: draftData?.error?.type, mensagem: parseErrorMessage(draftData, draftRes.status) });
                return;
            }

            const docId = draftData.data?.id || draftData.id;
            setLastDraftId(docId);
            setEmissionStatus(draftData.data || draftData);
            addLog(`Rascunho criado com sucesso! ID: ${docId}`);
            toast.success(`Rascunho criado! ID: ${docId}`);

        } catch (err: any) {
            showError({ etapa: 'Criação do rascunho', mensagem: `Falha de rede: ${err.message}` });
            addLog(`Falha na criação: ${err.message}`);
        } finally {
            setEmitting(false);
        }
    };

    // --- Passo 5: Despachar Rascunho para a Prefeitura ---
    const handleDispatch = async (docIdToDispatch?: string) => {
        const docId = docIdToDispatch || lastDraftId;
        if (!docId) {
            toast.error('Informe o ID do documento para despachar');
            return;
        }

        setDispatching(true);
        setLabError(null);
        try {
            addLog(`Despachando documento ${docId} para a Prefeitura (POST /dispatch)... Body: { action: "submit" }`);
            const dispatchRes = await fetch(`https://fiscal.contora.com.br/api/v1/nfse/drafts/${docId}/dispatch`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Company-Document': selectedCnpj,
                    'Idempotency-Key': `disp_${docId}_${Date.now()}`
                },
                body: JSON.stringify({ action: "submit" })
            });

            const dispatchData = await dispatchRes.json().catch(() => ({}));
            addLog(`Resposta do despacho (${dispatchRes.status}): ${JSON.stringify(dispatchData)}`);

            if (!dispatchRes.ok) {
                // Recusado antes de ir à prefeitura: mostra o motivo e o que falta no cadastro
                const detalhes = await fetchHealthBlocks();
                showError({
                    etapa: 'Despacho recusado pela Contora',
                    codigo: dispatchData?.error?.type,
                    mensagem: parseErrorMessage(dispatchData, dispatchRes.status),
                    detalhes
                });
                await handleCheckStatus(docId);
                return;
            }

            toast.success('Despacho aceito (202). Aguardando a resposta da prefeitura...');
            // Resultado é assíncrono: acompanha até autorizar ou dar erro
            await pollStatus(docId, doc => !isProcessing(doc));

        } catch (err: any) {
            showError({ etapa: 'Despacho', mensagem: `Falha de rede: ${err.message}` });
            addLog(`Erro despacho: ${err.message}`);
        } finally {
            setDispatching(false);
        }
    };

    const docStatus = (doc: any) => doc?.lifecycle?.status || doc?.status;
    const docProcessing = (doc: any) => doc?.lifecycle?.processing_status || doc?.processing_status;
    const isProcessing = (doc: any) =>
        ['pending', 'queued', 'processing'].includes(docProcessing(doc)) ||
        ['building', 'built', 'built_signed', 'sending', 'sent', 'queued'].includes(docStatus(doc));
    const cancellationFinal = (doc: any) =>
        docStatus(doc) === 'cancelled' ||
        ['cancelled', 'canceled', 'rejected', 'error', 'failed'].includes(doc?.cancellation?.status);

    // Consulta a cada 4s (até ~1 min) enquanto a condição de parada não for atingida
    const pollStatus = async (id: string, done: (doc: any) => boolean) => {
        for (let tentativa = 1; tentativa <= 15; tentativa++) {
            await new Promise(r => setTimeout(r, 4000));
            const doc = await handleCheckStatus(id, true);
            if (!doc || done(doc)) return doc;
            addLog(`Ainda processando (tentativa ${tentativa}/15)...`);
        }
        toast.warning('A prefeitura ainda não respondeu. Clique em "Consultar Status" daqui a pouco.');
    };

    const handleCheckStatus = async (idToCheck?: string, silent = false) => {
        const id = idToCheck || lastDraftId;
        if (!id) {
            toast.error('Nenhum documento para consultar');
            return null;
        }

        try {
            addLog(`Consultando situação do documento ${id}...`);
            const res = await fetch(`https://fiscal.contora.com.br/api/v1/nfse/drafts/${id}/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Accept': 'application/json',
                    'X-Company-Document': selectedCnpj
                }
            });

            const data = await res.json();
            if (!res.ok) {
                showError({ etapa: 'Consulta de status', codigo: data?.error?.type, mensagem: parseErrorMessage(data, res.status) });
                return null;
            }
            const doc = data.data || data;
            setEmissionStatus(doc);
            addLog(`Status recebido: ${JSON.stringify(doc)}`);

            if (docStatus(doc) === 'error' || doc?.last_error_code) {
                showError({
                    etapa: 'Rejeitada pela prefeitura / Sistema Nacional',
                    codigo: doc.last_error_code,
                    mensagem: doc.last_error_message || doc.build_errors || doc.provider?.message || 'Erro sem mensagem',
                });
            } else if (['rejected', 'error', 'failed'].includes(doc?.cancellation?.status)) {
                showError({
                    etapa: 'Cancelamento recusado',
                    codigo: doc.cancellation.status_code,
                    mensagem: doc.cancellation.status_message || 'Cancelamento não aceito',
                });
            } else if (!silent || !isProcessing(doc)) {
                setLabError(null);
                if (docStatus(doc) === 'authorized') toast.success(`NFS-e nº ${doc.nfse_number} AUTORIZADA!`);
                if (docStatus(doc) === 'cancelled' || doc?.cancellation?.status === 'cancelled') toast.success('NFS-e CANCELADA na prefeitura.');
            }
            return doc;
        } catch (err: any) {
            showError({ etapa: 'Consulta de status', mensagem: `Falha de rede: ${err.message}` });
            addLog(`Erro consulta: ${err.message}`);
            return null;
        }
    };

    // Os artefatos exigem o token, então não dá para abrir o link direto
    const handleDownloadArtifact = async (artifact: 'pdf_nfse' | 'xml_nfse') => {
        try {
            const res = await fetch(`https://fiscal.contora.com.br/api/v1/nfse/drafts/${lastDraftId}/artifacts/${artifact}`, {
                headers: { 'Authorization': `Bearer ${apiKey.trim()}`, 'X-Company-Document': selectedCnpj }
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                showError({ etapa: 'Download do arquivo', mensagem: parseErrorMessage(data, res.status) });
                return;
            }
            const url = URL.createObjectURL(await res.blob());
            const a = document.createElement('a');
            a.href = url;
            a.download = `nfse-${emissionStatus?.nfse_number || lastDraftId}.${artifact === 'pdf_nfse' ? 'pdf' : 'xml'}`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        } catch (err: any) {
            showError({ etapa: 'Download do arquivo', mensagem: `Falha de rede: ${err.message}` });
        }
    };

    // --- Cancelamento de NFS-e autorizada (POST /cancel, assíncrono) ---
    const handleCancel = async () => {
        const id = lastDraftId;
        const motivo = cancelReason.trim();
        if (!id) return;
        if (motivo.length < 15 || motivo.length > 255) {
            toast.error('A justificativa precisa ter entre 15 e 255 caracteres.');
            return;
        }
        if (!window.confirm(`Cancelar na prefeitura a NFS-e nº ${emissionStatus?.nfse_number ?? ''}?\n\nMotivo: ${motivo}`)) return;

        setCancelling(true);
        setLabError(null);
        try {
            addLog(`Cancelando documento ${id} (POST /cancel)... Motivo: ${motivo}`);
            const res = await fetch(`https://fiscal.contora.com.br/api/v1/nfse/drafts/${id}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Company-Document': selectedCnpj,
                    'Idempotency-Key': `cancel_${id}`
                },
                body: JSON.stringify({ reason: motivo })
            });
            const data = await res.json().catch(() => ({}));
            addLog(`Resposta do cancelamento (${res.status}): ${JSON.stringify(data)}`);

            if (!res.ok) {
                showError({ etapa: 'Cancelamento recusado pela Contora', codigo: data?.error?.type, mensagem: parseErrorMessage(data, res.status) });
                return;
            }
            toast.success('Pedido de cancelamento aceito (202). Aguardando a prefeitura...');
            await pollStatus(id, cancellationFinal);
        } catch (err: any) {
            showError({ etapa: 'Cancelamento', mensagem: `Falha de rede: ${err.message}` });
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
            {/* Header de Laboratório Isolado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
                            LABORATÓRIO ISOLADO DE TESTES
                        </Badge>
                        <span className="text-xs text-muted-foreground">Zero impacto no SaaS ativo</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                        Fiscal Contora — Laboratório de NFS-e
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Área de testes para cadastrar empresa, certificado A1 e emitir notas via API oficial da Contora.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.history.back()}
                    >
                        Voltar ao SaaS
                    </Button>
                </div>
            </div>

            {/* SELETOR DE CNPJ DO TESTE */}
            <div className="p-4 bg-slate-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200">
                <div>
                    <Label className="text-xs font-bold uppercase text-slate-600">CNPJ emissor:</Label>
                    <p className="text-xs text-slate-500">Matriz Mandirituba — o mesmo CNPJ e certificado A1 usados na Focus NFe.</p>
                </div>
                <Badge className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5">
                    38.057.542/0001-73 · Mandirituba/PR
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CARD 1: Conexão & Chave API */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Key className="h-5 w-5 text-indigo-600" />
                                1. Chave de API & Ambiente
                            </CardTitle>
                            {healthStatus && (
                                <Badge variant={healthStatus === 'ONLINE' ? 'default' : 'destructive'}>
                                    {healthStatus}
                                </Badge>
                            )}
                        </div>
                        <CardDescription>
                            Cole o token (fct_...) criado no painel fiscal.contora.com.br.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="apiKey">API Token</Label>
                            <Input 
                                id="apiKey"
                                type="password"
                                placeholder="ex: fct_..."
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                className="font-mono text-xs"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Label>Ambiente da Emissão</Label>
                                <div className="flex gap-2 mt-1.5">
                                    <Button 
                                        type="button"
                                        size="sm" 
                                        variant={environment === 'homologacao' ? 'default' : 'outline'}
                                        onClick={() => setEnvironment('homologacao')}
                                        className="flex-1 text-xs"
                                    >
                                        Homologação (Testes)
                                    </Button>
                                    <Button 
                                        type="button"
                                        size="sm" 
                                        variant={environment === 'producao' ? 'destructive' : 'outline'}
                                        onClick={() => setEnvironment('producao')}
                                        className="flex-1 text-xs"
                                    >
                                        Produção (Oficial)
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={handleTestConnection} 
                            disabled={checkingHealth}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold"
                        >
                            {checkingHealth ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Testar Conexão com a Contora (/api/v1/me)
                        </Button>

                        {accountInfo && (
                            <div className="p-2.5 bg-slate-50 border rounded text-[11px] font-mono text-slate-700">
                                <p><strong>Conta:</strong> {accountInfo.name || accountInfo.email || 'Autenticado'}</p>
                                <p><strong>Tenant:</strong> {accountInfo.tenant_id || accountInfo.id}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* CARD 2: Cadastro da Empresa */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-emerald-600" />
                                2. Cadastro da Empresa
                            </CardTitle>
                            {companyId ? (
                                <Badge className="bg-emerald-600">Vinculada (ID: {companyId.slice(0, 8)}...)</Badge>
                            ) : (
                                <Badge variant="outline">Não vinculada</Badge>
                            )}
                        </div>
                        <CardDescription>
                            Os dados fiscais do prestador são cadastrados uma única vez na Contora.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-700 font-mono">
                            <p><strong>CNPJ:</strong> {selectedCnpj}</p>
                            <p><strong>Razão:</strong> GRACINHA DO CARMO GONCALVES LTDA</p>
                            <p><strong>Cidade:</strong> Mandirituba / PR (IBGE: 4114302)</p>
                        </div>

                        <div className="flex gap-2">
                            <Button 
                                onClick={handleRegisterCompany}
                                disabled={creatingCompany}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold"
                            >
                                {creatingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                                Cadastrar / Vincular no Contora
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* CARD 3: Upload do Certificado Digital A1 */}
                <Card className="border-slate-200 shadow-sm md:col-span-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-blue-600" />
                                3. Enviar Certificado Digital A1 (.pfx)
                            </CardTitle>
                            {certResult ? (
                                <Badge className="bg-blue-600">Certificado Ativo</Badge>
                            ) : (
                                <Badge variant="outline">Aguardando Envio</Badge>
                            )}
                        </div>
                        <CardDescription>
                            O certificado será vinculado ao CNPJ <strong>{selectedCnpj}</strong>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="certFile">Arquivo do Certificado (.pfx ou .p12)</Label>
                                <Input 
                                    id="certFile" 
                                    type="file" 
                                    accept=".pfx,.p12"
                                    onChange={e => setCertFile(e.target.files?.[0] || null)}
                                    className="mt-1"
                                />
                                {certFile && (
                                    <p className="text-[11px] text-emerald-600 font-bold mt-1">
                                        ✓ Arquivo selecionado: {certFile.name} ({(certFile.size / 1024).toFixed(1)} KB)
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="certPassword">Senha do Certificado</Label>
                                <div className="relative mt-1">
                                    <Input 
                                        id="certPassword" 
                                        type="password" 
                                        placeholder="Digite a senha do e-CNPJ"
                                        value={certPassword}
                                        onChange={e => setCertPassword(e.target.value)}
                                    />
                                    <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={handleUploadCertificate}
                            disabled={uploadingCert || !certFile || !certPassword}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold"
                        >
                            {uploadingCert ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                            Enviar Certificado A1 para a Contora (CNPJ: {selectedCnpj})
                        </Button>

                        {certResult && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                                <p className="font-bold flex items-center gap-1.5 text-blue-900">
                                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                    Certificado Aceito e Armazenado com Sucesso!
                                </p>
                                <pre className="mt-1 overflow-x-auto text-[11px]">{JSON.stringify(certResult, null, 2)}</pre>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* CARD 4: Emissão de NFS-e Teste */}
                <Card className="border-slate-200 shadow-sm md:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Send className="h-5 w-5 text-purple-600" />
                            4. Emissão e Despacho de NFS-e Teste
                        </CardTitle>
                        <CardDescription>
                            Fluxo em 2 passos: 1º Cria Rascunho (Draft) → 2º Despacha para Prefeitura (Dispatch).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <Label>Valor do Serviço (R$)</Label>
                                <Input 
                                    value={testAmount}
                                    onChange={e => setTestAmount(e.target.value)}
                                    placeholder="1.00"
                                />
                            </div>
                            <div>
                                <Label>Nome do Cliente Teste</Label>
                                <Input 
                                    value={testClientName}
                                    onChange={e => setTestClientName(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>CPF do Cliente Teste</Label>
                                <Input 
                                    value={testClientCpf}
                                    onChange={e => setTestClientCpf(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Nº RPS (Sequência)</Label>
                                <Input 
                                    value={testRpsNumber}
                                    onChange={e => setTestRpsNumber(e.target.value)}
                                    placeholder="Automático"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Em branco: a Contora escolhe o próximo livre.</p>
                            </div>
                            <div>
                                <Label>Série</Label>
                                <Input 
                                    value={testSeries}
                                    onChange={e => setTestSeries(e.target.value)}
                                    placeholder="1"
                                />
                            </div>
                        </div>

                        <div className="max-w-xs">
                            <Label>% total de tributos do Simples (DAS)</Label>
                            <Input
                                value={testTaxRateSn}
                                onChange={e => setTestTaxRateSn(e.target.value.replace(',', '.'))}
                                placeholder="ex: 6.00"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                                Alíquota efetiva do DAS no mês (o contador informa). Obrigatório para optante ME/EPP.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <Button 
                                onClick={handleCreateDraft}
                                disabled={emitting}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2"
                            >
                                {emitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                1. Criar Rascunho (Draft)
                            </Button>

                            <Button 
                                onClick={() => handleDispatch()}
                                disabled={dispatching || !lastDraftId}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                            >
                                {dispatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                2. Despachar para Prefeitura (Dispatch)
                            </Button>

                            {lastDraftId && (
                                <Button 
                                    variant="outline"
                                    onClick={() => handleCheckStatus()}
                                    className="gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Consultar Status
                                </Button>
                            )}
                        </div>

                        {/* Campo para inspecionar Document ID específico */}
                        <div className="flex items-center gap-2 pt-2">
                            <Label className="text-xs text-slate-500 whitespace-nowrap">Document ID:</Label>
                            <Input 
                                value={lastDraftId}
                                onChange={e => setLastDraftId(e.target.value)}
                                className="font-mono text-xs max-w-md h-8"
                                placeholder="ID do documento na Contora"
                            />
                        </div>

                        {/* Sucesso em destaque */}
                        {docStatus(emissionStatus) === 'authorized' && (
                            <div className={`p-4 rounded-xl text-sm space-y-1 border-2 ${emissionStatus?.cancellation?.status === 'cancelled' ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-emerald-50 border-emerald-300 text-emerald-900'}`}>
                                <p className="font-bold flex items-center gap-2 text-base">
                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                    {emissionStatus?.cancellation?.status === 'cancelled'
                                        ? `NFS-e nº ${emissionStatus.nfse_number} CANCELADA na prefeitura`
                                        : `NFS-e nº ${emissionStatus.nfse_number} AUTORIZADA`}
                                </p>
                                <p className="text-xs">RPS {emissionStatus.rps_number} · Série {emissionStatus.series}</p>
                                {emissionStatus.access_key && (
                                    <p className="text-xs font-mono break-all">Chave de acesso: {emissionStatus.access_key}</p>
                                )}
                                {emissionStatus.access_key && (
                                    <a href="https://www.nfse.gov.br/consultapublica" target="_blank" rel="noopener noreferrer" className="text-xs underline">
                                        Conferir no Portal Nacional da NFS-e
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Erro em destaque (não some como o toast) */}
                        {labError && (
                            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl text-sm text-red-900 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-bold flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                                        {labError.etapa}
                                    </p>
                                    <button onClick={() => setLabError(null)} className="text-xs text-red-700 underline">fechar</button>
                                </div>
                                {labError.codigo && (
                                    <p className="font-mono text-xs bg-red-100 inline-block px-2 py-0.5 rounded">Código: {labError.codigo}</p>
                                )}
                                <p className="break-words">{labError.mensagem}</p>
                                {labError.detalhes && labError.detalhes.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold mt-2">O que falta no cadastro da empresa na Contora:</p>
                                        <ul className="list-disc pl-5 text-xs space-y-0.5">
                                            {labError.detalhes.map((d, i) => <li key={i}>{d}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Status da Emissão */}
                        {emissionStatus && (
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase text-slate-500">Situação Fiscal</span>
                                    <Badge className="text-xs font-bold bg-slate-800 text-white">
                                        {emissionStatus.lifecycle?.status || emissionStatus.status || 'DRAFT'}
                                    </Badge>
                                </div>

                                <div className="text-xs font-mono bg-white p-3 rounded border text-slate-700 overflow-x-auto max-h-60">
                                    <pre>{JSON.stringify(emissionStatus, null, 2)}</pre>
                                </div>

                                {lastDraftId && docStatus(emissionStatus) === 'authorized' && (
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleDownloadArtifact('pdf_nfse')}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            Baixar DANFSe (PDF)
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleDownloadArtifact('xml_nfse')}
                                            className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold gap-1.5"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            Baixar XML
                                        </Button>
                                    </div>
                                )}

                                {/* Cancelamento: só para NFS-e autorizada e ainda não cancelada */}
                                {lastDraftId && docStatus(emissionStatus) === 'authorized' && emissionStatus?.cancellation?.status !== 'cancelled' && (
                                    <div className="pt-3 mt-2 border-t border-slate-200 space-y-2">
                                        <Label className="text-xs font-bold text-red-700">Cancelar esta NFS-e na prefeitura</Label>
                                        <Input
                                            value={cancelReason}
                                            onChange={e => setCancelReason(e.target.value)}
                                            placeholder="Justificativa (mín. 15 caracteres). Ex: Nota de teste emitida por engano."
                                            className="text-xs"
                                            maxLength={255}
                                        />
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-slate-500">{cancelReason.trim().length}/255</span>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={handleCancel}
                                                disabled={cancelling || cancelReason.trim().length < 15}
                                                className="text-xs font-bold gap-1.5"
                                            >
                                                {cancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                                Cancelar NFS-e
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {emissionStatus?.cancellation?.status && (
                                    <p className="text-xs font-bold text-slate-700">
                                        Cancelamento: {emissionStatus.cancellation.status}
                                        {emissionStatus.cancellation.status_message ? ` — ${emissionStatus.cancellation.status_message}` : ''}
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* LOGS TÉCNICOS EM TEMPO REAL */}
                <Card className="border-slate-200 shadow-sm md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-700">Console de Logs em Tempo Real</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-44 bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-[11px] overflow-y-auto space-y-1">
                            {rawLogs.length === 0 ? (
                                <p className="text-slate-500">Nenhuma ação executada ainda. Os logs aparecerão aqui.</p>
                            ) : (
                                rawLogs.map((log, idx) => <p key={idx}>{log}</p>)
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

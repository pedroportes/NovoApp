import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Bypass strict key checks for new tables not yet in types
const supabaseClient = supabase as any
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Toaster, toast } from 'sonner'
import { Loader2, Save, Upload, Trash2, Bot, Database } from 'lucide-react'
import { ContatosBloqueados } from '@/components/ContatosBloqueados'
import { GoogleGenerativeAI } from "@google/generative-ai"
import * as pdfjsLib from 'pdfjs-dist'

// Set worker source for pdf.js - using CDN with fallback
// Note: Version 5.x may not be on CDN yet, using latest stable 4.x
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

export function AIChatbot() {
    const [loading, setLoading] = useState(true)
    const [config, setConfig] = useState<any>(null)
    const [documents, setDocuments] = useState<any[]>([])

    // --- STATE FOR PROVIDER ---
    const [provider, setProvider] = useState<'zapi' | 'evolution'>('zapi')
    const [whatsappInstanceName, setWhatsappInstanceName] = useState('')

    // Z-API Fields
    const [zApiInstanceId, setZApiInstanceId] = useState('')
    const [zApiToken, setZApiToken] = useState('')
    const [zApiClientToken, setZApiClientToken] = useState('')

    // Evolution Key Fields
    const [apiKey, setApiKey] = useState('')
    const [apiUrl, setApiUrl] = useState('')
    const [instanceId, setInstanceId] = useState('') // Can overlap with zApiInstanceId conceptually but kept separate for clarity

    // Common
    const [systemPrompt, setSystemPrompt] = useState('')
    const [botName, setBotName] = useState('')

    // Upload State
    const [uploading, setUploading] = useState(false)
    const [inputText, setInputText] = useState('')

    useEffect(() => {
        fetchConfig()
    }, [])

    async function fetchConfig() {
        try {
            setLoading(true)

            // 1. Fetch Bot Config
            const { data: configData, error: configError } = await supabase
                .from('configuracoes_bot')
                .select('*')
                .maybeSingle()

            if (configError) throw configError

            if (configData) {
                setConfig(configData)

                // Common
                setWhatsappInstanceName(configData.whatsapp_instance_name || '')
                setSystemPrompt(configData.system_prompt || '')
                setBotName(configData.nome_bot || '')

                // Provider Detection
                const dbProvider = configData.provider || 'zapi'
                setProvider(dbProvider)

                if (dbProvider === 'zapi') {
                    setZApiInstanceId(configData.z_api_instance_id || '')
                    setZApiToken(configData.z_api_token || '')
                    setZApiClientToken(configData.z_api_client_token || '')
                } else {
                    // Evolution / Generic
                    setApiKey(configData.api_key || '')
                    setApiUrl(configData.api_url || '')
                    setInstanceId(configData.instance_id || '')
                }

                fetchDocuments(configData.empresa_id)
            }

        } catch (error: any) {
            console.error('Error fetching config:', error)
            toast.error('Erro ao carregar configurações: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    async function fetchDocuments(empresaId: string) {
        // ... (unchanged)
        const { data } = await supabase
            .from('conhecimento_ia')
            .select('id, conteudo, created_at, metadata')
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) setDocuments(data)
    }

    const handleSave = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get empresa_id
            const { data: userData } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
            if (!userData) throw new Error('Empresa não encontrada');

            const payload: any = {
                empresa_id: userData.empresa_id,
                whatsapp_instance_name: whatsappInstanceName,
                system_prompt: systemPrompt,
                nome_bot: botName, // Keep botName
                provider: provider,
                updated_at: new Date().toISOString()
            };

            // Save all fields to allow provider switching without losing data
            payload.z_api_instance_id = zApiInstanceId;
            payload.z_api_token = zApiToken;
            payload.z_api_client_token = zApiClientToken;
            payload.api_key = apiKey;
            payload.api_url = apiUrl;
            payload.instance_id = instanceId;

            let error;

            if (config?.id) {
                const { error: updateError } = await supabase.from('configuracoes_bot').update(payload).eq('id', config.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('configuracoes_bot').insert(payload);
                error = insertError;
            }

            if (error) throw error;

            toast.success('Configurações salvas com sucesso!');
            fetchConfig(); // Refresh to get ID if new
        } catch (error: any) {
            console.error(error);
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.type === 'application/pdf') {
            await processPDF(file)
        } else if (file.type === 'text/plain') {
            const text = await file.text()
            await processText(text, file.name)
        } else {
            toast.error('Formato não suportado. Use PDF ou TXT.')
        }
    }

    async function processPDF(file: File) {
        try {
            setUploading(true)
            toast.info('Lendo PDF...')

            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
            let fullText = ''

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i)
                const textContent = await page.getTextContent()
                const pageText = textContent.items.map((item: any) => item.str).join(' ')
                fullText += `\n--- Página ${i} ---\n${pageText}`
            }

            await processText(fullText, file.name)

        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao ler PDF: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    async function processText(text: string, sourceName: string) {
        if (!text.trim()) return

        try {
            setUploading(true)
            toast.info('Gerando Embeddings (IA)...')

            // Init Gemini
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
            const model = genAI.getGenerativeModel({ model: "text-embedding-004" })

            // Chunking simples (por parágrafos ou tamanho fixo)
            // Para simplicidade: chunks de 1000 caracteres com overlap
            const chunks = splitText(text, 1000)

            let savedCount = 0

            for (const chunk of chunks) {
                // Generate Embedding
                const result = await model.embedContent(chunk)
                const embedding = result.embedding.values

                // Save to Supabase
                const { error } = await supabase.from('conhecimento_ia').insert({
                    empresa_id: config.empresa_id,
                    conteudo: chunk,
                    embedding: embedding,
                    metadata: { source: sourceName }
                })

                if (error) {
                    console.error('Error saving chunk:', error)
                } else {
                    savedCount++
                }
            }

            toast.success(`${savedCount} fragmentos salvos com sucesso!`)
            fetchDocuments(config.empresa_id)
            setInputText('')

        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao processar IA: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    function splitText(text: string, chunkSize: number) {
        const chunks = []
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.slice(i, i + chunkSize))
        }
        return chunks
    }

    async function handleDeleteDoc(id: string) {
        if (!confirm('Deseja excluir este conhecimento?')) return
        const { error } = await supabase.from('conhecimento_ia').delete().eq('id', id)
        if (error) toast.error('Erro ao excluir')
        else {
            toast.success('Excluído')
            fetchDocuments(config.empresa_id)
        }
    }

    if (loading && !config) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">🤖 Assistente IA (RAG)</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                {/* CONFIGURAÇÃO DE CONEXÃO (PROVIDER) */}
                <Card className="col-span-1 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">📱 Conexão WhatsApp</CardTitle>
                        <CardDescription>Escolha o provedor e configure a conexão.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Provider Selector */}
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <Label className="mb-2 block">Provedor de API</Label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="provider"
                                        value="zapi"
                                        checked={provider === 'zapi'}
                                        onChange={() => setProvider('zapi')}
                                        className="h-4 w-4"
                                    />
                                    <span className="font-semibold">Z-API (Tradicional)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="provider"
                                        value="evolution"
                                        checked={provider === 'evolution'}
                                        onChange={() => setProvider('evolution')}
                                        className="h-4 w-4"
                                    />
                                    <span className="font-semibold">Evolution API (Novo)</span>
                                </label>
                            </div>
                        </div>

                        {provider === 'zapi' ? (
                            <div className="space-y-4 border-l-4 border-green-500 pl-4 py-2 bg-green-50/20 rounded-r">
                                <h3 className="font-semibold text-green-700">Configuração Z-API</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>ID da Instância</Label>
                                        <Input value={zApiInstanceId} onChange={e => setZApiInstanceId(e.target.value)} placeholder="Ex: 3ED432..." />
                                    </div>
                                    <div>
                                        <Label>Token da Instância</Label>
                                        <Input value={zApiToken} onChange={e => setZApiToken(e.target.value)} type="password" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label>Client Token (Segurança)</Label>
                                        <Input value={zApiClientToken} onChange={e => setZApiClientToken(e.target.value)} type="password" />
                                    </div>
                                </div>
                                <div className="p-3 bg-white rounded border text-xs font-mono break-all text-muted-foreground mt-2">
                                    <p className="font-bold mb-1">Webhook URL:</p>
                                    {`https://dltqxfyrltgbudtzxzot.supabase.co/functions/v1/z-api-webhook?client_token=${zApiClientToken || 'SENHA'}`}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50/20 rounded-r">
                                <h3 className="font-semibold text-blue-700">Configuração Evolution API</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <Label>API URL (Base URL)</Label>
                                        <Input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://api.evolution.com" />
                                    </div>
                                    <div>
                                        <Label>Global API Key</Label>
                                        <Input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" />
                                    </div>
                                    <div>
                                        <Label>Nome da Instância</Label>
                                        <Input value={instanceId} onChange={e => setInstanceId(e.target.value)} placeholder="Ex: Divulgacao1" />
                                    </div>
                                </div>
                                <div className="p-3 bg-white rounded border text-xs font-mono break-all text-muted-foreground mt-2">
                                    <p className="font-bold mb-1">Webhook URL:</p>
                                    {`https://dltqxfyrltgbudtzxzot.supabase.co/functions/v1/evolution-webhook`}
                                </div>
                            </div>
                        )}

                        <hr className="my-4 border-t" />

                        <div>
                            <CardTitle className="flex items-center gap-2 mb-4"><Bot size={20} /> Personalidade da IA</CardTitle>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <Label>Nome do Bot</Label>
                                    <Input value={botName} onChange={e => setBotName(e.target.value)} placeholder="Ex: Atendente Virtual" />
                                </div>
                                <div>
                                    <Label>Identificador Único (Nome da Instância no Painel)</Label>
                                    <Input value={whatsappInstanceName} onChange={e => setWhatsappInstanceName(e.target.value)} placeholder="Ex: MinhaEmpresaBot" />
                                    <p className="text-xs text-muted-foreground">Usado para identificar qual configuração carregar no webhook.</p>
                                </div>
                                <div>
                                    <Label>System Prompt (Instruções)</Label>
                                    <Textarea
                                        value={systemPrompt}
                                        onChange={e => setSystemPrompt(e.target.value)}
                                        placeholder="Ex: Você é um assistente útil..."
                                        className="h-32"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleSave} disabled={loading} className="w-full">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Configurações
                        </Button>

                    </CardContent>
                </Card>


                {/* BASE DE CONHECIMENTO */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Database /> Base de Conhecimento</CardTitle>
                        <CardDescription>O "cérebro" da sua IA. Adicione manuais e tabelas de preço.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Upload */}
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition">
                            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 mb-2">Arraste um PDF ou TXT aqui</p>
                            <input
                                type="file"
                                accept=".pdf,.txt"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                                disabled={!config?.id || uploading}
                            />
                            <label htmlFor="file-upload">
                                <Button variant="outline" asChild disabled={!config?.id || uploading}>
                                    <span>{uploading ? 'Processando...' : 'Selecionar Arquivo'}</span>
                                </Button>
                            </label>
                            {!config?.id && <p className="text-xs text-red-500 mt-2">Salve as configurações primeiro.</p>}
                        </div>

                        {/* Manual Text Input */}
                        <div className="flex gap-2">
                            <Input
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                placeholder="Ou digite um texto rápido para a IA aprender..."
                                disabled={!config?.id}
                            />
                            <Button onClick={() => processText(inputText, 'manual')} disabled={!inputText || uploading}>
                                Adicionar
                            </Button>
                        </div>

                        {/* List */}
                        <div className="space-y-2 mt-4">
                            <h3 className="font-medium text-sm text-gray-500">Documentos Recentes ({documents.length})</h3>
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {documents.map(doc => (
                                    <div key={doc.id} className="flex justify-between items-start p-3 bg-gray-50 rounded text-sm">
                                        <div className="flex-1 mr-2">
                                            <p className="font-medium truncate">{doc.metadata?.source || 'Texto Manual'}</p>
                                            <p className="text-xs text-gray-500 line-clamp-2">{doc.conteudo}</p>
                                        </div>
                                        <button onClick={() => handleDeleteDoc(doc.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                {documents.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Nenhum conhecimento adicionado ainda.</p>}
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Contatos Bloqueados */}
                {config?.empresa_id && (
                    <ContatosBloqueados empresaId={config.empresa_id} />
                )}

            </div>
        </div>
    )
}

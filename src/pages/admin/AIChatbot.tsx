import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Bypass strict key checks for new tables not yet in types
const supabaseClient = supabase as any
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Toaster, toast } from 'sonner'
import { Loader2, Save, Upload, Trash2, Bot, Database } from 'lucide-react'
import { GoogleGenerativeAI } from "@google/generative-ai"
import * as pdfjsLib from 'pdfjs-dist'

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export function AIChatbot() {
    const [loading, setLoading] = useState(true)
    const [config, setConfig] = useState<any>(null)
    const [documents, setDocuments] = useState<any[]>([])

    // Form States
    const [instanceName, setInstanceName] = useState('') // Legacy Evolution
    const [systemPrompt, setSystemPrompt] = useState('')
    const [botName, setBotName] = useState('')

    // Z-API States
    const [instanceId, setInstanceId] = useState('')
    const [instanceToken, setInstanceToken] = useState('')
    const [clientToken, setClientToken] = useState('')

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
                setInstanceName(configData.whatsapp_instance_name || '')
                setSystemPrompt(configData.system_prompt || '')
                setBotName(configData.nome_bot || '')

                // Z-API
                setInstanceId(configData.z_api_instance_id || '')
                setInstanceToken(configData.z_api_token || '')
                setClientToken(configData.z_api_client_token || '')

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

    async function handleSaveConfig() {
        try {
            setLoading(true)
            const user = await supabase.auth.getUser()
            const userId = user.data.user?.id
            if (!userId) throw new Error('Usuário não logado')

            // Get empresa_id
            const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', userId).single()
            if (!usuario?.empresa_id) throw new Error('Empresa não encontrada')

            const payload = {
                empresa_id: usuario.empresa_id,
                whatsapp_instance_name: instanceName,
                system_prompt: systemPrompt,
                nome_bot: botName,
                // Z-API
                z_api_instance_id: instanceId,
                z_api_token: instanceToken,
                z_api_client_token: clientToken
            }

            let error

            // Use upsert to handle both insert (new) and update (existing)
            // preventing race conditions or manual inserts via SQL
            const { error: upsertError } = await supabase
                .from('configuracoes_bot')
                .upsert(payload, { onConflict: 'empresa_id' })

            error = upsertError

            if (error) throw error

            toast.success('Configurações salvas com sucesso!')
            fetchConfig() // Refresh to get ID if new

        } catch (error: any) {
            toast.error('Erro ao salvar: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

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

                {/* CONFIGURAÇÃO Z-API (NOVO) */}
                <Card className="col-span-1 md:col-span-2 border-green-500/20 bg-green-50/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">📱 Conexão WhatsApp (Z-API)</CardTitle>
                        <CardDescription>Configure aqui os dados da sua instância Z-API para conectar o WhatsApp.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">ID da Instância</label>
                                <Input value={instanceId} onChange={e => setInstanceId(e.target.value)} placeholder="Ex: 3ED432..." />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Token da Instância</label>
                                <Input value={instanceToken} onChange={e => setInstanceToken(e.target.value)} type="password" placeholder="Ex: E92E1C..." />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Client Token (Segurança)</label>
                                <Input value={clientToken} onChange={e => setClientToken(e.target.value)} type="password" placeholder="Ex: Crie uma senha segura..." />
                                <p className="text-xs text-muted-foreground mt-1">Defina uma senha segura e configure no Header "Client-Token" da Z-API.</p>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-200">
                            <p className="text-sm font-medium mb-2">🔗 Seu Webhook para configurar na Z-API:</p>
                            <div className="flex items-center gap-2 bg-white p-2 rounded border font-mono text-xs overflow-x-auto text-nowrap">
                                {`https://dltqxfyrltgbudtzxzot.supabase.co/functions/v1/z-api-webhook?client_token=${clientToken || 'DEFINA_UMA_SENHA'}`}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                1. Defina uma senha segura no campo "Client Token" acima.<br />
                                2. Copie o link completo acima.<br />
                                3. Na Z-API, vá em "Webhooks" e cole no campo <strong>"Ao receber"</strong> (conforme sua foto).
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* CONFIGURAÇÃO BOT (EXISTENTE) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bot /> Personalidade da IA</CardTitle>
                        <CardDescription>Defina como sua IA deve se comportar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Nome do Bot</label>
                            <Input value={botName} onChange={e => setBotName(e.target.value)} placeholder="Ex: Atendente Virtual" />
                        </div>
                        {/* 
                        <div>
                            <label className="text-sm font-medium">Nome da Instância (Evolution API)</label>
                            <Input value={instanceName} onChange={e => setInstanceName(e.target.value)} placeholder="Ex: empresa_x_main" />
                            <p className="text-xs text-muted-foreground mt-1">Campo legado (Evolution API).</p>
                        </div>
                        */}
                        <div>
                            <label className="text-sm font-medium">System Prompt (Instruções)</label>
                            <Textarea
                                value={systemPrompt}
                                onChange={e => setSystemPrompt(e.target.value)}
                                placeholder="Ex: Você é um assistente útil..."
                                className="h-32"
                            />
                        </div>
                        <Button onClick={handleSaveConfig} disabled={loading} className="w-full">
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

            </div>
        </div>
    )
}

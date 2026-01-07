import { useState, useRef } from 'react'
import XLSX from 'xlsx-js-style'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, AlertCircle, Upload, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { SyncService } from '@/services/syncService'
import { LocalClient } from '@/lib/db'

export function ClientImport() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const [step, setStep] = useState<'paste' | 'map' | 'preview'>('paste')
    const [rawText, setRawText] = useState('')
    const [parsedData, setParsedData] = useState<string[][]>([])
    const [columnMapping, setColumnMapping] = useState<Record<number, string>>({})
    const [importing, setImporting] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })

    const AVAILABLE_FIELDS = [
        { label: 'Ignorar Coluna', value: '' },
        { label: 'Nome do Cliente', value: 'nome_razao' },
        { label: 'Telefone / WhatsApp', value: 'whatsapp' },
        { label: 'CPF / CNPJ', value: 'cpf_cnpj' },
        { label: 'Endereço Completo', value: 'endereco_completo' }, // Special handling
        { label: 'Rua / Logradouro', value: 'logradouro' },
        { label: 'Número', value: 'numero' },
        { label: 'Bairro', value: 'bairro' },
        { label: 'Cidade', value: 'cidade' },
        { label: 'CEP', value: 'cep' },
        { label: 'Complemento', value: 'complemento' },
    ]

    const handleParse = () => {
        if (!rawText.trim()) return

        // Simple TSV/CSV detection
        // First try tab delimiter
        const lines = rawText.trim().split(/\r?\n/).filter(line => line.trim())
        if (lines.length === 0) return

        let delimiter = '\t'
        if (lines[0].indexOf('\t') === -1) {
            // If no tabs, try comma or semicolon
            if (lines[0].indexOf(';') !== -1) delimiter = ';'
            else if (lines[0].indexOf(',') !== -1) delimiter = ','
        }

        const data = lines.map(line => line.split(delimiter).map(cell => cell.trim()))

        // Filter out empty rows
        const validData = data.filter(row => row.some(cell => cell))

        setParsedData(validData)
        setStep('map')
    }

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data, { type: 'array' })
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

            const validData = jsonData.filter(row => row.some(cell => cell))

            if (validData.length === 0) {
                alert('Planilha vazia ou sem dados válidos.')
                return
            }

            // Auto-map columns if headers match
            const headers = validData[0] || []
            const newMapping: Record<number, string> = {}

            headers.forEach((header, index) => {
                const h = header.toString().toLowerCase().trim()
                if (h.includes('nome') || h.includes('razao')) newMapping[index] = 'nome_razao'
                else if (h.includes('cpf') || h.includes('cnpj')) newMapping[index] = 'cpf_cnpj'
                else if (h.includes('whats') || h.includes('celular')) newMapping[index] = 'whatsapp'
                else if (h.includes('email')) newMapping[index] = 'email'
                else if (h.includes('cep')) newMapping[index] = 'cep'
                else if (h.includes('logradouro') || h.includes('rua')) newMapping[index] = 'logradouro'
                else if (h.includes('numero') || h.includes('número')) newMapping[index] = 'numero'
                else if (h.includes('bairro')) newMapping[index] = 'bairro'
                else if (h.includes('cidade')) newMapping[index] = 'cidade'
                else if (h.includes('uf') || h.includes('estado')) newMapping[index] = 'uf'
                else if (h.includes('complemento')) newMapping[index] = 'complemento'
                else if (h.includes('referencia')) newMapping[index] = 'referencia'
            })

            setColumnMapping(newMapping)
            setParsedData(validData)
            setStep('map')
        } catch (error) {
            console.error('Erro ao ler arquivo:', error)
            alert('Erro ao processar o arquivo Excel.')
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const processAddress = (fullAddress: string) => {
        // Simple heuristic for "Rua X, 123 - Bairro, Cidade - UF"
        // This is not perfect but helps splitting common formats
        const result = {
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: '',
            uf: '',
            cep: ''
        }

        // Try to find CEP regex
        const cepMatch = fullAddress.match(/\\d{5}-?\\d{3}/)
        if (cepMatch) result.cep = cepMatch[0]

        // Split by comma or hyphen
        const parts = fullAddress.split(/[,-]+/).map(p => p.trim())

        if (parts.length >= 1) result.logradouro = parts[0]
        if (parts.length >= 2) {
            // Check if part 2 is number
            if (/^\\d+/.test(parts[1])) result.numero = parts[1]
            else result.bairro = parts[1]
        }
        if (parts.length >= 3) {
            if (!result.numero && /^\\d+/.test(parts[2])) result.numero = parts[2]
            else if (!result.bairro) result.bairro = parts[2]
            else result.cidade = parts[2]
        }
        if (parts.length >= 4) {
            if (!result.cidade) result.cidade = parts[3]
        }

        return result
    }

    const handleImport = async () => {
        setImporting(true)
        setProgress({ current: 0, total: parsedData.length })

        try {
            // Process rows
            const clientsToImport: Partial<LocalClient>[] = []

            for (let i = 0; i < parsedData.length; i++) {
                const row = parsedData[i]

                // Skip header row if it contains known headers
                if (i === 0 && row.some(cell => String(cell).toLowerCase().includes('nome/razao'))) continue;

                const client: any = {
                    empresa_id: userData?.empresa_id,
                    ativo: true
                }

                let hasName = false

                Object.entries(columnMapping).forEach(([colIndex, field]) => {
                    if (!field) return
                    const value = row[parseInt(colIndex)]
                    if (!value) return

                    if (field === 'endereco_completo') {
                        const addrParts = processAddress(value)
                        Object.assign(client, addrParts)
                        client['endereco'] = value // Backup full string
                    } else {
                        client[field] = value
                    }

                    if (field === 'nome_razao') hasName = true
                })

                if (hasName) {
                    clientsToImport.push(client)
                }
            }

            // Batch Save (Sequential for now to respect sync service async nature)
            for (let i = 0; i < clientsToImport.length; i++) {
                const clientData = clientsToImport[i]
                // Generate ID if offline or rely on SyncService to handle
                // SyncService.createClient usually pushes to Supabase if online or saves local
                // We'll mimic SyncService.createClient logic but bypassing the full service if needed to be faster?
                // Better use the service to ensure consistency

                // We need to shape it as LocalClient
                const newClient: LocalClient = {
                    id: crypto.randomUUID(),
                    empresa_id: userData?.empresa_id!,
                    nome_razao: clientData.nome_razao || 'Sem Nome',
                    whatsapp: clientData.whatsapp?.replace(/\\D/g, '') || '',
                    cpf_cnpj: clientData.cpf_cnpj?.replace(/\\D/g, '') || '',
                    email: clientData.email || '',
                    cep: clientData.cep?.replace(/\\D/g, '') || '',
                    logradouro: clientData.logradouro || '',
                    numero: clientData.numero || '',
                    complemento: clientData.complemento || '',
                    bairro: clientData.bairro || '',
                    cidade: clientData.cidade || '',
                    uf: clientData.uf || '',
                    referencia: clientData.referencia || '',
                    ativo: true,
                    synced: 0,
                    updated_at: new Date().toISOString(),
                    created_at: new Date().toISOString()
                }

                // If 'endereco' was set from full string fallback
                if ((clientData as any).endereco && !newClient.logradouro) {
                    newClient.logradouro = (clientData as any).endereco
                }

                await SyncService.createClient(newClient as any) // Cast as any because SyncService might expect omit ID
                setProgress(prev => ({ ...prev, current: i + 1 }))
            }

            alert(`Importação concluída! ${clientsToImport.length} clientes importados.`)
            navigate('/clients')

        } catch (error) {
            console.error(error)
            alert('Erro ao importar. Verifique o console.')
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate('/clients')}>
                        <ArrowLeft className="h-3 w-3 mr-2" />
                        Voltar
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Importação Inteligente de Clientes</h1>
                        <p className="text-slate-500">Copie da sua planilha e cole aqui para importar em massa</p>
                    </div>
                </div>

                {/* Step 1: Paste */}
                {step === 'paste' && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl mb-4">
                            <FileSpreadsheet className="h-6 w-6" />
                            <div>
                                <h3 className="font-bold">Como funciona?</h3>
                                <p className="text-sm">Você pode <strong>Colar os dados</strong> abaixo OU <strong>Subir uma planilha Excel/CSV</strong>.</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 mb-6">
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <Button
                                className="w-full h-10 text-xs border border-dashed border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-500 transition-all rounded-lg flex gap-2 justify-center"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-3 w-3" />
                                Carregar Excel (.xlsx)
                            </Button>

                            <div className="relative flex items-center justify-center my-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200" />
                                </div>
                                <div className="relative bg-white px-2 text-[10px] text-slate-400 uppercase">Ou cole abaixo</div>
                            </div>
                        </div>

                        <textarea
                            className="w-full h-48 p-3 border rounded-lg font-mono text-xs bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Cole seus dados aqui..."
                            value={rawText}
                            onChange={e => setRawText(e.target.value)}
                        />

                        <Button
                            className="w-full h-9 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                            onClick={handleParse}
                            disabled={!rawText.trim()}
                        >
                            Processar Texto
                        </Button>
                    </div>
                )}

                {/* Step 2: Map */}
                {step === 'map' && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-xl">Identifique as Colunas</h2>
                            <Button
                                variant="outline"
                                size="sm" // Smaller button
                                className="h-8 text-xs"
                                onClick={() => setStep('paste')}
                            >
                                Voltar
                            </Button>
                        </div>

                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead>
                                    <tr>
                                        {parsedData[0]?.map((_, index) => (
                                            <th key={index} className="px-3 py-2 min-w-[150px] bg-slate-50 border-b">
                                                <select
                                                    className="w-full p-1.5 rounded border border-slate-300 focus:border-blue-500 text-xs"
                                                    value={columnMapping[index] || ''}
                                                    onChange={(e) => setColumnMapping(prev => ({ ...prev, [index]: e.target.value }))}
                                                >
                                                    <option value="" className="text-slate-400">ignorada</option>
                                                    {AVAILABLE_FIELDS.map(f => (
                                                        <option key={f.value} value={f.value} disabled={Object.values(columnMapping).includes(f.value) && columnMapping[index] !== f.value && f.value !== ''}>
                                                            {f.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {/* Preview first 3 rows */}
                                                <div className="mt-2 space-y-1 text-[10px] text-slate-500 font-normal">
                                                    {parsedData.slice(0, 3).map((row, rIdx) => (
                                                        <div key={rIdx} className="truncate max-w-[140px] bg-white p-1 rounded border border-slate-100">
                                                            {row[index] || '-'}
                                                        </div>
                                                    ))}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                            </table>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4" />
                                <span className="font-bold">{parsedData.length} linhas</span>
                            </div>
                            <div className="text-xs">
                                Empresa: <strong>{userData?.nome_fantasia || 'Atual'}</strong>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                className="h-8 text-xs px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-lg"
                                onClick={handleImport}
                                disabled={importing || !Object.values(columnMapping).some(v => v !== '')}
                            >
                                {importing ? `Importando ${progress.current}/${progress.total}...` : 'Confirmar Importação'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

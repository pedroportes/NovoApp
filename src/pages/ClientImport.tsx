import { useState } from 'react'
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
                    <Button variant="ghost" onClick={() => navigate('/clients')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
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
                                <p className="text-sm">Vá na sua planilha (Excel ou Google Sheets), selecione as colunas com os dados dos clientes (Nome, Telefone, Endereço...), copie (Ctrl+C) e cole na caixa abaixo.</p>
                            </div>
                        </div>

                        <textarea
                            className="w-full h-96 p-4 border rounded-xl font-mono text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Cole seus dados aqui..."
                            value={rawText}
                            onChange={e => setRawText(e.target.value)}
                        />

                        <Button
                            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleParse}
                            disabled={!rawText.trim()}
                        >
                            Próximo: Mapear Colunas
                        </Button>
                    </div>
                )}

                {/* Step 2: Map */}
                {step === 'map' && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-xl">Identifique as Colunas</h2>
                            <Button variant="outline" onClick={() => setStep('paste')}>Voltar e Colar Novamente</Button>
                        </div>

                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr>
                                        {parsedData[0]?.map((_, index) => (
                                            <th key={index} className="px-4 py-2 min-w-[200px] bg-slate-50 border-b">
                                                <select
                                                    className="w-full p-2 rounded border border-slate-300 focus:border-blue-500"
                                                    value={columnMapping[index] || ''}
                                                    onChange={(e) => setColumnMapping(prev => ({ ...prev, [index]: e.target.value }))}
                                                >
                                                    <option value="" className="text-slate-400">-- Selecione --</option>
                                                    {AVAILABLE_FIELDS.map(f => (
                                                        <option key={f.value} value={f.value} disabled={Object.values(columnMapping).includes(f.value) && columnMapping[index] !== f.value && f.value !== ''}>
                                                            {f.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {/* Preview first 3 rows */}
                                                <div className="mt-2 space-y-1 text-xs text-slate-500 font-normal">
                                                    {parsedData.slice(0, 3).map((row, rIdx) => (
                                                        <div key={rIdx} className="truncate max-w-[180px] bg-white p-1 rounded border border-slate-100">
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

                        <div className="flex items-center justify-between p-4 bg-emerald-50 text-emerald-800 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Check className="h-5 w-5" />
                                <span className="font-bold">{parsedData.length} linhas encontradas</span>
                            </div>
                            <div className="text-sm">
                                Importando para empresa: <strong>{userData?.nome_fantasia || 'Empresa Atual'}</strong>
                            </div>
                        </div>

                        <Button
                            className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                            onClick={handleImport}
                            disabled={importing || Object.keys(columnMapping).length === 0}
                        >
                            {importing ? `Importando ${progress.current}/${progress.total}...` : '✅ Confirmar Importação'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

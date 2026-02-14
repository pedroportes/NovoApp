import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { AffiliateData } from '@/hooks/useAffiliate'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Wallet, Download, Clock } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface OutletContextType {
    affiliate: AffiliateData
}

interface Payment {
    id: string
    valor: number
    status: 'pendente' | 'pago' | 'rejeitado'
    data_solicitacao: string
    data_pagamento?: string
    comprovante_url?: string
    observacoes?: string
}

export function AffiliatePayments() {
    const { affiliate } = useOutletContext<OutletContextType>()
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [isRequesting, setIsRequesting] = useState(false)
    const [amount, setAmount] = useState('')
    const [pixKey, setPixKey] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)

    useEffect(() => {
        fetchPayments()
    }, [affiliate.id])

    async function fetchPayments() {
        try {
            const { data, error } = await supabase
                .from('afiliados_pagamentos' as any)
                .select('*')
                .eq('afiliado_id', affiliate.id)
                .order('data_solicitacao', { ascending: false })

            if (error) throw error
            setPayments(data as unknown as Payment[])
        } catch (error) {
            console.error('Error fetching payments:', error)
            toast.error('Erro ao carregar pagamentos.')
        } finally {
            setLoading(false)
        }
    }

    async function handleRequestWithdrawal() {
        const value = parseFloat(amount.replace(',', '.'))

        if (isNaN(value) || value <= 0) {
            toast.error('Valor inválido.')
            return
        }

        if (value > affiliate.total_comissoes_pendentes) {
            toast.error('Saldo insuficiente.')
            return
        }

        if (!pixKey) {
            toast.error('Informe a chave PIX.')
            return
        }

        setIsRequesting(true)
        try {
            const { error } = await supabase
                .from('afiliados_pagamentos' as any)
                .insert([{
                    afiliado_id: affiliate.id,
                    valor: value,
                    status: 'pendente',
                    observacoes: `Chave PIX: ${pixKey}`
                }])

            if (error) throw error

            // Opcional: Atualizar saldo localmente ou esperar refresh
            toast.success('Solicitação de saque enviada!')
            setDialogOpen(false)
            setAmount('')
            setPixKey('')
            fetchPayments()
        } catch (error: any) {
            console.error('Error requesting withdrawal:', error)
            toast.error('Erro ao solicitar saque.')
        } finally {
            setIsRequesting(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Financeiro</h1>
                    <p className="text-slate-500">Histórico de saques e pagamentos.</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200">
                            <Wallet className="mr-2 h-4 w-4" />
                            Solicitar Saque
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Solicitar Saque</DialogTitle>
                            <DialogDescription>
                                O valor será transferido para sua conta via PIX em até 2 dias úteis.
                                <br />
                                <strong>Saldo Disponível: R$ {affiliate.total_comissoes_pendentes.toFixed(2)}</strong>
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">
                                    Valor (R$)
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="col-span-3"
                                    max={affiliate.total_comissoes_pendentes}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="pix" className="text-right">
                                    Chave PIX
                                </Label>
                                <Input
                                    id="pix"
                                    value={pixKey}
                                    onChange={(e) => setPixKey(e.target.value)}
                                    placeholder="CPF, Email, Telefone..."
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleRequestWithdrawal} disabled={isRequesting}>
                                {isRequesting ? 'Enviando...' : 'Confirmar Saque'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Pagamentos</CardTitle>
                    <CardDescription>
                        Acompanhe o status de suas solicitações.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Carregando...</div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            Nenhum pagamento registrado ainda.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Observações</TableHead>
                                        <TableHead className="text-right">Comprovante</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>
                                                {new Date(payment.data_solicitacao).toLocaleDateString()}
                                                <br />
                                                <span className="text-xs text-slate-400">
                                                    {new Date(payment.data_solicitacao).toLocaleTimeString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                R$ {payment.valor.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    payment.status === 'pago' ? "default" :
                                                        payment.status === 'rejeitado' ? "destructive" : "secondary"
                                                } className={
                                                    payment.status === 'pago' ? "bg-emerald-500 hover:bg-emerald-600" :
                                                        payment.status === 'pendente' ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""
                                                }>
                                                    {payment.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={payment.observacoes}>
                                                {payment.observacoes || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {payment.comprovante_url ? (
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <a href={payment.comprovante_url} target="_blank" rel="noopener noreferrer">
                                                            <Download className="h-4 w-4 mr-1" />
                                                            Baixar
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <span className="text-slate-300 text-sm italic">Pendente</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

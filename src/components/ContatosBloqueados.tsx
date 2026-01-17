import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Trash2, Ban, Phone } from 'lucide-react'
import { toast } from 'sonner'

interface ContatoBloqueado {
    id: string
    telefone: string
    nome: string | null
    motivo: string | null
    created_at: string
}

interface ContatosBloqueadosProps {
    empresaId: string
}

export function ContatosBloqueados({ empresaId }: ContatosBloqueadosProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [contatos, setContatos] = useState<ContatoBloqueado[]>([])
    const [novoTelefone, setNovoTelefone] = useState('')
    const [novoNome, setNovoNome] = useState('')
    const [novoMotivo, setNovoMotivo] = useState('')

    useEffect(() => {
        if (empresaId) fetchContatos()
    }, [empresaId])

    async function fetchContatos() {
        try {
            const { data, error } = await supabase
                .from('contatos_bloqueados')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setContatos(data || [])
        } catch (error) {
            console.error('Erro ao carregar contatos bloqueados:', error)
        } finally {
            setLoading(false)
        }
    }

    function formatarTelefone(telefone: string): string {
        // Remove tudo que não é número
        let limpo = telefone.replace(/\D/g, '')

        // Se começar com 0, remove
        if (limpo.startsWith('0')) limpo = limpo.substring(1)

        // Adiciona 55 se não tiver
        if (!limpo.startsWith('55') && limpo.length <= 11) {
            limpo = '55' + limpo
        }

        return limpo
    }

    async function adicionarContato() {
        if (!novoTelefone.trim()) {
            toast.error('Informe o telefone')
            return
        }

        const telefoneFormatado = formatarTelefone(novoTelefone)

        if (telefoneFormatado.length < 12) {
            toast.error('Telefone inválido. Use formato: (41) 99999-9999')
            return
        }

        // Verificar se já existe
        const jaExiste = contatos.some(c => c.telefone === telefoneFormatado)
        if (jaExiste) {
            toast.error('Este telefone já está na lista')
            return
        }

        setSaving(true)
        try {
            const { data, error } = await supabase
                .from('contatos_bloqueados')
                .insert({
                    empresa_id: empresaId,
                    telefone: telefoneFormatado,
                    nome: novoNome.trim() || null,
                    motivo: novoMotivo.trim() || null
                })
                .select()
                .single()

            if (error) throw error

            setContatos([data, ...contatos])
            setNovoTelefone('')
            setNovoNome('')
            setNovoMotivo('')
            toast.success('Contato bloqueado com sucesso!')
        } catch (error: any) {
            console.error('Erro ao bloquear contato:', error)
            toast.error('Erro ao bloquear: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    async function removerContato(id: string, telefone: string) {
        if (!confirm(`Deseja desbloquear o número ${telefone}?`)) return

        try {
            const { error } = await supabase
                .from('contatos_bloqueados')
                .delete()
                .eq('id', id)

            if (error) throw error

            setContatos(contatos.filter(c => c.id !== id))
            toast.success('Contato desbloqueado!')
        } catch (error: any) {
            toast.error('Erro ao desbloquear: ' + error.message)
        }
    }

    function formatarExibicao(telefone: string): string {
        // Formatar para exibição: +55 (41) 99999-9999
        if (telefone.length === 13) {
            return `+${telefone.slice(0, 2)} (${telefone.slice(2, 4)}) ${telefone.slice(4, 9)}-${telefone.slice(9)}`
        }
        if (telefone.length === 12) {
            return `+${telefone.slice(0, 2)} (${telefone.slice(2, 4)}) ${telefone.slice(4, 8)}-${telefone.slice(8)}`
        }
        return telefone
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-destructive" />
                    Contatos Bloqueados
                </CardTitle>
                <CardDescription>
                    A IA não responderá automaticamente aos contatos desta lista
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Formulário para adicionar */}
                <div className="grid gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="telefone">Telefone *</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="telefone"
                                    value={novoTelefone}
                                    onChange={e => setNovoTelefone(e.target.value)}
                                    placeholder="(41) 99999-9999"
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nome">Nome (opcional)</Label>
                            <Input
                                id="nome"
                                value={novoNome}
                                onChange={e => setNovoNome(e.target.value)}
                                placeholder="Ex: Fornecedor X"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="motivo">Motivo (opcional)</Label>
                            <Input
                                id="motivo"
                                value={novoMotivo}
                                onChange={e => setNovoMotivo(e.target.value)}
                                placeholder="Ex: Spam, Fornecedor, etc"
                            />
                        </div>
                    </div>
                    <Button onClick={adicionarContato} disabled={saving} className="w-full md:w-auto">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Bloquear Contato
                    </Button>
                </div>

                {/* Lista de contatos bloqueados */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                        {contatos.length} contato(s) bloqueado(s)
                    </h4>

                    {contatos.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Ban className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>Nenhum contato bloqueado</p>
                            <p className="text-sm">A IA responderá a todos os contatos</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                            {contatos.map((contato) => (
                                <div key={contato.id} className="flex items-center justify-between p-3 bg-background hover:bg-muted/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-medium">
                                                {formatarExibicao(contato.telefone)}
                                            </span>
                                            {contato.nome && (
                                                <span className="text-muted-foreground text-sm truncate">
                                                    • {contato.nome}
                                                </span>
                                            )}
                                        </div>
                                        {contato.motivo && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Motivo: {contato.motivo}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removerContato(contato.id, formatarExibicao(contato.telefone))}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Service {
    id: string
    nome: string
    descricao: string | null
    valor_padrao: number
    ativo: boolean
}

export function Services() {
    const { userData } = useAuth()
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingService, setEditingService] = useState<Service | null>(null)
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        valor_padrao: ''
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (userData?.empresa_id) {
            fetchServices()
        }
    }, [userData?.empresa_id])

    const fetchServices = async () => {
        try {
            const { data, error } = await supabase
                .from('servicos')
                .select('*')
                .eq('empresa_id', userData!.empresa_id)
                .order('nome')

            if (error) throw error
            setServices(data || [])
        } catch (error) {
            console.error('Erro ao buscar serviços:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const payload = {
                empresa_id: userData!.empresa_id,
                nome: formData.nome,
                descricao: formData.descricao,
                valor_padrao: parseFloat(formData.valor_padrao.replace(',', '.')) || 0
            }

            if (editingService) {
                const { error } = await (supabase
                    .from('servicos') as any)
                    .update(payload)
                    .eq('id', editingService.id)
                if (error) throw error
            } else {
                const { error } = await (supabase
                    .from('servicos') as any)
                    .insert(payload)
                if (error) throw error
            }

            await fetchServices()
            closeModal()
        } catch (error) {
            console.error('Erro ao salvar:', error)
            alert('Erro ao salvar serviço')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este serviço?')) return

        try {
            const { error } = await supabase
                .from('servicos')
                .delete()
                .eq('id', id)

            if (error) throw error
            setServices(services.filter(s => s.id !== id))
        } catch (error) {
            console.error('Erro ao deletar:', error)
            alert('Erro ao deletar serviço')
        }
    }

    const openModal = (service?: Service) => {
        if (service) {
            setEditingService(service)
            setFormData({
                nome: service.nome,
                descricao: service.descricao || '',
                valor_padrao: service.valor_padrao.toString()
            })
        } else {
            setEditingService(null)
            setFormData({ nome: '', descricao: '', valor_padrao: '' })
        }
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingService(null)
    }

    const filteredServices = services.filter(s =>
        s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
                    <p className="text-muted-foreground">Gerencie seu catálogo de serviços</p>
                </div>
                <Button onClick={() => openModal()} className="font-bold shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> Novo Serviço
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-card p-2 rounded-lg border border-border shadow-sm">
                <Search className="h-5 w-5 text-muted-foreground ml-2" />
                <Input
                    placeholder="Buscar serviços..."
                    className="border-0 focus-visible:ring-0"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full text-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-muted">
                        Nenhum serviço encontrado.
                        <br />
                        Clique em "Novo Serviço" para começar.
                    </div>
                ) : (
                    filteredServices.map(service => (
                        <div key={service.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-lg">{service.nome}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5em]">
                                        {service.descricao || 'Sem descrição'}
                                    </p>
                                </div>
                                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => openModal(service)}>
                                        <Edit2 className="h-4 w-4 text-blue-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor Padrão</span>
                                <span className="font-bold text-primary text-lg">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.valor_padrao)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                            <h2 className="text-lg font-bold">
                                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                            </h2>
                            <Button variant="ghost" size="icon" onClick={closeModal} className="h-8 w-8 rounded-full">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome do Serviço</Label>
                                <Input
                                    id="nome"
                                    placeholder="Ex: Limpeza de Caixa de Gordura"
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="valor">Valor Padrão (R$)</Label>
                                <Input
                                    id="valor"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0,00"
                                    value={formData.valor_padrao}
                                    onChange={e => setFormData({ ...formData, valor_padrao: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="descricao">Descrição (Opcional)</Label>
                                <Input
                                    id="descricao"
                                    placeholder="Detalhes sobre o serviço..."
                                    value={formData.descricao}
                                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1 font-bold" disabled={saving}>
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useBrand, Brand } from '@/contexts/BrandContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Save, Upload, Loader2, Pencil, Check, Plus, ShieldCheck } from 'lucide-react'
import { compressImage } from '@/lib/utils'
import { toast } from 'sonner'

export function BrandSettings() {
    const { brands, refreshBrands } = useBrand()
    const { userData } = useAuth()
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
    const [saving, setSaving] = useState(false)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    // Form state para edição da filial
    const [formData, setFormData] = useState({
        nome: '',
        cnpj: '',
        telefone: '',
        endereco: '',
        chave_pix: '',
        cor_tema: '#10b981'
    })

    const handleStartEdit = (brand: Brand) => {
        setEditingBrand(brand)
        setFormData({
            nome: brand.nome || '',
            cnpj: brand.cnpj || '',
            telefone: brand.telefone || '',
            endereco: brand.endereco || '',
            chave_pix: brand.chave_pix || '',
            cor_tema: brand.cor_tema || '#10b981'
        })
        setLogoPreview(brand.logo_url || null)
        setLogoFile(null)
    }

    const handleSaveBrand = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingBrand) return

        setSaving(true)
        try {
            let finalLogoUrl = editingBrand.logo_url || null

            // Upload de logotipo se selecionado
            if (logoFile) {
                const compressed = await compressImage(logoFile, 500, 0.8)
                const fileExt = logoFile.name.split('.').pop() || 'png'
                const fileName = `brand_logo_${editingBrand.id}_${Date.now()}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, compressed, { upsert: true })

                if (uploadError) throw uploadError

                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName)

                finalLogoUrl = urlData.publicUrl
            }

            const { error: updateError } = await supabase
                .from('empresas_marcas')
                .update({
                    nome: formData.nome,
                    cnpj: formData.cnpj || null,
                    telefone: formData.telefone || null,
                    endereco: formData.endereco || null,
                    chave_pix: formData.chave_pix || null,
                    cor_tema: formData.cor_tema || '#10b981',
                    logo_url: finalLogoUrl
                })
                .eq('id', editingBrand.id)

            if (updateError) throw updateError

            toast.success(`Filial "${formData.nome}" atualizada com sucesso!`)
            await refreshBrands()
            setEditingBrand(null)
        } catch (error: any) {
            console.error('Erro ao salvar marca:', error)
            toast.error(`Erro ao salvar: ${error.message || 'Falha ao atualizar filial'}`)
        } finally {
            setSaving(false)
        }
    }

    if (brands.length === 0) return null

    return (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Filiais e Marcas do Grupo</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Configure CNPJ, Telefone, Endereço e Chave PIX de cada desentupidora para sair nos recibos e orçamentos.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                        {brands.length} filiais ativas
                    </span>
                </div>
            </div>

            {/* LISTA DE FILIAIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brands.map((b) => {
                    const isBeingEdited = editingBrand?.id === b.id
                    return (
                        <div
                            key={b.id}
                            className={`p-5 rounded-2xl border transition-all ${
                                isBeingEdited
                                    ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20'
                                    : 'border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0 overflow-hidden"
                                        style={{ backgroundColor: b.cor_tema || '#10b981' }}
                                    >
                                        {b.logo_url ? (
                                            <img src={b.logo_url} alt={b.nome} className="w-full h-full object-contain p-1" />
                                        ) : (
                                            <Building2 className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm leading-tight flex items-center gap-1.5">
                                            {b.nome}
                                            {b.ordem === 1 && (
                                                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                                                    Matriz
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {b.cnpj ? `CNPJ: ${b.cnpj}` : 'Sem CNPJ configurado'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStartEdit(b)}
                                    className="h-8 px-3 text-xs gap-1.5 rounded-lg border-slate-200 hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Editar
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white/80 p-3 rounded-xl border border-slate-100">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Telefone / Whats</span>
                                    <span className="font-medium truncate block">{b.telefone || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Chave PIX</span>
                                    <span className="font-mono text-[11px] font-semibold text-emerald-800 truncate block">
                                        {b.chave_pix || '—'}
                                    </span>
                                </div>
                                <div className="col-span-2 pt-1 border-t border-slate-50">
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Endereço no Recibo</span>
                                    <span className="text-xs text-slate-500 truncate block">{b.endereco || '—'}</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* MODAL / PAINEL DE EDIÇÃO DA FILIAL */}
            {editingBrand && (
                <div className="mt-6 p-6 bg-slate-50 border-2 border-emerald-500/30 rounded-3xl space-y-6 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                        <div className="flex items-center gap-2">
                            <span 
                                className="w-3.5 h-3.5 rounded-full shadow-sm"
                                style={{ backgroundColor: formData.cor_tema }}
                            />
                            <h3 className="font-bold text-slate-800 text-base">
                                Editando Dados de: <span className="text-emerald-700">{editingBrand.nome}</span>
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setEditingBrand(null)}
                            className="text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                        >
                            Cancelar
                        </button>
                    </div>

                    <form onSubmit={handleSaveBrand} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Nome de Exibição da Filial</Label>
                                <Input
                                    value={formData.nome}
                                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                                    required
                                    className="bg-white rounded-xl h-11"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">CNPJ da Filial (Para recibos e OSs)</Label>
                                <Input
                                    value={formData.cnpj}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                                    placeholder="00.000.000/0001-00"
                                    className="bg-white rounded-xl h-11"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp da Filial</Label>
                                <Input
                                    value={formData.telefone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                                    placeholder="(41) 99999-9999"
                                    className="bg-white rounded-xl h-11"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Chave PIX da Filial (Sai no recibo)</Label>
                                <Input
                                    value={formData.chave_pix}
                                    onChange={(e) => setFormData(prev => ({ ...prev, chave_pix: e.target.value }))}
                                    placeholder="CNPJ, celular, e-mail ou aleatória"
                                    className="bg-white rounded-xl h-11 font-mono"
                                />
                            </div>

                            <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Endereço da Filial (Impresso no cabeçalho)</Label>
                                <Input
                                    value={formData.endereco}
                                    onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                                    placeholder="Rua, Número, Bairro, Cidade - UF"
                                    className="bg-white rounded-xl h-11"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Cor do Tema no Sistema</Label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={formData.cor_tema}
                                        onChange={(e) => setFormData(prev => ({ ...prev, cor_tema: e.target.value }))}
                                        className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 bg-white"
                                    />
                                    <Input
                                        value={formData.cor_tema}
                                        onChange={(e) => setFormData(prev => ({ ...prev, cor_tema: e.target.value }))}
                                        className="bg-white rounded-xl h-11 w-32 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Logotipo Específico da Filial</Label>
                                <div className="flex items-center gap-3">
                                    {logoPreview ? (
                                        <div className="w-11 h-11 rounded-xl border bg-white p-1 flex items-center justify-center shrink-0">
                                            <img src={logoPreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                                        </div>
                                    ) : null}
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                setLogoFile(file)
                                                setLogoPreview(URL.createObjectURL(file))
                                            }
                                        }}
                                        className="bg-white rounded-xl h-11 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-slate-100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingBrand(null)}
                                className="rounded-xl h-11 px-5"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={saving}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 px-6 gap-2 shadow-lg shadow-emerald-600/20"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Salvar Dados da Filial
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}

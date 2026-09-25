import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Building2, Layers, Check, X } from 'lucide-react'
import { useBrand } from '@/contexts/BrandContext'
import { useAuth } from '@/contexts/AuthContext'

interface BrandSwitcherProps {
    isMobileHeader?: boolean
}

export const BrandSwitcher: React.FC<BrandSwitcherProps> = ({ isMobileHeader = false }) => {
    const { brands, selectedBrandId, selectedBrand, setSelectedBrandId } = useBrand()
    const { userData } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Fechar ao clicar fora (no modo desktop popup)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // No portal, o clique fora é tratado pelo backdrop
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (brands.length <= 1) {
        return (
            <div className={isMobileHeader ? "text-left text-white" : "flex flex-col items-end"}>
                <span className="font-bold text-sm">{userData?.nome}</span>
                <span className="text-xs opacity-75">{userData?.email}</span>
            </div>
        )
    }

    const currentTitle = selectedBrandId === 'all'
        ? 'Todas as Marcas'
        : (selectedBrand?.nome || userData?.nome)

    return (
        <div className="relative w-full sm:w-auto" ref={containerRef}>
            {/* BOTÃO DO CABEÇALHO MOBILE (Estilo Glass com degradê) */}
            {isMobileHeader ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsOpen(!isOpen)
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-md border border-white/25 text-white transition-all shadow-sm cursor-pointer"
                    title="Toque para alternar entre as 7 empresas"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        {selectedBrand?.logo_url ? (
                            <div className="w-7 h-7 rounded-xl bg-white p-0.5 shrink-0 shadow-xs flex items-center justify-center overflow-hidden">
                                <img src={selectedBrand.logo_url} alt={selectedBrand.nome} className="w-full h-full object-contain" />
                            </div>
                        ) : selectedBrand ? (
                            <span 
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border-2 border-white/60"
                                style={{ backgroundColor: selectedBrand.cor_tema || '#10b981' }}
                            />
                        ) : (
                            <div className="w-7 h-7 rounded-xl bg-emerald-500/80 text-white flex items-center justify-center shrink-0">
                                <Layers className="h-4 w-4" />
                            </div>
                        )}
                        <div className="text-left min-w-0">
                            <p className="font-extrabold text-xs sm:text-sm text-white truncate leading-tight">
                                {currentTitle}
                            </p>
                            <p className="text-[10px] text-emerald-100/80 truncate font-medium">
                                {selectedBrandId === 'all' 
                                    ? `${brands.length} filiais ativas • Toque para trocar` 
                                    : (selectedBrand?.ordem === 1 ? 'Matriz Oficial • Trocar' : 'Filial • Trocar')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[10px] bg-white/20 hover:bg-white/30 text-white font-bold px-2 py-0.5 rounded-full transition-colors">
                            Trocar
                        </span>
                        <ChevronDown className={`h-4 w-4 text-white/80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>
            ) : (
                /* BOTÃO DESKTOP (Branco clássico) */
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsOpen(!isOpen)
                    }}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-emerald-300 transition-all shadow-sm group focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                    title="Clique para alternar entre suas empresas"
                >
                    <div className="flex flex-col items-end text-right">
                        <div className="flex items-center gap-1.5">
                            {selectedBrand?.logo_url ? (
                                <img src={selectedBrand.logo_url} alt={selectedBrand.nome} className="w-5 h-5 rounded object-contain shrink-0" />
                            ) : selectedBrand ? (
                                <span 
                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                    style={{ backgroundColor: selectedBrand.cor_tema || '#10b981' }}
                                />
                            ) : null}
                            {selectedBrandId === 'all' && (
                                <Layers className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span className="font-bold text-sm text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors max-w-[210px] truncate">
                                {currentTitle}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {selectedBrandId === 'all' ? `${brands.length} filiais ativas` : (userData?.email)}
                        </span>
                    </div>
                </button>
            )}

            {/* MODAL / BOTTOM DRAWER PORTAL (Abre tanto no celular quanto no PC perfeitamente) */}
            {isOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center">
                    {/* Backdrop com blur */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Conteúdo do Drawer (Mobile: desliza de baixo; Desktop: modal centralizado) */}
                    <div 
                        className="relative w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl p-5 sm:p-6 z-10 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Puxador touch para celular */}
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="font-black text-base sm:text-lg text-slate-800">Minhas Desentupidoras</h3>
                                <p className="text-xs text-slate-500 font-medium">Selecione a empresa para emitir OS e gerenciar</p>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Opção Todas as Marcas */}
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedBrandId('all')
                                setIsOpen(false)
                            }}
                            className={`w-full flex items-center justify-between p-3.5 rounded-2xl mt-3 text-left transition-all cursor-pointer ${
                                selectedBrandId === 'all'
                                    ? 'bg-emerald-50 border-2 border-emerald-500 shadow-sm'
                                    : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                    <Layers className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">Todas as Marcas</p>
                                    <p className="text-xs text-slate-500">Visão consolidada (${brands.length} filiais)</p>
                                </div>
                            </div>
                            {selectedBrandId === 'all' && (
                                <Check className="h-5 w-5 text-emerald-600 shrink-0 font-bold" />
                            )}
                        </button>

                        <div className="mt-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                            Filiais do Grupo (${brands.length})
                        </div>

                        {/* Lista das 7 Empresas Canônicas */}
                        <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                            {brands.map((b) => {
                                const isSelected = selectedBrandId === b.id
                                return (
                                    <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedBrandId(b.id)
                                            setIsOpen(false)
                                        }}
                                        className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-emerald-50/90 border-2 border-emerald-500 shadow-sm'
                                                : 'bg-slate-50/70 hover:bg-slate-100 border-2 border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div 
                                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden bg-white border border-slate-200 p-1"
                                            >
                                                {b.logo_url ? (
                                                    <img src={b.logo_url} alt={b.nome} className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white rounded-lg" style={{ backgroundColor: b.cor_tema || '#10b981' }}>
                                                        <Building2 className="h-5 w-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">
                                                    {b.nome}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span 
                                                        className="w-2 h-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: b.cor_tema || '#10b981' }}
                                                    />
                                                    <span className="text-[11px] text-slate-500 font-medium truncate">
                                                        {b.ordem === 1 ? 'Matriz Principal' : 'Filial'} {b.telefone ? `• ${b.telefone}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <Check className="h-5 w-5 text-emerald-600 shrink-0 font-bold ml-2" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

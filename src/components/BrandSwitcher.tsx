import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, Layers, Check } from 'lucide-react'
import { useBrand } from '@/contexts/BrandContext'
import { useAuth } from '@/contexts/AuthContext'

export const BrandSwitcher: React.FC = () => {
    const { brands, selectedBrandId, selectedBrand, setSelectedBrandId } = useBrand()
    const { userData } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Regra de Ouro: Se a conta tem 0 ou apenas 1 marca cadastrada,
    // mantém 100% o layout original estático sem dropdown
    if (brands.length <= 1) {
        return (
            <div className="flex flex-col items-end">
                <span className="font-bold text-foreground">{userData?.nome}</span>
                <span className="text-xs text-muted-foreground">{userData?.email}</span>
            </div>
        )
    }

    const currentTitle = selectedBrandId === 'all'
        ? 'Todas as Marcas'
        : (selectedBrand?.nome || userData?.nome)

    return (
        <div className="relative" ref={containerRef}>
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

            {/* Dropdown Menu */}
            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            Minhas Desentupidoras ({brands.length})
                        </p>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                            Multi-Empresa
                        </span>
                    </div>

                    {/* Opção Todas as Marcas */}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedBrandId('all')
                            setIsOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                            selectedBrandId === 'all'
                                ? 'bg-emerald-50/90 text-emerald-900 font-semibold'
                                : 'text-slate-700 hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <Layers className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="leading-tight font-bold text-slate-800">Todas as Marcas</p>
                                <p className="text-[11px] text-gray-400 font-normal">Faturamento e OS consolidados</p>
                            </div>
                        </div>
                        {selectedBrandId === 'all' && (
                            <Check className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />
                        )}
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    {/* Lista das Filiais Reais */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
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
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                                        isSelected
                                            ? 'bg-emerald-50/80 text-emerald-900 font-semibold'
                                            : 'text-slate-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div 
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm overflow-hidden bg-slate-50 border border-gray-100"
                                            style={{ borderColor: isSelected ? (b.cor_tema || '#10b981') : undefined }}
                                        >
                                            {b.logo_url ? (
                                                <img src={b.logo_url} alt={b.nome} className="w-full h-full object-contain p-0.5" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white" style={{ backgroundColor: b.cor_tema || '#10b981' }}>
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="truncate">
                                            <p className="leading-tight truncate text-slate-800 font-medium">
                                                {b.nome}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-normal truncate">
                                                {b.ordem === 1 ? 'Matriz Principal' : 'Filial'}
                                            </p>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <Check className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

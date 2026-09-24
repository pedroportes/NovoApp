import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface Brand {
    id: string
    empresa_matriz_id: string
    nome: string
    cnpj?: string
    telefone?: string
    endereco?: string
    chave_pix?: string
    logo_url?: string
    cor_tema?: string
    ordem: number
    razao_social?: string
    email_contato?: string
    site?: string
    cep?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    assinatura_url?: string
}

interface BrandContextType {
    brands: Brand[]
    selectedBrandId: string // 'all' or brand uuid
    selectedBrand: Brand | null
    setSelectedBrandId: (id: string) => void
    loadingBrands: boolean
    refreshBrands: () => Promise<void>
}

const BrandContext = createContext<BrandContextType>({
    brands: [],
    selectedBrandId: 'all',
    selectedBrand: null,
    setSelectedBrandId: () => {},
    loadingBrands: false,
    refreshBrands: async () => {},
})

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userData } = useAuth()
    const [brands, setBrands] = useState<Brand[]>([])
    const [selectedBrandId, setSelectedBrandIdState] = useState<string>(() => {
        return localStorage.getItem('flowdrain_selected_brand') || 'all'
    })
    const [loadingBrands, setLoadingBrands] = useState(false)

    const fetchBrands = async () => {
        if (!userData?.empresa_id) {
            setBrands([])
            return
        }

        try {
            setLoadingBrands(true)
            const { data, error } = await supabase
                .from('empresas_marcas')
                .select('*')
                .eq('empresa_matriz_id', userData.empresa_id)
                .order('ordem', { ascending: true })

            if (error) {
                console.warn('Erro ao carregar marcas:', error)
            } else if (data) {
                setBrands(data as Brand[])
            }
        } catch (err) {
            console.warn('Erro fetchBrands:', err)
        } finally {
            setLoadingBrands(false)
        }
    }

    useEffect(() => {
        fetchBrands()
    }, [userData?.empresa_id])

    const setSelectedBrandId = (id: string) => {
        setSelectedBrandIdState(id)
        localStorage.setItem('flowdrain_selected_brand', id)
    }

    const selectedBrand = selectedBrandId === 'all'
        ? null
        : brands.find(b => b.id === selectedBrandId) || null

    return (
        <BrandContext.Provider value={{
            brands,
            selectedBrandId,
            selectedBrand,
            setSelectedBrandId,
            loadingBrands,
            refreshBrands: fetchBrands
        }}>
            {children}
        </BrandContext.Provider>
    )
}

export const useBrand = () => useContext(BrandContext)

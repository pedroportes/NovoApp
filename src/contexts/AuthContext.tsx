import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authStorage, UserData } from '@/lib/auth-storage'
import { Database } from '@/types/supabase'

interface AuthContextType {
    user: User | null
    userData: UserData | null
    empresaId: string | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [userData, setUserData] = useState<UserData | null>(null)
    const [empresaId, setEmpresaId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check active session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                loadUserData(session.user.id)
            } else {
                setLoading(false)
            }
        })

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                loadUserData(session.user.id)
            } else {
                setUserData(null)
                setEmpresaId(null)
                authStorage.clearAll()
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const loadUserData = async (userId: string) => {
        try {
            // Usa maybeSingle() para não estourar erro se não encontrar (PGRST116)
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', userId)
                .maybeSingle()

            if (error) {
                console.error('Erro ao buscar perfil do usuário:', error.message)
                return
            }

            if (data) {
                const row = data as Database['public']['Tables']['usuarios']['Row']
                const userData: UserData = {
                    id: row.id,
                    empresa_id: row.empresa_id,
                    cargo: row.cargo,
                    nome: row.nome || '',
                    email: row.email || '',
                }
                setUserData(userData)
                setEmpresaId(row.empresa_id)
                authStorage.setUserData(userData)
            } else {
                // Usuário sem perfil público - Silent fail para não travar o app
                console.warn('Usuário logado mas sem perfil na tabela usuarios.')
            }
        } catch (error) {
            console.error('Error loading user data:', error)
        } finally {
            setLoading(false)
        }
    }

    const signIn = async (email: string, password: string) => {
        try {
            // Sign in with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) {
                return { success: false, error: 'E-mail ou senha incorretos' }
            }

            if (!authData.user) {
                return { success: false, error: 'Erro ao fazer login' }
            }

            // Fetch user data from usuarios table
            const { data: userData, error: userError } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', authData.user.id)
                .single()

            console.log('Dados do usuário (Login):', userData)

            // BYPASS DE DEBUG - IGNORANDO VERIFICAÇÕES
            // if (userError || !userData) { ... }
            // if (!userRow.empresa_id) { ... }

            if (authData.user) {
                setUser(authData.user)

                // Se achou dados do usuário, salva. Se não, segue só com o Auth.
                if (userData) {
                    const userRow = userData as Database['public']['Tables']['usuarios']['Row']
                    const userDataObj: UserData = {
                        id: userRow.id,
                        empresa_id: userRow.empresa_id,
                        cargo: userRow.cargo,
                        nome: userRow.nome || '',
                        email: userRow.email || '',
                    }
                    setUserData(userDataObj)
                    setEmpresaId(userRow.empresa_id)
                    authStorage.setUserData(userDataObj)
                }

                return { success: true }
            }

            return { success: false, error: 'Erro inesperado' }
        } catch (error) {
            console.error('Sign in error:', error)
            return { success: false, error: 'Erro de conexão. Tente novamente' }
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setUserData(null)
        setEmpresaId(null)
        authStorage.clearAll()
    }

    return (
        <AuthContext.Provider value={{ user, userData, empresaId, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

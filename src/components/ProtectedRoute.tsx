import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
    children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, userData, loading, isSuperAdmin } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando...</p>
                </div>
            </div>
        )
    }

    if (!user || !userData) {
        return <Navigate to="/login" replace />
    }

    // Super Admin sem empresa_id → redireciona para painel SA
    if (!userData.empresa_id && isSuperAdmin) {
        return <Navigate to="/super-admin" replace />
    }

    // Usuário comum sem empresa_id → volta pro login
    if (!userData.empresa_id) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}

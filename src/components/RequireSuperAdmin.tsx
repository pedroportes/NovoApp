import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface RequireSuperAdminProps {
    children: React.ReactNode
}

export function RequireSuperAdmin({ children }: RequireSuperAdminProps) {
    const { isSuperAdmin, loading } = useAuth()

    if (loading) return null

    if (!isSuperAdmin) return <Navigate to="/super-admin/login" replace />

    return <>{children}</>
}

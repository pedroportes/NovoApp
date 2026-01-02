// Utilities for managing authentication data in localStorage

const AUTH_KEYS = {
    EMPRESA_ID: 'flowdrain_empresa_id',
    USER_DATA: 'flowdrain_user_data',
    USER_ROLE: 'flowdrain_user_role',
} as const

export interface UserData {
    id: string
    empresa_id: string | null
    cargo: string | null // Relaxed to string to avoid mismatch with DB string type
    nome: string
    email: string
}

export const authStorage = {
    // Save empresa_id to localStorage
    setEmpresaId: (empresaId: string): void => {
        localStorage.setItem(AUTH_KEYS.EMPRESA_ID, empresaId)
    },

    // Get empresa_id from localStorage
    getEmpresaId: (): string | null => {
        return localStorage.getItem(AUTH_KEYS.EMPRESA_ID)
    },

    // Save user data to localStorage
    setUserData: (userData: UserData): void => {
        localStorage.setItem(AUTH_KEYS.USER_DATA, JSON.stringify(userData))
        if (userData.empresa_id) localStorage.setItem(AUTH_KEYS.EMPRESA_ID, userData.empresa_id)
        else localStorage.removeItem(AUTH_KEYS.EMPRESA_ID)

        if (userData.cargo) localStorage.setItem(AUTH_KEYS.USER_ROLE, userData.cargo)
        else localStorage.removeItem(AUTH_KEYS.USER_ROLE)
    },

    // Get user data from localStorage
    getUserData: (): UserData | null => {
        const data = localStorage.getItem(AUTH_KEYS.USER_DATA)
        if (!data) return null
        try {
            return JSON.parse(data) as UserData
        } catch {
            return null
        }
    },

    // Get user role from localStorage
    getUserRole: (): 'admin' | 'tecnico' | null => {
        const role = localStorage.getItem(AUTH_KEYS.USER_ROLE)
        return role as 'admin' | 'tecnico' | null
    },

    // Clear all auth data from localStorage
    clearAll: (): void => {
        localStorage.removeItem(AUTH_KEYS.EMPRESA_ID)
        localStorage.removeItem(AUTH_KEYS.USER_DATA)
        localStorage.removeItem(AUTH_KEYS.USER_ROLE)
    },

    // Check if user is authenticated (has empresa_id)
    isAuthenticated: (): boolean => {
        return !!localStorage.getItem(AUTH_KEYS.EMPRESA_ID)
    },
}

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isPlaceholder = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')

if (isPlaceholder) {
    const errorMsg = '⚠️ SUPABASE NÃO CONFIGURADO: As variáveis de ambiente não foram encontradas na Vercel. O sistema está usando um URL de teste (placeholder).'
    console.error(errorMsg)
}

export const supabase = createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
)

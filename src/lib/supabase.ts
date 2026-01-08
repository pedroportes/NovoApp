import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = '⚠️ Variáveis de ambiente do Supabase não encontradas! Verifique o painel da Vercel ou o arquivo .env local.'
    console.error(errorMsg)
    // No ambiente de dev, avisamos no console. Em produção, isso ajudará a diagnosticar no log.
}

export const supabase = createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
)

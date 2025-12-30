export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            empresas: {
                Row: {
                    id: string
                    created_at: string
                    nome: string
                    cnpj: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    nome: string
                    cnpj?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    nome?: string
                    cnpj?: string | null
                }
            }
            servicos: {
                Row: {
                    id: string
                    created_at: string
                    empresa_id: string
                    nome: string
                    descricao: string | null
                    valor_padrao: number
                    ativo: boolean
                }
                Insert: {
                    id?: string
                    created_at?: string
                    empresa_id: string
                    nome: string
                    descricao?: string | null
                    valor_padrao?: number
                    ativo?: boolean
                }
                Update: {
                    id?: string
                    created_at?: string
                    empresa_id?: string
                    nome?: string
                    descricao?: string | null
                    valor_padrao?: number
                    ativo?: boolean
                }
            }
            tecnicos: {
                Row: {
                    id: string
                    created_at: string
                    nome: string
                    usuario_id: string | null
                    empresa_id: string
                    ativo: boolean
                }
                Insert: {
                    id?: string
                    created_at?: string
                    nome: string
                    usuario_id?: string | null
                    empresa_id: string
                    ativo?: boolean
                }
                Update: {
                    id?: string
                    created_at?: string
                    nome?: string
                    usuario_id?: string | null
                    empresa_id?: string
                    ativo?: boolean
                }
            }
            clientes: {
                Row: {
                    id: string
                    created_at: string
                    nome: string
                    endereco: string | null
                    telefone: string | null
                    empresa_id: string
                }
                Insert: {
                    id?: string
                    created_at?: string
                    nome: string
                    endereco?: string | null
                    telefone?: string | null
                    empresa_id: string
                }
                Update: {
                    id?: string
                    created_at?: string
                    nome?: string
                    endereco?: string | null
                    telefone?: string | null
                    empresa_id?: string
                }
            }
            ordens_servico: {
                Row: {
                    id: string
                    created_at: string
                    cliente_id: string
                    tecnico_id: string
                    empresa_id: string
                    status: string
                    valor_total: number | null
                    descricao_servico: string | null
                    tipo: string | null
                    data_agendamento: string | null
                    validade: string | null
                    itens: Json | null
                    fotos: Json | null
                    cliente_nome: string
                    cliente_whatsapp: string | null
                    assinatura_cliente_url: string | null
                    observacoes: string | null
                    desconto: number | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    cliente_id: string
                    tecnico_id: string
                    empresa_id: string
                    status?: string
                    valor_total?: number | null
                    descricao_servico?: string | null
                    tipo?: string | null
                    data_agendamento?: string | null
                    validade?: string | null
                    itens?: Json | null
                    fotos?: Json | null
                    assinatura_cliente_url?: string | null
                    observacoes?: string | null
                    cliente_nome?: string
                    cliente_whatsapp?: string | null
                    desconto?: number | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    cliente_id?: string
                    tecnico_id?: string
                    empresa_id?: string
                    status?: string
                    valor_total?: number | null
                    descricao_servico?: string | null
                    tipo?: string | null
                    data_agendamento?: string | null
                    validade?: string | null
                    itens?: Json | null
                    fotos?: Json | null
                    assinatura_cliente_url?: string | null
                    observacoes?: string | null
                    cliente_nome?: string
                    cliente_whatsapp?: string | null
                    desconto?: number | null
                }
            }
            despesas_tecnicos: {
                Row: {
                    id: string
                    created_at: string
                    tecnico_id: string
                    empresa_id: string
                    valor: number
                    descricao: string
                    comprovante_url: string | null
                    aprovado: boolean
                }
                Insert: {
                    id?: string
                    created_at?: string
                    tecnico_id: string
                    empresa_id: string
                    valor: number
                    descricao: string
                    comprovante_url?: string | null
                    aprovado?: boolean
                }
                Update: {
                    id?: string
                    created_at?: string
                    tecnico_id?: string
                    empresa_id?: string
                    valor?: number
                    descricao?: string
                    comprovante_url?: string | null
                    aprovado?: boolean
                }
            }
            usuarios: {
                Row: {
                    id: string
                    created_at: string
                    empresa_id: string
                    cargo: 'admin' | 'tecnico'
                    nome: string | null
                    nome_completo: string
                    email: string
                }
                Insert: {
                    id?: string
                    created_at?: string
                    empresa_id: string
                    cargo: 'admin' | 'tecnico'
                    nome?: string | null
                    nome_completo: string
                    email: string
                }
                Update: {
                    id?: string
                    created_at?: string
                    empresa_id?: string
                    cargo?: 'admin' | 'tecnico'
                    nome?: string
                    email?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            create_technician_user: {
                Args: {
                    new_email: string
                    new_password: string
                    new_name: string
                    new_phone: string
                    new_commission_rate: number
                    new_base_salary: number
                    new_pix_key: string
                    new_avatar_url: string | null
                    new_signature_url: string | null
                }
                Returns: Json
            }
            update_technician: {
                Args: {
                    target_user_id: string
                    new_name: string
                    new_phone: string
                    new_commission_rate: number
                    new_base_salary: number
                    new_pix_key: string
                    new_password?: string
                    new_avatar_url: string | null
                    new_signature_url: string | null
                }
                Returns: Json
            }
            delete_technician: {
                Args: {
                    target_user_id: string
                }
                Returns: Json
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}

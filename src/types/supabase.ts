export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            clientes: {
                Row: {
                    address: string | null
                    ativo: boolean | null
                    avatar_url: string | null
                    bairro: string | null
                    cep: string | null
                    cidade: string | null
                    complemento: string | null
                    cpf_cnpj: string | null
                    created_at: string
                    documento: string | null
                    email: string | null
                    empresa_id: string | null
                    endereco: string | null
                    id: string
                    is_recurring: boolean | null
                    logradouro: string | null
                    nome: string | null
                    nome_razao: string
                    numero: string | null
                    photo_url: string | null
                    rating: number | null
                    reference: string | null
                    referencia: string | null
                    signature_url: string | null
                    telefone: string | null
                    uf: string | null
                    whatsapp: string | null
                }
                Insert: {
                    address?: string | null
                    ativo?: boolean | null
                    avatar_url?: string | null
                    bairro?: string | null
                    cep?: string | null
                    cidade?: string | null
                    complemento?: string | null
                    cpf_cnpj?: string | null
                    created_at?: string
                    documento?: string | null
                    email?: string | null
                    empresa_id?: string | null
                    endereco?: string | null
                    id?: string
                    is_recurring?: boolean | null
                    logradouro?: string | null
                    nome?: string | null
                    nome_razao: string
                    numero?: string | null
                    photo_url?: string | null
                    rating?: number | null
                    reference?: string | null
                    referencia?: string | null
                    signature_url?: string | null
                    telefone?: string | null
                    uf?: string | null
                    whatsapp?: string | null
                }
                Update: {
                    address?: string | null
                    ativo?: boolean | null
                    avatar_url?: string | null
                    bairro?: string | null
                    cep?: string | null
                    cidade?: string | null
                    complemento?: string | null
                    cpf_cnpj?: string | null
                    created_at?: string
                    documento?: string | null
                    email?: string | null
                    empresa_id?: string | null
                    endereco?: string | null
                    id?: string
                    is_recurring?: boolean | null
                    logradouro?: string | null
                    nome?: string | null
                    nome_razao?: string
                    numero?: string | null
                    photo_url?: string | null
                    rating?: number | null
                    reference?: string | null
                    referencia?: string | null
                    signature_url?: string | null
                    telefone?: string | null
                    uf?: string | null
                    whatsapp?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "clientes_empresa_id_fkey"
                        columns: ["empresa_id"]
                        isOneToOne: false
                        referencedRelation: "empresas"
                        referencedColumns: ["id"]
                    },
                ]
            }
            documentos_os: {
                Row: {
                    created_at: string
                    id: string
                    nome: string
                    ordem_servico_id: string
                    tipo: string
                    url: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    nome: string
                    ordem_servico_id: string
                    tipo: string
                    url: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    nome?: string
                    ordem_servico_id?: string
                    tipo?: string
                    url?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "documentos_os_ordem_servico_id_fkey"
                        columns: ["ordem_servico_id"]
                        isOneToOne: false
                        referencedRelation: "ordens_servico"
                        referencedColumns: ["id"]
                    },
                ]
            }
            empresas: {
                Row: {
                    active: boolean | null
                    address: string | null
                    bairro: string | null
                    celular: string | null
                    cep: string | null
                    cidade: string | null
                    cnpj: string | null
                    complemento: string | null
                    configuracoes: Json | null
                    created_at: string
                    current_period_end: string | null
                    dono_id: string | null
                    email: string | null
                    id: string
                    logo_url: string | null
                    nome: string
                    nome_fantasia: string | null
                    numero: string | null
                    plano: string | null
                    slug: string | null
                    stripe_customer_id: string | null
                    stripe_subscription_id: string | null
                    subscription_price_id: string | null
                    subscription_status: string | null
                    telefone: string | null
                    uf: string | null
                    updated_at: string | null
                }
                Insert: {
                    active?: boolean | null
                    address?: string | null
                    bairro?: string | null
                    celular?: string | null
                    cep?: string | null
                    cidade?: string | null
                    cnpj?: string | null
                    complemento?: string | null
                    configuracoes?: Json | null
                    created_at?: string
                    current_period_end?: string | null
                    dono_id?: string | null
                    email?: string | null
                    id?: string
                    logo_url?: string | null
                    nome: string
                    nome_fantasia?: string | null
                    numero?: string | null
                    plano?: string | null
                    slug?: string | null
                    stripe_customer_id?: string | null
                    stripe_subscription_id?: string | null
                    subscription_price_id?: string | null
                    subscription_status?: string | null
                    telefone?: string | null
                    uf?: string | null
                    updated_at?: string | null
                }
                Update: {
                    active?: boolean | null
                    address?: string | null
                    bairro?: string | null
                    celular?: string | null
                    cep?: string | null
                    cidade?: string | null
                    cnpj?: string | null
                    complemento?: string | null
                    configuracoes?: Json | null
                    created_at?: string
                    current_period_end?: string | null
                    dono_id?: string | null
                    email?: string | null
                    id?: string
                    logo_url?: string | null
                    nome?: string
                    nome_fantasia?: string | null
                    numero?: string | null
                    plano?: string | null
                    slug?: string | null
                    stripe_customer_id?: string | null
                    stripe_subscription_id?: string | null
                    subscription_price_id?: string | null
                    subscription_status?: string | null
                    telefone?: string | null
                    uf?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            estoque: {
                Row: {
                    created_at: string
                    descricao: string | null
                    empresa_id: string | null
                    id: string
                    nome: string
                    quantidade: number | null
                    unidade: string | null
                }
                Insert: {
                    created_at?: string
                    descricao?: string | null
                    empresa_id?: string | null
                    id?: string
                    nome: string
                    quantidade?: number | null
                    unidade?: string | null
                }
                Update: {
                    created_at?: string
                    descricao?: string | null
                    empresa_id?: string | null
                    id?: string
                    nome?: string
                    quantidade?: number | null
                    unidade?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "estoque_empresa_id_fkey"
                        columns: ["empresa_id"]
                        isOneToOne: false
                        referencedRelation: "empresas"
                        referencedColumns: ["id"]
                    },
                ]
            }
            financeiro_fluxo: {
                Row: {
                    categoria: string | null
                    created_at: string
                    data: string
                    descricao: string | null
                    empresa_id: string | null
                    id: string
                    metodo_pagamento: string | null
                    ordem_servico_id: string | null
                    status: string | null
                    tecnico_id: string | null
                    tipo: string
                    valor: number
                }
                Insert: {
                    categoria?: string | null
                    created_at?: string
                    data?: string
                    descricao?: string | null
                    empresa_id?: string | null
                    id?: string
                    metodo_pagamento?: string | null
                    ordem_servico_id?: string | null
                    status?: string | null
                    tecnico_id?: string | null
                    tipo: string
                    valor: number
                }
                Update: {
                    categoria?: string | null
                    created_at?: string
                    data?: string
                    descricao?: string | null
                    empresa_id?: string | null
                    id?: string
                    metodo_pagamento?: string | null
                    ordem_servico_id?: string | null
                    status?: string | null
                    tecnico_id?: string | null
                    tipo?: string
                    valor?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "financeiro_fluxo_empresa_id_fkey"
                        columns: ["empresa_id"]
                        isOneToOne: false
                        referencedRelation: "empresas"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "financeiro_fluxo_ordem_servico_id_fkey"
                        columns: ["ordem_servico_id"]
                        isOneToOne: false
                        referencedRelation: "ordens_servico"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "fk_financeiro_fluxo_tecnico"
                        columns: ["tecnico_id"]
                        isOneToOne: false
                        referencedRelation: "usuarios"
                        referencedColumns: ["id"]
                    },
                ]
            }
            notificacoes: {
                Row: {
                    created_at: string
                    empresa_id: string | null
                    id: string
                    lida: boolean | null
                    mensagem: string
                    tipo: string | null
                    titulo: string
                    usuario_id: string | null
                }
                Insert: {
                    created_at?: string
                    empresa_id?: string | null
                    id?: string
                    lida?: boolean | null
                    mensagem: string
                    tipo?: string | null
                    titulo: string
                    usuario_id?: string | null
                }
                Update: {
                    created_at?: string
                    empresa_id?: string | null
                    id?: string
                    lida?: boolean | null
                    mensagem?: string
                    tipo?: string | null
                    titulo?: string
                    usuario_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "notificacoes_empresa_id_fkey"
                        columns: ["empresa_id"]
                        isOneToOne: false
                        referencedRelation: "empresas"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "notificacoes_usuario_id_fkey"
                        columns: ["usuario_id"]
                        isOneToOne: false
                        referencedRelation: "usuarios"
                        referencedColumns: ["id"]
                    },
                ]
            }
            ordens_servico: {
                Row: {
                    cliente_id: string | null
                    contrato_gerado: boolean | null
                    created_at: string
                    data_agendamento: string | null
                    data_conclusao: string | null
                    data_inicio: string | null
                    descricao: string | null
                    empresa_id: string | null
                    id: string
                    metodo_pagamento: string | null
                    observacoes: string | null
                    orcamento_gerado: boolean | null
                    recibo_gerado: boolean | null
                    status: string | null
                    tecnico_id: string | null
                    valor_total: number | null
                }
                Insert: {
                    cliente_id?: string | null
                    contrato_gerado?: boolean | null
                    created_at?: string
                    data_agendamento?: string | null
                    data_conclusao?: string | null
                    data_inicio?: string | null
                    descricao?: string | null
                    empresa_id?: string | null
                    id?: string
                    metodo_pagamento?: string | null
                    observacoes?: string | null
                    orcamento_gerado?: boolean | null
                    recibo_gerado?: boolean | null
                    status?: string | null
                    tecnico_id?: string | null
                    valor_total?: number | null
                }
                Update: {
                    cliente_id?: string | null
                    contrato_gerado?: boolean | null
                    created_at?: string
                    data_agendamento?: string | null
                    data_conclusao?: string | null
                    data_inicio?: string | null
                    descricao?: string | null
                    empresa_id?: string | null
                    id?: string
                    metodo_pagamento?: string | null
                    observacoes?: string | null
                    orcamento_gerado?: boolean | null
                    recibo_gerado?: boolean | null
                    status?: string | null
                    tecnico_id?: string | null
                    valor_total?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "ordens_servico_cliente_id_fkey"
                        columns: ["cliente_id"]
                        isOneToOne: false
                        referencedRelation: "clientes"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "ordens_servico_empresa_id_fkey"
                        columns: ["empresa_id"]
                        isOneToOne: false
                        referencedRelation: "empresas"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "ordens_servico_tecnico_id_fkey"
                        columns: ["tecnico_id"]
                        isOneToOne: false
                        referencedRelation: "usuarios"
                        referencedColumns: ["id"]
                    },
                ]
            }
            servicos: {
                Row: {
                    created_at: string
                    descricao: string | null
                    empresa_id: string | null
                    id: string
                    nome: string
                    preco_sugerido: number | null
                }
                Insert: {
                    created_at?: string
                    descricao?: string | null
                    empresa_id?: string | null
                    id?: string
                    nome: string
                    preco_sugerido?: number | null
                }
                Update: {
                    created_at?: string
                    descricao?: string | null
                    empresa_id?: string | null
                    id?: string
                    nome?: string
                    preco_sugerido?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "servicos_empresa_id_fkey"
                        columns: ["empresa_id"]
                        isOneToOne: false
                        referencedRelation: "empresas"
                        referencedColumns: ["id"]
                    },
                ]
            }
            usuarios: {
                Row: {
                    avatar_url: string | null
                    cargo: string | null
                    created_at: string
                    email: string | null
                    empresa_id: string | null
                    id: string
                    nome: string | null
                    nome_completo: string | null
                    telefone: string | null
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    cargo?: string | null
                    created_at?: string
                    email?: string | null
                    empresa_id?: string | null
                    id: string
                    nome?: string | null
                    nome_completo?: string | null
                    telefone?: string | null
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    cargo?: string | null
                    created_at?: string
                    email?: string | null
                    empresa_id?: string | null
                    id?: string
                    nome?: string | null
                    nome_completo?: string | null
                    telefone?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "usuarios_empresa_id_fkey"
                        columns: ["empresa_id"]
                        isOneToOne: false
                        referencedRelation: "empresas"
                        referencedColumns: ["id"]
                    },
                ]
            }
            veiculos: {
                Row: {
                    ano: number | null
                    created_at: string
                    empresa_id: string | null
                    id: string
                    marca: string | null
                    modelo: string | null
                    placa: string
                }
                Insert: {
                    ano?: number | null
                    created_at?: string
                    empresa_id?: string | null
                    id?: string
                    marca?: string | null
                    modelo?: string | null
                    placa: string
                }
                Update: {
                    ano?: number | null
                    created_at?: string
                    empresa_id?: string | null
                    id?: string
                    marca?: string | null
                    modelo?: string | null
                    placa?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "veiculos_empresa_id_fkey"
                        columns: ["empresa_id"]
                        isOneToOne: false
                        referencedRelation: "empresas"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            ensure_complete_signup: {
                Args: Record<PropertyKey, never>
                Returns: Json
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

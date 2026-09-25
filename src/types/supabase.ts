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
                    ativo: boolean | null
                    bairro: string | null
                    cep: string | null
                    assinatura_url: string | null
                    cidade: string | null
                    complemento: string | null
                    cpf_cnpj: string | null
                    created_at: string | null
                    email: string | null
                    empresa_id: string | null
                    id: string
                    logradouro: string | null
                    nome_razao: string
                    numero: string | null
                    uf: string | null
                    whatsapp: string | null
                    criado_por: string | null
                }
                Insert: {
                    ativo?: boolean | null
                    bairro?: string | null
                    cep?: string | null
                    cidade?: string | null
                    complemento?: string | null
                    cpf_cnpj?: string | null
                    created_at?: string | null
                    email?: string | null
                    empresa_id?: string | null
                    id?: string
                    logradouro?: string | null
                    nome_razao: string
                    numero?: string | null
                    uf?: string | null
                    whatsapp?: string | null
                }
                Update: {
                    ativo?: boolean | null
                    bairro?: string | null
                    cep?: string | null
                    cidade?: string | null
                    complemento?: string | null
                    cpf_cnpj?: string | null
                    created_at?: string | null
                    email?: string | null
                    empresa_id?: string | null
                    id?: string
                    logradouro?: string | null
                    nome_razao?: string
                    numero?: string | null
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
            despesas_tecnicos: {
                Row: {
                    comprovante_url: string | null
                    created_at: string | null
                    descricao: string
                    empresa_id: string | null
                    id: string
                    status: string | null
                    tecnico_id: string | null
                    valor: number
                }
                Insert: {
                    comprovante_url?: string | null
                    created_at?: string | null
                    descricao: string
                    empresa_id?: string | null
                    id?: string
                    status?: string | null
                    tecnico_id?: string | null
                    valor: number
                }
                Update: {
                    comprovante_url?: string | null
                    created_at?: string | null
                    descricao?: string
                    empresa_id?: string | null
                    id?: string
                    status?: string | null
                    tecnico_id?: string | null
                    valor?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "despesas_tecnicos_empresa_id_fkey"
                        columns: ["empresa_id"]
                        isOneToOne: false
                        referencedRelation: "empresas"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "despesas_tecnicos_tecnico_id_fkey"
                        columns: ["tecnico_id"]
                        isOneToOne: false
                        referencedRelation: "usuarios"
                        referencedColumns: ["id"]
                    },
                ]
            }
            empresas: {
                Row: {
                    cnpj: string | null
                    configs: Json | null
                    created_at: string | null
                    current_period_end: string | null
                    dono_id: string | null
                    id: string
                    nome: string
                    nome_fantasia: string | null
                    stripe_customer_id: string | null
                    stripe_subscription_id: string | null
                    subscription_price_id: string | null
                    subscription_status: string | null
                    assinatura_url: string | null
                    focus_nfe_token: string | null
                    focus_nfe_ambiente: 'homologacao' | 'producao' | null
                    inscricao_estadual: string | null
                    inscricao_municipal: string | null
                    regime_tributario: string | null
                    usa_nfse_nacional: boolean | null
                    codigo_municipio: string | null
                }
                Insert: {
                    cnpj?: string | null
                    created_at?: string | null
                    current_period_end?: string | null
                    dono_id?: string | null
                    id?: string
                    nome: string
                    nome_fantasia?: string | null
                    stripe_customer_id?: string | null
                    stripe_subscription_id?: string | null
                    subscription_price_id?: string | null
                    subscription_status?: string | null
                    assinatura_url?: string | null
                    focus_nfe_token?: string | null
                    focus_nfe_ambiente?: 'homologacao' | 'producao' | null
                    inscricao_estadual?: string | null
                    inscricao_municipal?: string | null
                    regime_tributario?: string | null
                    usa_nfse_nacional?: boolean | null
                    codigo_municipio?: string | null
                }
                Update: {
                    cnpj?: string | null
                    created_at?: string | null
                    current_period_end?: string | null
                    dono_id?: string | null
                    id?: string
                    nome?: string
                    nome_fantasia?: string | null
                    stripe_customer_id?: string | null
                    stripe_subscription_id?: string | null
                    subscription_price_id?: string | null
                    subscription_status?: string | null
                    assinatura_url?: string | null
                    focus_nfe_token?: string | null
                    focus_nfe_ambiente?: 'homologacao' | 'producao' | null
                    inscricao_estadual?: string | null
                    inscricao_municipal?: string | null
                    regime_tributario?: string | null
                    usa_nfse_nacional?: boolean | null
                    codigo_municipio?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "empresas_dono_id_fkey"
                        columns: ["dono_id"]
                        isOneToOne: false
                        referencedRelation: "usuarios"
                        referencedColumns: ["id"]
                    },
                ]
            }
            empresa_settings: {
                Row: {
                    created_at: string | null
                    email: string | null
                    empresa_id: string | null
                    endereco: string | null
                    id: string
                    logo_url: string | null
                    nome: string
                    plano: string | null
                    status: string | null
                    telefone: string | null
                }
                Insert: {
                    created_at?: string | null
                    email?: string | null
                    empresa_id?: string | null
                    endereco?: string | null
                    id?: string
                    logo_url?: string | null
                    nome: string
                    plano?: string | null
                    status?: string | null
                    telefone?: string | null
                }
                Update: {
                    created_at?: string | null
                    email?: string | null
                    empresa_id?: string | null
                    endereco?: string | null
                    id?: string
                    logo_url?: string | null
                    nome?: string
                    plano?: string | null
                    status?: string | null
                    telefone?: string | null
                }
                Relationships: []
            }
            estoque: {
                Row: {
                    created_at: string | null
                    empresa_id: string | null
                    id: string
                    nome: string
                    quantidade_atual: number
                    quantidade_minima: number
                    unidade: string
                    valor_custo: number | null
                    valor_venda: number | null
                }
                Insert: {
                    created_at?: string | null
                    empresa_id?: string | null
                    id?: string
                    nome: string
                    quantidade_atual?: number
                    quantidade_minima?: number
                    unidade?: string
                    valor_custo?: number | null
                    valor_venda?: number | null
                }
                Update: {
                    created_at?: string | null
                    empresa_id?: string | null
                    id?: string
                    nome?: string
                    quantidade_atual?: number
                    quantidade_minima?: number
                    unidade?: string
                    valor_custo?: number | null
                    valor_venda?: number | null
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
                    created_at: string | null
                    data_lancamento: string
                    descricao: string
                    empresa_id: string | null
                    id: string
                    status: string | null
                    tipo: string
                    valor: number
                }
                Insert: {
                    categoria?: string | null
                    created_at?: string | null
                    data_lancamento?: string
                    descricao: string
                    empresa_id?: string | null
                    id?: string
                    status?: string | null
                    tipo: string
                    valor: number
                }
                Update: {
                    categoria?: string | null
                    created_at?: string | null
                    data_lancamento?: string
                    descricao?: string
                    empresa_id?: string | null
                    id?: string
                    status?: string | null
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
                ]
            }
            historico_comissoes: {
                Row: {
                    comissao_percentual: number
                    created_at: string | null
                    data_fechamento: string | null
                    empresa_id: string | null
                    id: string
                    os_id: string | null
                    status_pagamento: string | null
                    tecnico_id: string | null
                    valor_base: number
                    valor_comissao: number
                }
                Insert: {
                    comissao_percentual: number
                    created_at?: string | null
                    data_fechamento?: string | null
                    empresa_id?: string | null
                    id?: string
                    os_id?: string | null
                    status_pagamento?: string | null
                    tecnico_id?: string | null
                    valor_base: number
                    valor_comissao: number
                }
                Update: {
                    comissao_percentual?: number
                    created_at?: string | null
                    data_fechamento?: string | null
                    empresa_id?: string | null
                    id?: string
                    os_id?: string | null
                    status_pagamento?: string | null
                    tecnico_id?: string | null
                    valor_base?: number
                    valor_comissao?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "historico_comissoes_empresa_id_fkey"
                        columns: ["empresa_id"]
                        isOneToOne: false
                        referencedRelation: "empresas"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "historico_comissoes_os_id_fkey"
                        columns: ["os_id"]
                        isOneToOne: false
                        referencedRelation: "ordens_servico"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "historico_comissoes_tecnico_id_fkey"
                        columns: ["tecnico_id"]
                        isOneToOne: false
                        referencedRelation: "usuarios"
                        referencedColumns: ["id"]
                    },
                ]
            }
            notificacoes: {
                Row: {
                    created_at: string | null
                    id: string
                    lida: boolean | null
                    mensagem: string
                    titulo: string
                    user_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    lida?: boolean | null
                    mensagem: string
                    titulo: string
                    user_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    lida?: boolean | null
                    mensagem?: string
                    titulo?: string
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "notificacoes_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "usuarios"
                        referencedColumns: ["id"]
                    },
                ]
            }
            ordens_servico: {
                Row: {
                    cliente_id: string | null
                    cliente_nome: string | null
                    created_at: string | null
                    data_agendamento: string | null
                    descricao: string | null
                    deslocamento_iniciado_em: string | null
                    empresa_id: string | null
                    endereco: string | null
                    fotos_conclusao: string[] | null
                    id: string
                    itens: Json | null
                    observacoes_internas: string | null
                    previsao_chegada: string | null
                    status: string | null
                    tecnico_id: string | null
                    updated_at: string | null
                    valor_total: number | null
                }
                Insert: {
                    cliente_id?: string | null
                    cliente_nome?: string | null
                    created_at?: string | null
                    data_agendamento?: string | null
                    descricao?: string | null
                    deslocamento_iniciado_em?: string | null
                    empresa_id?: string | null
                    endereco?: string | null
                    fotos_conclusao?: string[] | null
                    id?: string
                    itens?: Json | null
                    observacoes_internas?: string | null
                    previsao_chegada?: string | null
                    status?: string | null
                    tecnico_id?: string | null
                    updated_at?: string | null
                    valor_total?: number | null
                }
                Update: {
                    cliente_id?: string | null
                    cliente_nome?: string | null
                    created_at?: string | null
                    data_agendamento?: string | null
                    descricao?: string | null
                    deslocamento_iniciado_em?: string | null
                    empresa_id?: string | null
                    endereco?: string | null
                    fotos_conclusao?: string[] | null
                    id?: string
                    itens?: Json | null
                    observacoes_internas?: string | null
                    previsao_chegada?: string | null
                    status?: string | null
                    tecnico_id?: string | null
                    updated_at?: string | null
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
                    ativo: boolean | null
                    codigo_tributacao_nacional: string | null
                    created_at: string | null
                    descricao: string | null
                    empresa_id: string | null
                    id: string
                    nome: string
                    valor_padrao: number | null
                }
                Insert: {
                    ativo?: boolean | null
                    codigo_tributacao_nacional?: string | null
                    created_at?: string | null
                    descricao?: string | null
                    empresa_id?: string | null
                    id?: string
                    nome: string
                    valor_padrao?: number | null
                }
                Update: {
                    ativo?: boolean | null
                    codigo_tributacao_nacional?: string | null
                    created_at?: string | null
                    descricao?: string | null
                    empresa_id?: string | null
                    id?: string
                    nome?: string
                    valor_padrao?: number | null
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
                    active: boolean | null
                    avatar_url: string | null
                    cargo: string
                    created_at: string | null
                    email: string
                    empresa_id: string | null
                    id: string
                    latitude: number | null
                    longitude: number | null
                    nome_completo: string | null
                    pix_chave: string | null
                    pix_tipo: string | null
                    telefone: string | null
                    ultimo_update: string | null
                    placa: string | null
                    assinatura_url: string | null
                    placa_carro?: string | null
                    avatar?: string | null
                    signature_url?: string | null
                    status: boolean | null
                    must_change_password: boolean | null
                }
                Insert: {
                    active?: boolean | null
                    avatar_url?: string | null
                    cargo?: string
                    created_at?: string | null
                    email: string
                    empresa_id?: string | null
                    id: string
                    latitude?: number | null
                    longitude?: number | null
                    nome_completo?: string | null
                    nome?: string | null
                    pix_chave?: string | null
                    pix_tipo?: string | null
                    telefone?: string | null
                    ultimo_update?: string | null
                    placa?: string | null
                    assinatura_url?: string | null
                    placa_carro?: string | null
                    avatar?: string | null
                    signature_url?: string | null
                    must_change_password?: boolean | false
                }
                Update: {
                    active?: boolean | null
                    avatar_url?: string | null
                    cargo?: string
                    created_at?: string | null
                    email?: string
                    empresa_id?: string | null
                    id?: string
                    latitude?: number | null
                    longitude?: number | null
                    nome_completo?: string | null
                    pix_chave?: string | null
                    pix_tipo?: string | null
                    telefone?: string | null
                    ultimo_update?: string | null
                    placa?: string | null
                    assinatura_url?: string | null
                    placa_carro?: string | null
                    avatar?: string | null
                    signature_url?: string | null
                    must_change_password?: boolean | false
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
                    ativo: boolean | null
                    created_at: string | null
                    empresa_id: string
                    id: string
                    km_atual: number | null
                    marca: string
                    modelo: string
                    placa: string
                    prox_revisao_data: string | null
                    prox_revisao_km: number | null
                }
                Insert: {
                    ano?: number | null
                    ativo?: boolean | null
                    created_at?: string | null
                    empresa_id: string
                    id?: string
                    km_atual?: number | null
                    marca: string
                    modelo: string
                    placa: string
                    prox_revisao_data?: string | null
                    prox_revisao_km?: number | null
                }
                Update: {
                    ano?: number | null
                    ativo?: boolean | null
                    created_at?: string | null
                    empresa_id?: string
                    id?: string
                    km_atual?: number | null
                    marca?: string
                    modelo?: string
                    placa?: string
                    prox_revisao_data?: string | null
                    prox_revisao_km?: number | null
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
            create_company_and_user: {
                Args: {
                    p_company_name: string
                    p_user_email: string
                    p_user_id: string
                    p_user_role: string
                }
                Returns: Json
            }
            create_technician_user: {
                Args: {
                    p_email: string
                    p_password: string
                    p_empresa_id: string
                    p_nome_completo: string
                    p_telefone: string
                    p_cargo: string
                }
                Returns: string
            }
            get_dashboard_stats: {
                Args: {
                    p_empresa_id: string
                    p_start_date?: string
                    p_end_date?: string
                }
                Returns: {
                    total_revenue: number
                    period_revenue: number
                    active_services: number
                    total_clients: number
                }[]
            }
            get_technician_balance: {
                Args: {
                    p_tecnico_id: string
                    p_month: string
                }
                Returns: {
                    saldo_final: number
                    total_comissoes: number
                    total_adiantamentos: number
                    total_despesas: number
                    bonus: number
                }[]
            }
            ensure_complete_signup: {
                Args: {
                    user_id: string
                    user_email: string
                    user_name: string
                    company_name: string
                }
                Returns: void
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



type PublicSchema = Database[Extract<keyof Database, "public">]
type ValidSchemaName = Exclude<keyof Database, "__InternalSupabase">

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: ValidSchemaName },
    TableName extends PublicTableNameOrOptions extends { schema: ValidSchemaName }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: ValidSchemaName }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: ValidSchemaName },
    TableName extends PublicTableNameOrOptions extends { schema: ValidSchemaName }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: ValidSchemaName }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: ValidSchemaName },
    TableName extends PublicTableNameOrOptions extends { schema: ValidSchemaName }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: ValidSchemaName }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: ValidSchemaName },
    EnumName extends PublicEnumNameOrOptions extends { schema: ValidSchemaName }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: ValidSchemaName }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: ValidSchemaName },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: ValidSchemaName
    }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: ValidSchemaName }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

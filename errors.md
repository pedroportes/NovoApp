src/components/ChatAssistant.tsx(5,28): error TS2307: Cannot find module '@/components/ui/scroll-area' or its corresponding type declarations.
src/components/dashboard/RevenueChart.tsx(40,29): error TS2322: Type '(value: number) => [string, "Faturamento"]' is not assignable to type 'Formatter<number, "Faturamento">'.
  Types of parameters 'value' and 'value' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
src/components/dashboard/ServiceDistributionChart.tsx(50,29): error TS2322: Type 'ServiceData[]' is not assignable to type 'ChartDataInput[]'.
  Type 'ServiceData' is not assignable to type 'ChartDataInput'.
    Index signature for type 'string' is missing in type 'ServiceData'.
src/components/dashboard/ServiceDistributionChart.tsx(64,29): error TS2322: Type '(value: number) => string' is not assignable to type 'Formatter<number, NameType>'.
  Types of parameters 'value' and 'value' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
src/components/LiveMap.tsx(62,28): error TS2345: Argument of type 'SelectQueryError<"column 'nome' does not exist on 'usuarios'.">[]' is not assignable to parameter of type 'SetStateAction<TechnicianLocation[]>'.
  Type 'SelectQueryError<"column 'nome' does not exist on 'usuarios'.">[]' is not assignable to type 'TechnicianLocation[]'.
    Type '{ error: true; } & String' is missing the following properties from type 'TechnicianLocation': id, nome, latitude, longitude, ultimo_update
src/components/mode-toggle.tsx(12,37): error TS2367: This comparison appears to be unintentional because the types 'Theme' and '"light"' have no overlap.
src/components/mode-toggle.tsx(12,37): error TS2345: Argument of type '"light" | "dark"' is not assignable to parameter of type 'Theme'.
  Type '"light"' is not assignable to type 'Theme'.
src/contexts/AuthContext.tsx(63,85): error TS2345: Argument of type '"ensure_complete_signup"' is not assignable to parameter of type '"create_company_and_user" | "create_technician_user" | "get_dashboard_stats" | "get_technician_balance"'.
src/contexts/AuthContext.tsx(96,61): error TS2339: Property 'nome' does not exist on type '{ active: boolean | null; avatar_url: string | null; cargo: string; created_at: string | null; email: string; empresa_id: string | null; id: string; last_location: unknown; nome_completo: string | null; pix_chave: string | null; pix_tipo: string | null; telefone: string | null; }'.
src/contexts/AuthContext.tsx(150,73): error TS2339: Property 'nome' does not exist on type '{ active: boolean | null; avatar_url: string | null; cargo: string; created_at: string | null; email: string; empresa_id: string | null; id: string; last_location: unknown; nome_completo: string | null; pix_chave: string | null; pix_tipo: string | null; telefone: string | null; }'.
src/hooks/useLicenseCheck.ts(54,27): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/hooks/useLicenseCheck.ts(77,40): error TS2769: No overload matches this call.
  Overload 1 of 4, '(value: string | number | Date): Date', gave the following error.
    Argument of type 'string | null' is not assignable to parameter of type 'string | number | Date'.
      Type 'null' is not assignable to type 'string | number | Date'.
  Overload 2 of 4, '(value: string | number): Date', gave the following error.
    Argument of type 'string | null' is not assignable to parameter of type 'string | number'.
      Type 'null' is not assignable to type 'string | number'.
src/hooks/useLicenseCheck.ts(87,104): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/hooks/useLicenseCheck.ts(88,110): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/hooks/useLicenseCheck.ts(89,104): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/hooks/useLocationTracker.ts(49,25): error TS2353: Object literal may only specify known properties, and 'latitude' does not exist in type '{ active?: boolean | null | undefined; avatar_url?: string | null | undefined; cargo?: string | undefined; created_at?: string | null | undefined; email?: string | undefined; empresa_id?: string | ... 1 more ... | undefined; ... 5 more ...; telefone?: string | ... 1 more ... | undefined; }'.
src/pages/Clients.tsx(51,31): error TS2339: Property 'configs' does not exist on type 'SelectQueryError<"column 'configs' does not exist on 'empresas'.">'.
src/pages/Clients.tsx(52,58): error TS2339: Property 'configs' does not exist on type 'SelectQueryError<"column 'configs' does not exist on 'empresas'.">'.
src/pages/Dashboard.tsx(273,40): error TS2769: No overload matches this call.
  Overload 1 of 4, '(value: string | number | Date): Date', gave the following error.
    Argument of type 'string | null' is not assignable to parameter of type 'string | number | Date'.
      Type 'null' is not assignable to type 'string | number | Date'.
  Overload 2 of 4, '(value: string | number): Date', gave the following error.
    Argument of type 'string | null' is not assignable to parameter of type 'string | number'.
      Type 'null' is not assignable to type 'string | number'.
src/pages/Dashboard.tsx(425,35): error TS18047: 'userData' is possibly 'null'.
src/pages/Dashboard.tsx(425,35): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/pages/Dashboard.tsx(440,39): error TS2769: No overload matches this call.
  Overload 1 of 4, '(value: string | number | Date): Date', gave the following error.
    Argument of type 'string | null' is not assignable to parameter of type 'string | number | Date'.
      Type 'null' is not assignable to type 'string | number | Date'.
  Overload 2 of 4, '(value: string | number): Date', gave the following error.
    Argument of type 'string | null' is not assignable to parameter of type 'string | number'.
      Type 'null' is not assignable to type 'string | number'.
src/pages/Financial.tsx(68,39): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/pages/Financial.tsx(73,39): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/pages/Financial.tsx(88,39): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/pages/Financial.tsx(116,22): error TS2345: Argument of type '(FluxoItem | { categoria: string | null; created_at: string | null; data_lancamento: string; descricao: string; empresa_id: string | null; id: string; status: string | null; tipo: string; valor: number; })[]' is not assignable to parameter of type 'SetStateAction<FluxoItem[]>'.
  Type '(FluxoItem | { categoria: string | null; created_at: string | null; data_lancamento: string; descricao: string; empresa_id: string | null; id: string; status: string | null; tipo: string; valor: number; })[]' is not assignable to type 'FluxoItem[]'.
    Type 'FluxoItem | { categoria: string | null; created_at: string | null; data_lancamento: string; descricao: string; empresa_id: string | null; id: string; status: string | null; tipo: string; valor: number; }' is not assignable to type 'FluxoItem'.
      Type '{ categoria: string | null; created_at: string | null; data_lancamento: string; descricao: string; empresa_id: string | null; id: string; status: string | null; tipo: string; valor: number; }' is not assignable to type 'FluxoItem'.
        Types of property 'tipo' are incompatible.
          Type 'string' is not assignable to type '"FECHAMENTO" | "ADIANTAMENTO" | "BONUS" | "ENTRADA" | "SAIDA" | "COMISSAO"'.
src/pages/Financial.tsx(196,77): error TS2769: No overload matches this call.
  Overload 1 of 2, '(values: { ano?: number | null | undefined; ativo?: boolean | null | undefined; created_at?: string | null | undefined; empresa_id: string; id?: string | undefined; km_atual?: number | null | undefined; ... 4 more ...; prox_revisao_km?: number | ... 1 more ... | undefined; }, options?: { ...; } | undefined): PostgrestFilterBuilder<...>', gave the following error.
    Argument of type '{ empresa_id: string; placa: string; modelo: string; ano: number; }' is not assignable to parameter of type '{ ano?: number | null | undefined; ativo?: boolean | null | undefined; created_at?: string | null | undefined; empresa_id: string; id?: string | undefined; km_atual?: number | null | undefined; ... 4 more ...; prox_revisao_km?: number | ... 1 more ... | undefined; }'.
      Property 'marca' is missing in type '{ empresa_id: string; placa: string; modelo: string; ano: number; }' but required in type '{ ano?: number | null | undefined; ativo?: boolean | null | undefined; created_at?: string | null | undefined; empresa_id: string; id?: string | undefined; km_atual?: number | null | undefined; ... 4 more ...; prox_revisao_km?: number | ... 1 more ... | undefined; }'.
  Overload 2 of 2, '(values: { ano?: number | null | undefined; ativo?: boolean | null | undefined; created_at?: string | null | undefined; empresa_id: string; id?: string | undefined; km_atual?: number | null | undefined; ... 4 more ...; prox_revisao_km?: number | ... 1 more ... | undefined; }[], options?: { ...; } | undefined): PostgrestFilterBuilder<...>', gave the following error.
    Object literal may only specify known properties, and 'empresa_id' does not exist in type '{ ano?: number | null | undefined; ativo?: boolean | null | undefined; created_at?: string | null | undefined; empresa_id: string; id?: string | undefined; km_atual?: number | null | undefined; ... 4 more ...; prox_revisao_km?: number | ... 1 more ... | undefined; }[]'.
src/pages/FinancialClosing.tsx(55,35): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/pages/Login.tsx(83,30): error TS2345: Argument of type '"ensure_complete_signup"' is not assignable to parameter of type '"create_company_and_user" | "create_technician_user" | "get_dashboard_stats" | "get_technician_balance"'.
src/pages/Login.tsx(85,59): error TS2339: Property 'success' does not exist on type '{ saldo_final: number; total_comissoes: number; total_adiantamentos: number; total_despesas: number; bonus: number; }[]'.
src/pages/Login.tsx(113,45): error TS2339: Property 'id' does not exist on type '{ cargo: string; empresa_id: string | null; empresas: { nome: string; } | null; }'.
src/pages/Services.tsx(52,35): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/pages/Services.tsx(56,25): error TS2345: Argument of type '{ ativo: boolean | null; comissao_fixa: number | null; comissao_percentual: number | null; created_at: string | null; descricao: string | null; empresa_id: string | null; id: string; nome: string; preco_padrao: number; tipo_comissao: string | null; }[]' is not assignable to parameter of type 'SetStateAction<Service[]>'.
  Type '{ ativo: boolean | null; comissao_fixa: number | null; comissao_percentual: number | null; created_at: string | null; descricao: string | null; empresa_id: string | null; id: string; nome: string; preco_padrao: number; tipo_comissao: string | null; }[]' is not assignable to type 'Service[]'.
    Property 'valor_padrao' is missing in type '{ ativo: boolean | null; comissao_fixa: number | null; comissao_percentual: number | null; created_at: string | null; descricao: string | null; empresa_id: string | null; id: string; nome: string; preco_padrao: number; tipo_comissao: string | null; }' but required in type 'Service'.
src/pages/Settings.tsx(110,27): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/pages/TechnicianExpenses.tsx(179,29): error TS2345: Argument of type '{ comprovante_url: string | null; created_at: string | null; descricao: string; empresa_id: string | null; id: string; status: string | null; tecnico_id: string | null; valor: number; }[]' is not assignable to parameter of type 'SetStateAction<Expense[]>'.
  Type '{ comprovante_url: string | null; created_at: string | null; descricao: string; empresa_id: string | null; id: string; status: string | null; tecnico_id: string | null; valor: number; }[]' is not assignable to type 'Expense[]'.
    Type '{ comprovante_url: string | null; created_at: string | null; descricao: string; empresa_id: string | null; id: string; status: string | null; tecnico_id: string | null; valor: number; }' is not assignable to type 'Expense'.
      Types of property 'status' are incompatible.
        Type 'string | null' is not assignable to type '"aprovado" | "pendente" | "rejeitado" | "pago"'.
          Type 'null' is not assignable to type '"aprovado" | "pendente" | "rejeitado" | "pago"'.
src/services/syncService.ts(24,23): error TS2322: Type '{ synced: number; updated_at: string; ativo: boolean | null; bairro: string | null; cep: string | null; cidade: string | null; complemento: string | null; cpf_cnpj: string | null; created_at: string | null; ... 7 more ...; whatsapp: string | null; }[]' is not assignable to type 'LocalClient[]'.
  Type '{ synced: number; updated_at: string; ativo: boolean | null; bairro: string | null; cep: string | null; cidade: string | null; complemento: string | null; cpf_cnpj: string | null; created_at: string | null; ... 7 more ...; whatsapp: string | null; }' is not assignable to type 'LocalClient'.
    Types of property 'empresa_id' are incompatible.
      Type 'string | null' is not assignable to type 'string'.
        Type 'null' is not assignable to type 'string'.
src/services/syncService.ts(41,23): error TS2322: Type '{ ativo: boolean | null; comissao_fixa: number | null; comissao_percentual: number | null; created_at: string | null; descricao: string | null; empresa_id: string | null; id: string; nome: string; preco_padrao: number; tipo_comissao: string | null; }[]' is not assignable to type 'LocalService[]'.
  Property 'valor_padrao' is missing in type '{ ativo: boolean | null; comissao_fixa: number | null; comissao_percentual: number | null; created_at: string | null; descricao: string | null; empresa_id: string | null; id: string; nome: string; preco_padrao: number; tipo_comissao: string | null; }' but required in type 'LocalService'.
src/services/syncService.ts(59,23): error TS2322: Type '{ synced: number; action: undefined; updated_at: string; cliente_id: string | null; cliente_nome: string | null; created_at: string | null; data_agendamento: string | null; descricao: string | null; ... 10 more ...; valor_total: number | null; }[]' is not assignable to type 'LocalServiceOrder[]'.
  Type '{ synced: number; action: undefined; updated_at: string; cliente_id: string | null; cliente_nome: string | null; created_at: string | null; data_agendamento: string | null; descricao: string | null; ... 10 more ...; valor_total: number | null; }' is missing the following properties from type 'LocalServiceOrder': tipo, fotos
src/types/supabase.ts(700,14): error TS2536: Type '"Tables"' cannot be used to index type 'Database[PublicTableNameOrOptions["schema"]]'.
src/types/supabase.ts(701,9): error TS2536: Type '"Views"' cannot be used to index type 'Database[PublicTableNameOrOptions["schema"]]'.
src/types/supabase.ts(704,8): error TS2536: Type '"Tables"' cannot be used to index type 'Database[PublicTableNameOrOptions["schema"]]'.
src/types/supabase.ts(705,9): error TS2536: Type '"Views"' cannot be used to index type 'Database[PublicTableNameOrOptions["schema"]]'.
src/types/supabase.ts(725,13): error TS2536: Type '"Tables"' cannot be used to index type 'Database[PublicTableNameOrOptions["schema"]]'.
src/types/supabase.ts(728,7): error TS2536: Type '"Tables"' cannot be used to index type 'Database[PublicTableNameOrOptions["schema"]]'.
src/types/supabase.ts(746,13): error TS2536: Type '"Tables"' cannot be used to index type 'Database[PublicTableNameOrOptions["schema"]]'.
src/types/supabase.ts(749,7): error TS2536: Type '"Tables"' cannot be used to index type 'Database[PublicTableNameOrOptions["schema"]]'.
src/types/supabase.ts(767,13): error TS2536: Type '"Enums"' cannot be used to index type 'Database[PublicEnumNameOrOptions["schema"]]'.
src/types/supabase.ts(770,7): error TS2536: Type '"Enums"' cannot be used to index type 'Database[PublicEnumNameOrOptions["schema"]]'.
src/types/supabase.ts(782,13): error TS2536: Type '"CompositeTypes"' cannot be used to index type 'Database[PublicCompositeTypeNameOrOptions["schema"]]'.
src/types/supabase.ts(785,7): error TS2536: Type '"CompositeTypes"' cannot be used to index type 'Database[PublicCompositeTypeNameOrOptions["schema"]]'.

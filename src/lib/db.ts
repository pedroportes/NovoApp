import Dexie, { Table } from 'dexie';

// Define types for our local data
// These should mirror the Supabase tables but can be simplified
export interface LocalClient {
    id: string; // UUID from Supabase
    empresa_id: string;
    nome_razao: string;
    cpf_cnpj?: string;
    whatsapp?: string;
    email?: string;
    endereco?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    referencia?: string;
    avatar_url?: string;
    signature_url?: string;
    ativo?: boolean;
    created_at?: string;

    // Sync metadata
    synced: number; // 0 = false, 1 = true
    updated_at: string;
}

export interface LocalServiceOrder {
    id: string; // UUID (or 'local-' + timestamp for new offline items)
    empresa_id: string;
    cliente_id: string;
    cliente_nome?: string; // Cache for list display
    tecnico_id: string;
    status: string;
    tipo: string;
    data_agendamento: string;
    descricao_servico?: string;
    observacoes?: string;
    valor_total: number;
    desconto?: number;
    itens: any[]; // JSON
    fotos: any; // JSON
    assinatura_cliente_url?: string;
    deslocamento_iniciado_em?: string;
    previsao_chegada?: string;
    created_at?: string;

    // Sync metadata
    synced: number; // 0 = pending sync, 1 = synced
    action?: 'create' | 'update'; // If 'create' and id is local, we need to insert. If 'update', we update.
    updated_at: string;
}

export interface LocalService {
    id: string;
    empresa_id: string;
    nome: string;
    descricao?: string;
    valor_padrao: number;
    ativo: boolean;
}

// Queue for operations that need to be sent to Supabase
// Basically a log of mutations
export interface SyncQueueItem {
    id?: number; // Auto-increment
    table: 'clientes' | 'ordens_servico';
    action: 'create' | 'update' | 'delete';
    data: any; // The payload to send
    created_at: number; // Timestamp
}

export interface LocalUser {
    id: string;
    empresa_id: string;
    nome_completo: string;
    email: string;
    cargo: string;
    ativo: boolean;
}

export class FlowDrainDB extends Dexie {
    clientes!: Table<LocalClient>;
    ordens_servico!: Table<LocalServiceOrder>;
    servicos!: Table<LocalService>;
    usuarios!: Table<LocalUser>;
    sync_queue!: Table<SyncQueueItem>;

    constructor() {
        super('FlowDrainDB');

        // Define tables and indexes
        // Primary key is first. Others are indexed props.
        // Primary key is first. Others are indexed props.
        this.version(2).stores({
            clientes: 'id, empresa_id, nome_razao, synced',
            ordens_servico: 'id, empresa_id, cliente_id, tecnico_id, status, data_agendamento, synced',
            servicos: 'id, empresa_id',
            usuarios: 'id, empresa_id, cargo',
            sync_queue: '++id, table, action, created_at'
        });
    }
}

export const db = new FlowDrainDB();

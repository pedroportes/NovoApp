import { supabase } from '@/lib/supabase'
import { db, LocalClient, LocalServiceOrder, LocalService, SyncQueueItem } from '@/lib/db'

export const SyncService = {
    // --- PULL: Get data from Cloud to Local ---

    async pullAllData(empresaId: string) {
        if (!navigator.onLine) return; // Can't pull if offline

        try {
            console.log('🔄 Sync: Pulling data...')

            // 1. Clients
            const { data: clients, error: errClients } = await supabase
                .from('clientes')
                .select('*')
                .eq('empresa_id', empresaId)

            if (errClients) throw errClients;

            if (clients) {
                // Bulk put (create or update)
                // We add 'synced: 1' to indicate these match the server
                const localClients: LocalClient[] = (clients as any[]).map(c => ({
                    id: c.id,
                    empresa_id: c.empresa_id || '',
                    nome_razao: c.nome_razao || 'Sem Nome',
                    cpf_cnpj: c.cpf_cnpj || undefined,
                    whatsapp: c.whatsapp || undefined,
                    email: c.email || undefined,
                    endereco: c.endereco || undefined,
                    cep: c.cep || undefined,
                    logradouro: c.logradouro || undefined,
                    numero: c.numero || undefined,
                    complemento: c.complemento || undefined,
                    bairro: c.bairro || undefined,
                    cidade: c.cidade || undefined,
                    uf: c.uf || undefined,
                    referencia: c.referencia || undefined,
                    avatar_url: c.avatar_url || undefined,
                    signature_url: c.signature_url || undefined,
                    ativo: c.ativo ?? true,
                    criado_por: c.criado_por || null,
                    created_at: c.created_at || new Date().toISOString(),
                    synced: 1,
                    updated_at: new Date().toISOString()
                }))
                await db.clientes.bulkPut(localClients)
            }

            // 2. Services (Catalog)
            const { data: services, error: errServices } = await supabase
                .from('servicos')
                .select('*')
                .eq('empresa_id', empresaId)

            if (errServices) throw errServices;

            if (services) {
                const localServices: LocalService[] = services.map(s => ({
                    id: s.id,
                    nome: s.nome,
                    descricao: s.descricao || undefined,
                    valor_padrao: s.preco_padrao || 0,
                    empresa_id: s.empresa_id || '',
                    ativo: s.ativo ?? true
                }))
                await db.servicos.bulkPut(localServices)
            }

            // 3. Service Orders (Last 30 days maybe? Or all active)
            // For now, let's pull all PENDING or AGENDADO or RECENT
            const { data: oss, error: errOss } = await supabase
                .from('ordens_servico')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('created_at', { ascending: false })
                .limit(100) // Limit to 100 recent for performance initially

            if (errOss) throw errOss;

            if (oss) {
                const localOss: LocalServiceOrder[] = (oss as any[]).map(o => ({
                    id: o.id,
                    empresa_id: o.empresa_id || '',
                    cliente_id: o.cliente_id || '',
                    cliente_nome: o.cliente_nome || undefined,
                    tecnico_id: o.tecnico_id || '',
                    status: o.status || 'PENDENTE',
                    tipo: o.tipo || 'comum',
                    data_agendamento: o.data_agendamento || new Date().toISOString(),
                    descricao_servico: o.descricao_servico || undefined,
                    observacoes: o.observacoes || undefined,
                    valor_total: o.valor_total || 0,
                    desconto: o.desconto || 0,
                    itens: o.itens || [],
                    fotos: o.fotos || [],
                    assinatura_cliente_url: o.assinatura_cliente_url || undefined,
                    deslocamento_iniciado_em: o.deslocamento_iniciado_em || undefined,
                    previsao_chegada: o.previsao_chegada || undefined,
                    orcamento_gerado: o.orcamento_gerado ?? false,
                    recibo_gerado: o.recibo_gerado ?? false,
                    contrato_gerado: o.contrato_gerado ?? false,
                    created_at: o.created_at || new Date().toISOString(),
                    synced: 1,
                    action: undefined,
                    updated_at: new Date().toISOString()
                }))
                // Be careful not to overwrite LOCAL pending changes. 
                // Strategy: Only overwrite if we don't have a pending local change for this ID.

                await db.transaction('rw', db.ordens_servico, async () => {
                    for (const os of localOss) {
                        const existing = await db.ordens_servico.get(os.id);
                        if (!existing || existing.synced === 1) {
                            await db.ordens_servico.put(os);
                        }
                    }
                });
            }

            // 4. Technicians (Usuarios)
            const { data: users, error: errUsers } = await supabase
                .from('usuarios')
                .select('*')
                .eq('empresa_id', empresaId)

            // Actually, we might need admins too? Let's just sync all users of the company.

            if (users) {
                const localUsers: any[] = users.map(u => ({
                    ...u,
                    // sync metadata if needed, but users are mostly read-only offline for now
                }))
                await db.usuarios.bulkPut(localUsers)
            }

            console.log('✅ Sync: Pull complete.')

        } catch (error) {
            console.error('❌ Sync Pull Error:', error)
        }
    },

    // --- PUSH: Send Local Changes to Cloud ---

    async pushQueue() {
        if (!navigator.onLine) {
            console.log('[SyncService] Offline - skipping pushQueue');
            return;
        }

        // Get all items in queue
        const queueItems = await db.sync_queue.toArray();
        if (queueItems.length === 0) {
            console.log('[SyncService] No items in queue to push');
            return;
        }

        console.log(`🚀 [SyncService] Pushing ${queueItems.length} changes...`, queueItems);

        // IMPORTANTE: Processar CLIENTES primeiro para evitar erro de FK nas OS
        const clienteItems = queueItems.filter(item => item.table === 'clientes');
        const osItems = queueItems.filter(item => item.table === 'ordens_servico');
        const orderedItems = [...clienteItems, ...osItems];

        console.log(`[SyncService] Order: ${clienteItems.length} clientes first, then ${osItems.length} OS`);

        for (const item of orderedItems) {
            try {
                console.log(`[SyncService] Processing queue item:`, item);

                // Process based on table and action
                if (item.table === 'clientes') {
                    await this.processClientSync(item);
                } else if (item.table === 'ordens_servico') {
                    await this.processOSSync(item);
                }

                // If successful, remove from queue
                await db.sync_queue.delete(item.id!);
                console.log(`[SyncService] ✅ Removed item ${item.id} from queue`);

            } catch (error) {
                console.error(`[SyncService] ❌ Failed to sync item ${item.id}:`, error);
                // Keep in queue to retry later? Or move to "DLQ" (Dead Letter Queue)?
                // For now, leave in queue.
            }
        }
        console.log('✅ [SyncService] Push complete.')
    },

    async processClientSync(item: SyncQueueItem) {
        const { data: payload, action } = item;

        console.log(`[SyncService] processClientSync - Action: ${action}, ID: ${payload.id}`);

        // Helper: Filter payload to only include valid Supabase columns
        const allowedColumns = [
            'id', 'empresa_id', 'nome_razao', 'cpf_cnpj', 'whatsapp', 'email',
            'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep',
            'referencia', 'ativo', 'criado_por', 'created_at', 'assinatura_url',
            'avatar_url', 'observacoes' // Add any other columns from schema if needed
        ];

        const finalPayload: any = {};
        // Only copy allowed fields that are present in payload
        for (const key of allowedColumns) {
            if (payload[key] !== undefined) {
                finalPayload[key] = payload[key];
            }
        }

        // SANITIZE: Convert empty strings to null for UUID fields
        const uuidFields = ['id', 'empresa_id'];
        for (const key of uuidFields) {
            if (finalPayload[key] === '') {
                finalPayload[key] = null;
            }
        }

        console.log('[SyncService] Client payload final:', finalPayload);

        if (action === 'create' || action === 'update') {
            const { data, error } = await supabase.from('clientes').upsert(finalPayload).select();

            if (error) {
                console.error('[SyncService] ❌ Client upsert error:', error);
                throw error;
            }

            console.log('[SyncService] ✅ Client synced successfully:', data);
            await db.clientes.update(payload.id, { synced: 1 });

        } else if (action === 'delete') {
            const { error } = await supabase.from('clientes').delete().eq('id', payload.id);
            if (error) throw error;
        }
    },

    async processOSSync(item: SyncQueueItem) {
        const { data: payload, action } = item;

        console.log(`[SyncService] processOSSync - Action: ${action}, ID: ${payload.id}`);

        // Helper: Filter payload to only include valid Supabase columns
        const allowedColumns = [
            'id', 'empresa_id', 'cliente_id', 'cliente_nome', 'tecnico_id',
            'status', 'data_agendamento', 'descricao', 'observacoes_internas',
            'valor_total', 'itens', 'fotos_conclusao', 'deslocamento_iniciado_em',
            'previsao_chegada', 'endereco', 'created_at', 'updated_at'
            // Added based on schema. Note: 'orcamento_gerado' etc might not be in schema, 
            // if they are not, they shouldn't be sent. 
            // Schema check: orcamento_gerado NOT in schema 'ordens_servico'.
            // So they are local-only flags or need to be added to DB if we want to sync them.
            // For now, EXCLUDE logic is safer (only allow DB columns).
        ];

        const finalPayload: any = {};
        for (const key of allowedColumns) {
            if (payload[key] !== undefined) {
                finalPayload[key] = payload[key];
            }
        }

        // Fix mapping: local 'descricao_servico' -> remote 'descricao'
        if (payload.descricao_servico && !finalPayload.descricao) {
            finalPayload.descricao = payload.descricao_servico;
        }

        // SANITIZE: Convert empty strings to null for UUID fields to prevent "invalid input syntax for type uuid"
        const uuidFields = ['id', 'empresa_id', 'cliente_id', 'tecnico_id', 'nf_uuid'];
        for (const key of uuidFields) {
            if (finalPayload[key] === '') {
                finalPayload[key] = null;
            }
        }

        console.log('[SyncService] OS Payload final (Cleaned):', finalPayload);

        if (action === 'create' || action === 'update') {
            const { data, error } = await supabase.from('ordens_servico').upsert(finalPayload).select();

            if (error) {
                console.error('[SyncService] ❌ Supabase upsert error:', error);
                throw error;
            }

            console.log('[SyncService] ✅ Successfully synced to Supabase:', data);
            await db.ordens_servico.update(payload.id, { synced: 1 });

        } else if (action === 'delete') {
            console.log(`[SyncService] Deleting OS ${payload.id} from Supabase...`);
            const { error } = await supabase.from('ordens_servico').delete().eq('id', payload.id);

            if (error) {
                console.error('[SyncService] ❌ Supabase delete error:', error);
                throw error;
            }
            console.log('[SyncService] ✅ Successfully deleted from Supabase');
        }
    },

    // --- LOCAL CRUD HELPERS (Offline-First) ---
    // Use these instead of calling supabase directly in components.

    async saveClient(client: Partial<LocalClient>) {
        // 1. Generate ID if new
        const isNew = !client.id;
        const id = client.id || crypto.randomUUID();
        const now = new Date().toISOString();

        const clientToSave: LocalClient = {
            ...client,
            id,
            synced: 0, // Not synced yet
            created_at: client.created_at || now,
            updated_at: now
        } as LocalClient;

        // 2. Save to Local DB (UI updates immediately via useLiveQuery)
        await db.clientes.put(clientToSave);

        // 3. Add to Sync Queue
        const action = isNew ? 'create' : 'update';
        await db.sync_queue.add({
            table: 'clientes',
            action,
            data: clientToSave,
            created_at: Date.now()
        });

        // 4. Try to Sync immediately (background)
        await this.pushQueue();

        return id;
    },

    async createClient(client: LocalClient) {
        // 1. Save to Local DB
        await db.clientes.put({
            ...client,
            synced: 0
        });

        // 2. Add to Sync Queue
        await db.sync_queue.add({
            table: 'clientes',
            action: 'create',
            data: client,
            created_at: Date.now()
        });

        // 3. Try to Sync
        this.pushQueue();
    },

    async deleteClient(id: string) {
        // 1. Mark as deleted or remove locally? 
        // If we remove locally, UI updates. 
        await db.clientes.delete(id);

        // 2. Add to Sync Queue
        await db.sync_queue.add({
            table: 'clientes',
            action: 'delete',
            data: { id },
            created_at: Date.now()
        });

        // 3. Try to Sync
        this.pushQueue();
    },

    async saveServiceOrder(os: Partial<LocalServiceOrder>) {
        const isNew = !os.id;
        const id = os.id || crypto.randomUUID();
        const now = new Date().toISOString();

        // Ensure status defaults if missing
        const status = os.status || 'PENDENTE';

        const osToSave: LocalServiceOrder = {
            ...os,
            id,
            status,
            synced: 0,
            created_at: os.created_at || now,
            updated_at: now
        } as LocalServiceOrder;

        await db.ordens_servico.put(osToSave);

        await db.sync_queue.add({
            table: 'ordens_servico',
            action: isNew ? 'create' : 'update',
            data: osToSave,
            created_at: Date.now()
        });

        this.pushQueue();
        return id;
    },

    async deleteServiceOrder(id: string) {
        await db.ordens_servico.delete(id);

        await db.sync_queue.add({
            table: 'ordens_servico',
            action: 'delete',
            data: { id },
            created_at: Date.now()
        });

        this.pushQueue();
    }
}

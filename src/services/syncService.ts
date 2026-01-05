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
                const localClients: LocalClient[] = clients.map(c => ({
                    ...c,
                    synced: 1,
                    updated_at: new Date().toISOString() // Local timestamp of sync
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
                    ...s,
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
                const localOss: LocalServiceOrder[] = oss.map(o => ({
                    ...o,
                    synced: 1,
                    action: undefined, // It's from server, no pending local action
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
        if (!navigator.onLine) return;

        // Get all items in queue
        const queueItems = await db.sync_queue.toArray();
        if (queueItems.length === 0) return;

        console.log(`🚀 Sync: Pushing ${queueItems.length} changes...`)

        for (const item of queueItems) {
            try {
                // Process based on table and action
                if (item.table === 'clientes') {
                    await this.processClientSync(item);
                } else if (item.table === 'ordens_servico') {
                    await this.processOSSync(item);
                }

                // If successful, remove from queue
                await db.sync_queue.delete(item.id!);

            } catch (error) {
                console.error(`❌ Failed to sync item ${item.id}:`, error);
                // Keep in queue to retry later? Or move to "DLQ" (Dead Letter Queue)?
                // For now, leave in queue.
            }
        }
        console.log('✅ Sync: Push complete.')
    },

    async processClientSync(item: SyncQueueItem) {
        const { data: payload, action } = item;
        // Clean payload of local-only fields
        const { id, synced, updated_at, ...cleanPayload } = payload;
        // Note: For 'create', we often generate a UUID locally. Supabase accepts client-provided UUIDs if configured.
        // If 'id' is a temporary ID (like 'local-'), we might need to let Supabase generate it and update local map.
        // For simplicity, we assume we use UUIDs generated locally (crypto.randomUUID) which collide rarely.

        if (action === 'create' || action === 'update') {
            // Upsert to be safe
            // Ensure ID is included
            const finalPayload = { id, ...cleanPayload };
            const { error } = await supabase.from('clientes').upsert(finalPayload);
            if (error) throw error;
        } else if (action === 'delete') {
            const { error } = await supabase.from('clientes').delete().eq('id', id);
            if (error) throw error;
        }
    },

    async processOSSync(item: SyncQueueItem) {
        const { data: payload, action } = item;
        const { id, synced, action: localAction, updated_at, ...cleanPayload } = payload;

        // Handle photos? 
        // Photos are URLs. If they are blob URLs (local), we need to upload them first.
        // That's complex. For MVP, let's assume photos upload immediately if online, 
        // or we need a separate PhotoQueue. 
        // For this step, let's assume text data only or that photos are handled separately.

        const finalPayload = { id, ...cleanPayload };

        if (action === 'create' || action === 'update') {
            const { error } = await supabase.from('ordens_servico').upsert(finalPayload);
            if (error) throw error;
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
        this.pushQueue();

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

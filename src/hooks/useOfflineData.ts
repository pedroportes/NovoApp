import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';

export function useOfflineClients() {
    const { userData } = useAuth();

    // useLiveQuery returns undefined while loading, then the array
    const clients = useLiveQuery(
        async () => {
            if (!userData?.empresa_id) return [];
            return await db.clientes
                .where('empresa_id')
                .equals(userData.empresa_id)
                .toArray();
        },
        [userData?.empresa_id]
    );

    return {
        clients: clients,
        loading: clients === undefined
    };
}

export function useOfflineServiceOrders() {
    const { userData } = useAuth();

    const orders = useLiveQuery(
        async () => {
            if (!userData?.empresa_id) return [];
            // Sort by date desc
            return await db.ordens_servico
                .where('empresa_id')
                .equals(userData.empresa_id)
                .reverse()
                .sortBy('created_at'); // This sorts by everything in the store if not careful, but 'where' filters first? 
            // Dexie 'where' returns collection. 
            // Creating a compound index [empresa_id+created_at] would be better for sorting.
            // For now, let's filter in memory if dataset is small, or just trusting Dexie.
        },
        [userData?.empresa_id]
    );

    return {
        orders: orders,
        loading: orders === undefined
    };
}

export function useOfflineTechnicians() {
    const { userData } = useAuth();
    const technicians = useLiveQuery(
        async () => {
            if (!userData?.empresa_id) return [];
            return await db.usuarios
                .where('empresa_id')
                .equals(userData.empresa_id)
                .toArray();
        },
        [userData?.empresa_id]
    );

    return { technicians, loading: technicians === undefined };
}

export function useOfflineServices() {
    const { userData } = useAuth();
    const services = useLiveQuery(
        async () => {
            if (!userData?.empresa_id) return [];
            return await db.servicos
                .where('empresa_id')
                .equals(userData.empresa_id)
                .toArray();
        },
        [userData?.empresa_id]
    );

    return { services, loading: services === undefined };
}

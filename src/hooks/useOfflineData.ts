import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalClient, LocalServiceOrder } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';

export function useOfflineClients() {
    const { userData } = useAuth();

    // useLiveQuery returns undefined while loading, then the array
    const clients = useLiveQuery(
        async () => {
            if (!userData?.empresa_id) return [];
            const list = await db.clientes
                .where('empresa_id')
                .equals(userData.empresa_id)
                .toArray();

            return list.sort((a, b) => {
                const getTime = (val: any) => {
                    if (!val) return 0;
                    const d = new Date(val).getTime();
                    return isNaN(d) ? 0 : d;
                };
                const tA = getTime(a.created_at || a.updated_at);
                const tB = getTime(b.created_at || b.updated_at);
                if (tB !== tA) return tB - tA;
                return (a.nome_razao || '').localeCompare(b.nome_razao || '');
            });
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
            const list = await db.ordens_servico
                .where('empresa_id')
                .equals(userData.empresa_id)
                .toArray();

            return list.sort((a: LocalServiceOrder, b: LocalServiceOrder) => {
                const getTime = (val: any) => {
                    if (!val) return 0;
                    const d = new Date(val).getTime();
                    return isNaN(d) ? 0 : d;
                };
                const tA = getTime(a.created_at || a.data_agendamento);
                const tB = getTime(b.created_at || b.data_agendamento);
                if (tB !== tA) return tB - tA;
                return b.id.localeCompare(a.id);
            });
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

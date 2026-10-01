import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalClient, LocalServiceOrder } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';

// Ordenação por data (mais recente primeiro). A data é convertida UMA vez por registro; antes
// o comparador chamava `new Date(...)` várias vezes por comparação (milhares de conversões a
// cada atualização da lista). A ordem resultante é a mesma de antes.
const paraTempo = (val: any): number => {
    if (!val) return 0;
    const d = new Date(val).getTime();
    return isNaN(d) ? 0 : d;
};
const colador = new Intl.Collator(); // equivale a a.localeCompare(b) com o idioma padrão

function ordenarPorTempo<T>(lista: T[], chave: (x: T) => number, desempate: (a: T, b: T) => number): T[] {
    const pares = lista.map(x => ({ x, t: chave(x) }));
    pares.sort((a, b) => (b.t !== a.t ? b.t - a.t : desempate(a.x, b.x)));
    return pares.map(p => p.x);
}

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

            // Mais recentemente criado sempre no topo
            return ordenarPorTempo(
                list,
                c => paraTempo(c.created_at) || paraTempo((c as any).criado_em) || paraTempo(c.updated_at),
                (a, b) => colador.compare(a.nome_razao || '', b.nome_razao || '')
            );
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

            // Prioriza created_at (data de abertura da OS) no topo, depois updated_at e agendamento
            return ordenarPorTempo(
                list,
                (o: LocalServiceOrder) => paraTempo(o.created_at) || paraTempo(o.updated_at) || paraTempo(o.data_agendamento),
                (a: LocalServiceOrder, b: LocalServiceOrder) => colador.compare(b.id, a.id)
            );
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

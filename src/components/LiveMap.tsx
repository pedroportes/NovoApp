import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import 'leaflet/dist/leaflet.css';
import { MapPin, User } from 'lucide-react';

interface TechnicianLocation {
    id: string;
    nome_completo: string;
    latitude: number;
    longitude: number;
    ultimo_update: string;
}

// Fix for default marker icons in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

export const LiveMap = () => {
    const { empresaId } = useAuth();
    const [technicians, setTechnicians] = useState<TechnicianLocation[]>([]);
    const [loading, setLoading] = useState(true);

    // Função para buscar técnicos ativos
    const fetchActiveTechnicians = async () => {
        if (!empresaId) {

            setLoading(false);
            return;
        }
        try {
            // Busca técnicos ativos nos últimos 30 minutos (mais flexível para debug)
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();


            const { data, error } = await supabase
                .from('usuarios')
                .select('id, nome_completo, latitude, longitude, ultimo_update')
                .eq('empresa_id', empresaId)
                .eq('cargo', 'tecnico')
                .gte('ultimo_update', thirtyMinutesAgo);

            if (error) {
                console.error('[LiveMap] Erro na query:', error);
                throw error;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const validTechs = (data || []).filter((t: any) => t.latitude && t.longitude).map((t: any) => ({
                id: t.id,
                nome_completo: t.nome_completo,
                latitude: t.latitude,
                longitude: t.longitude,
                ultimo_update: t.ultimo_update
            })) as TechnicianLocation[];


            setTechnicians(validTechs);
        } catch (err) {
            console.error('Erro ao buscar técnicos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveTechnicians();

        const channel = supabase
            .channel('usuarios-location-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'usuarios',
                    filter: `empresa_id=eq.${empresaId}`,
                },
                (payload: any) => {
                    const updated = payload.new;
                    // Check if loc exists and has coords
                    if (updated.cargo === 'tecnico' && updated.latitude && updated.longitude) {
                        setTechnicians((prev) => {
                            const index = prev.findIndex((t) => t.id === updated.id);
                            const newTech: TechnicianLocation = {
                                id: updated.id,
                                nome_completo: updated.nome_completo,
                                latitude: updated.latitude,
                                longitude: updated.longitude,
                                ultimo_update: updated.ultimo_update,
                            };

                            if (index >= 0) {
                                const newArr = [...prev];
                                newArr[index] = newTech;
                                return newArr;
                            }
                            return [...prev, newTech];
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [empresaId]);

    // Cleanup interval
    useEffect(() => {
        const interval = setInterval(() => {
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            setTechnicians((prev) => prev.filter((t) => new Date(t.ultimo_update).getTime() > fiveMinutesAgo));
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Centro padrão: Curitiba, Paraná
    const defaultCenter: [number, number] = [-25.4284, -49.2733];
    const mapCenter: [number, number] = technicians.length > 0
        ? [technicians[0].latitude, technicians[0].longitude]
        : defaultCenter;

    if (loading) return <div className="h-[500px] flex items-center justify-center bg-slate-100 rounded-lg">Carregando mapa...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Técnicos Online: {technicians.length}
                </h3>
            </div>

            <div className="h-[500px] w-full rounded-lg overflow-hidden relative z-0">
                <MapContainer
                    center={mapCenter}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {technicians.map((tech) => (
                        <Marker
                            key={tech.id}
                            position={[tech.latitude, tech.longitude]}
                        >
                            <Popup>
                                <div style={{ textAlign: 'center' }}>
                                    <strong>{tech.nome_completo}</strong><br />
                                    <small>{new Date(tech.ultimo_update).toLocaleTimeString()}</small>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

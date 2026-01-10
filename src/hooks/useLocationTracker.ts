import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LocationState {
    isTracking: boolean;
    error: string | null;
    permissionDenied: boolean;
}

export const useLocationTracker = () => {
    const { user } = useAuth();
    const [state, setState] = useState<LocationState>({
        isTracking: false,
        error: null,
        permissionDenied: false,
    });

    useEffect(() => {
        if (!user) return;

        let watchId: number | null = null;

        // Verifica se o navegador suporta geolocalização
        if (!navigator.geolocation) {
            setState(prev => ({
                ...prev,
                error: 'Geolocalização não é suportada pelo navegador',
            }));
            return;
        }

        // Opções para watchPosition
        const options: PositionOptions = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        };

        // Callback de sucesso
        const handleSuccess = async (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;

            try {
                // Atualiza a posição no Supabase
                const { error } = await supabase
                    .from('usuarios')
                    .update({
                        last_location: {
                            latitude,
                            longitude,
                            updated_at: new Date().toISOString()
                        }
                    })
                    .eq('id', user.id);

                if (error) {
                    console.error('Erro ao atualizar localização:', error);
                    setState(prev => ({
                        ...prev,
                        error: 'Erro ao salvar localização no servidor',
                    }));
                } else {
                    setState(prev => ({
                        ...prev,
                        isTracking: true,
                        error: null,
                    }));
                }
            } catch (err) {
                console.error('Erro ao enviar localização:', err);
                setState(prev => ({
                    ...prev,
                    error: 'Erro ao enviar localização',
                }));
            }
        };

        // Callback de erro
        const handleError = (error: GeolocationPositionError) => {
            console.error('Erro de geolocalização:', error);

            let errorMessage = 'Erro desconhecido ao obter localização';
            let permissionDenied = false;

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Permissão de localização negada. Ative nas configurações do navegador.';
                    permissionDenied = true;
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Localização não disponível no momento';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Timeout ao obter localização';
                    break;
            }

            setState(prev => ({
                ...prev,
                isTracking: false,
                error: errorMessage,
                permissionDenied,
            }));
        };

        // Inicia o rastreamento
        watchId = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            options
        );

        // Cleanup ao desmontar
        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [user]);

    return state;
};

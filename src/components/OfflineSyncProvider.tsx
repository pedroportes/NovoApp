import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SyncService } from '@/services/syncService';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
    const { userData } = useAuth();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success("Você está online novamente! Sincronizando...")
            triggerSync();
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.warning("Você está offline. Modo offline ativado.")
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Initial Sync on Mount (if user is logged in)
    useEffect(() => {
        if (userData?.empresa_id && isOnline) {
            triggerSync();
        }
    }, [userData, isOnline]);

    const triggerSync = async (userInitiated = false) => {
        if (!userData?.empresa_id || isSyncing) return;

        setIsSyncing(true);
        if (userInitiated) {
            toast.info("Sincronizando todas as ordens e clientes da nuvem...");
        }
        try {
            await SyncService.pushQueue(); // Push local changes first
            await SyncService.pullAllData(userData.empresa_id); // Then get latest updates
            if (userInitiated) {
                toast.success("Dados atualizados com sucesso!");
            }
        } catch (error: any) {
            console.error("Sync failed", error);
            if (userInitiated) {
                toast.error("Falha ao sincronizar: " + error.message);
            }
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <>
            {/* Visual Indicator & Button of Connection Status */}
            <button
                type="button"
                onClick={() => triggerSync(true)}
                title={isSyncing ? "Sincronizando dados..." : isOnline ? "Online (Clique para sincronizar com o banco)" : "Offline / Local"}
                className={`fixed bottom-[88px] left-[70px] md:bottom-6 md:right-6 z-[60] flex items-center justify-center w-8 h-8 rounded-full shadow-lg transition-all print:hidden cursor-pointer hover:scale-110 active:scale-95 ${isOnline
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white border-2 border-white'
                    }`}>
                {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                ) : isOnline ? (
                    <Wifi className="w-4 h-4" />
                ) : (
                    <WifiOff className="w-4 h-4" />
                )}
            </button>
            {children}
        </>
    );
}

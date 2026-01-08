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

    const triggerSync = async () => {
        if (!userData?.empresa_id || isSyncing) return;

        setIsSyncing(true);
        try {
            await SyncService.pushQueue(); // Push local changes first
            await SyncService.pullAllData(userData.empresa_id); // Then get latest updates
            // toast.success("Dados sincronizados com sucesso!") 
            // Optional: don't spam toast on every sync unless user triggered it
        } catch (error) {
            console.error("Sync failed", error);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <>
            {/* Visual Indicator of Connection Status */}
            <div
                title={isSyncing ? "Sincronizando..." : isOnline ? "Online" : "Offline / Local"}
                className={`fixed bottom-[88px] left-[70px] md:bottom-6 md:right-6 z-[60] flex items-center justify-center w-8 h-8 rounded-full shadow-lg transition-all ${isOnline
                    ? 'bg-emerald-500 text-white border-2 border-white'
                    : 'bg-amber-500 text-white border-2 border-white'
                    }`}>
                {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                ) : isOnline ? (
                    <Wifi className="w-4 h-4" />
                ) : (
                    <WifiOff className="w-4 h-4" />
                )}
            </div>
            {children}
        </>
    );
}

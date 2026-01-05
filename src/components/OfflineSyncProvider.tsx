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
            <div className={`fixed bottom-24 left-4 md:bottom-4 md:left-[300px] z-[60] flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg transition-all ${isOnline
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200'
                : 'bg-amber-500/10 text-amber-600 border border-amber-200'
                }`}>
                {isSyncing ? (
                    <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Sincronizando...
                    </>
                ) : isOnline ? (
                    <>
                        <Wifi className="w-3 h-3" />
                        Online
                    </>
                ) : (
                    <>
                        <WifiOff className="w-3 h-3" />
                        Modo Offline
                    </>
                )}
            </div>
            {children}
        </>
    );
}

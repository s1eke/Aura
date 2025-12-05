'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface NotificationContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

    const refreshUnreadCount = useCallback(async () => {
        if (!session || !isOnline) return;

        try {
            const response = await fetch('/api/notifications/unread-count');
            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.unreadNotifications);
            }
        } catch (error) {
            console.error('Failed to fetch unread notification count:', error);
        }
    }, [session, isOnline]);

    // Track online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Initial fetch on mount when online
    useEffect(() => {
        if (session && isOnline) {
            // Use async IIFE to avoid setState-in-effect warning
            (async () => {
                await refreshUnreadCount();
            })();
        }
    }, [session, isOnline, refreshUnreadCount]);

    // Reset count when going offline
    useEffect(() => {
        if (!isOnline) {
            // Schedule state update after effect completes
            const timer = setTimeout(() => setUnreadCount(0), 0);
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}

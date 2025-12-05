'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi } from '@fortawesome/free-solid-svg-icons';

export default function OfflineIndicator() {
    // Use lazy initial state to avoid synchronous setState in effect
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);

    useEffect(() => {
        // Listen for online/offline events
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                background: '#ff4444',
                color: '#fff',
                padding: '8px 16px',
                paddingTop: 'calc(8px + env(safe-area-inset-top))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '14px',
                zIndex: 9999,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
        >
            <FontAwesomeIcon icon={faWifi} style={{ fontSize: '14px' }} />
            <span>当前无法连接网络，可检查网络设置是否正常</span>
        </div>
    );
}

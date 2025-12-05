'use client';

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment, faUser, faCircle } from '@fortawesome/free-solid-svg-icons';
import { useCounts } from '@/hooks/useQueries';

export default function BottomNav() {
    const location = useLocation();
    const { data: counts } = useCounts(); // Use lightweight polling
    const unreadCount = counts?.unreadNotifications || 0;
    const pathname = location.pathname;
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);

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

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--bg-white)',
            borderTop: '0.5px solid var(--border-light)',
            display: 'flex',
            height: '50px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))',
            zIndex: 1000,
        }}>
            <Link
                to="/"
                replace
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    color: pathname === '/' ? 'var(--primary-pink)' : 'var(--text-tertiary)',
                    fontSize: '10px',
                    gap: '2px'
                }}
            >
                <div style={{ fontSize: '20px' }}>
                    <FontAwesomeIcon icon={faComment} />
                </div>
                <div>消息</div>
            </Link>

            <Link
                to="/moments"
                replace
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    color: pathname === '/moments' ? 'var(--primary-pink)' : 'var(--text-tertiary)',
                    fontSize: '10px',
                    gap: '2px',
                    position: 'relative'
                }}
            >
                <div style={{ fontSize: '20px', position: 'relative' }}>
                    <FontAwesomeIcon icon={faCircle} />
                    {isOnline && unreadCount > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-8px',
                            background: '#ff3b30',
                            color: 'white',
                            fontSize: '10px',
                            height: '16px',
                            minWidth: '16px',
                            padding: '0 4px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #fff'
                        }}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </div>
                    )}
                </div>
                <div>动态</div>
            </Link>

            <Link
                to="/me"
                replace
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    color: pathname === '/me' ? 'var(--primary-pink)' : 'var(--text-tertiary)',
                    fontSize: '10px',
                    gap: '2px'
                }}
            >
                <div style={{ fontSize: '20px' }}>
                    <FontAwesomeIcon icon={faUser} />
                </div>
                <div>我</div>
            </Link>
        </nav>
    );
}

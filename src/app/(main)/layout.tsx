'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { NotificationProvider } from '@/components/NotificationProvider';
import { queryClient } from '@/lib/query-client';

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();


    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--wechat-bg)'
            }}>
                <div className="wechat-loading" />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <NotificationProvider>
                {children}
            </NotificationProvider>
        </QueryClientProvider>
    );
}

'use client';

import dynamic from 'next/dynamic';

// Dynamically import AppRouter to avoid SSR issues with React Router
const AppRouter = dynamic(() => import('@/components/AppRouter'), {
    ssr: false,
});

export default function SPAEntry() {
    return <AppRouter />;
}

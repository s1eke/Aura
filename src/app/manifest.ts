import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Aura',
        short_name: 'Aura',
        description: 'Your Kind of Conversation',
        id: 'xyz.001208.nex.aura',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        orientation: 'portrait-primary',
        prefer_related_applications: false,
        screenshots: [
            {
                src: '/screenshots/chat-screen.png',
                sizes: '800x1734',
                type: 'image/png',
                form_factor: 'narrow', // 手机竖屏
                label: 'Chat interface with AI persona'
            },
            {
                src: '/screenshots/settings-screen.png',
                sizes: '800x1734',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Customizable chat settings'
            }
        ],
        icons: [
            {
                src: '/android-chrome-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/android-chrome-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/android-chrome-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/android-chrome-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/apple-touch-icon.png',
                sizes: '180x180',
                type: 'image/png',
            },
            {
                src: '/favicon-32x32.png',
                sizes: '32x32',
                type: 'image/png',
            },
            {
                src: '/favicon-16x16.png',
                sizes: '16x16',
                type: 'image/png',
            },
        ],
        categories: ['social', 'entertainment'],
        lang: 'zh-CN',
        dir: 'ltr',
    }
}

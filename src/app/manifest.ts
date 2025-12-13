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
                src: '/screenshots/messages-screen.png',
                sizes: '800x1734',
                type: 'image/png',
                form_factor: 'narrow',
                label: '消息列表'
            },
            {
                src: '/screenshots/chat-screen.png',
                sizes: '800x1734',
                type: 'image/png',
                form_factor: 'narrow',
                label: '聊天界面'
            },
            {
                src: '/screenshots/moments-screen.png',
                sizes: '800x1734',
                type: 'image/png',
                form_factor: 'narrow',
                label: '朋友圈'
            },
            {
                src: '/screenshots/personas-new-screen.png',
                sizes: '800x1734',
                type: 'image/png',
                form_factor: 'narrow',
                label: '创建角色'
            },
            {
                src: '/screenshots/settings-screen.png',
                sizes: '800x1734',
                type: 'image/png',
                form_factor: 'narrow',
                label: '设置页面'
            },
            {
                src: '/screenshots/settings-bubble-screen.png',
                sizes: '800x1734',
                type: 'image/png',
                form_factor: 'narrow',
                label: '气泡设置'
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

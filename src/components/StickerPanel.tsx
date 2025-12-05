import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faHeart, faFaceSmile } from '@fortawesome/free-solid-svg-icons';

interface StickerCategory {
    name: string;
    stickers: string[];
}

interface StickerPanelProps {
    onSelectSticker: (stickerUrl: string) => void;
    onClose?: () => void;
}

export default function StickerPanel({ onSelectSticker }: StickerPanelProps) {
    const [categories, setCategories] = useState<StickerCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('recent');
    const [recentStickers, setRecentStickers] = useState<string[]>([]);

    const loadCategories = useCallback(async () => {
        try {
            const res = await fetch('/api/stickers');
            const data = await res.json();
            setCategories(data.categories || []);
        } catch (error) {
            console.error('Failed to load stickers:', error);
        }
    }, []);

    const loadRecentStickers = useCallback(() => {
        const recent = localStorage.getItem('recentStickers');
        if (recent) {
            setRecentStickers(JSON.parse(recent));
        }
    }, []);

    useEffect(() => {
        // Wrap in async IIFE to avoid setState synchronously warning
        void (async () => {
            await loadCategories();
            loadRecentStickers();
        })();
    }, [loadCategories, loadRecentStickers]);

    const saveRecentSticker = (stickerUrl: string) => {
        const recent = [stickerUrl, ...recentStickers.filter(s => s !== stickerUrl)].slice(0, 20);
        setRecentStickers(recent);
        localStorage.setItem('recentStickers', JSON.stringify(recent));
    };

    const handleStickerClick = (stickerUrl: string) => {
        saveRecentSticker(stickerUrl);
        onSelectSticker(stickerUrl);
    };

    const getCategoryIcon = (name: string) => {
        switch (name.toLowerCase()) {
            case 'recent': return faClock;
            case 'favorite': return faHeart;
            default: return faFaceSmile;
        }
    };

    const getCurrentStickers = () => {
        if (activeCategory === 'recent') {
            return recentStickers;
        }
        const category = categories.find(c => c.name === activeCategory);
        return category?.stickers || [];
    };

    return (
        <div
            data-sticker-panel
            style={{
                background: 'var(--bg-warm)',
                borderTop: '1px solid var(--border-light)',
                height: '280px',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease-out',
                flexShrink: 0
            }}
        >
            <style jsx>{`
                @keyframes slideUp {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
            `}</style>

            {/* Category Tabs */}
            <div style={{
                display: 'flex',
                gap: '20px',
                padding: '0 16px',
                height: '36px',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-light)',
                background: 'white',
                overflowX: 'auto',
                flexShrink: 0
            }} className="hide-scrollbar">
                <div
                    onClick={() => setActiveCategory('recent')}
                    style={{
                        cursor: 'pointer',
                        fontSize: '20px',
                        opacity: activeCategory === 'recent' ? 1 : 0.5,
                        transition: 'opacity 0.2s'
                    }}
                >
                    <FontAwesomeIcon icon={faClock} />
                </div>
                {categories.map((category) => (
                    <div
                        key={category.name}
                        onClick={() => setActiveCategory(category.name)}
                        style={{
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: activeCategory === category.name ? 'var(--bg-warm)' : 'transparent',
                            opacity: activeCategory === category.name ? 1 : 0.6,
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <FontAwesomeIcon icon={getCategoryIcon(category.name)} />
                        {category.name}
                    </div>
                ))}
            </div>

            {/* Sticker Grid */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px'
            }} className="hide-scrollbar">
                {activeCategory === 'recent' && recentStickers.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        color: 'var(--text-tertiary)',
                        padding: '40px 20px'
                    }}>
                        最近使用<br />暂无表情包
                    </div>
                ) : getCurrentStickers().length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        color: 'var(--text-tertiary)',
                        padding: '40px 20px'
                    }}>
                        此分类暂无表情包
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '12px'
                    }}>
                        {getCurrentStickers().map((stickerUrl, index) => (
                            <div
                                key={index}
                                onClick={() => handleStickerClick(stickerUrl)}
                                style={{
                                    aspectRatio: '1',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    background: 'white',
                                    padding: '8px',
                                    transition: 'transform 0.2s',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <Image
                                    src={stickerUrl}
                                    alt="sticker"
                                    fill
                                    sizes="25vw"
                                    style={{ objectFit: 'contain' }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

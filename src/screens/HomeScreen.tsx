'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faRobot, faThumbtack } from '@fortawesome/free-solid-svg-icons';
import { getAvatarUrl } from '@/lib/avatar';
import { useSessions, useCounts } from '@/hooks/useQueries';

interface Message {
    id: string;
    content: string;
    role: string;
    createdAt: string;
}

interface Persona {
    id: string;
    name: string;
    avatar: string | null | undefined;
    greeting?: string;
}

interface ChatSession {
    id: string;
    persona: Persona;
    messages: Message[];
    updatedAt: string;
    isPinned: boolean;
}

export default function HomeScreen() {
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    const [showLoading, setShowLoading] = useState(false);

    // Use TanStack Query for sessions with automatic caching
    const { data: sessions = [], isLoading, error } = useSessions();

    // Use lightweight counts polling instead of full notifications
    useCounts();

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

    // Only show loading spinner if loading takes more than 1 second
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        let rafId: number | null = null;

        if (!isLoading) {
            // Use requestAnimationFrame to make setState asynchronous
            rafId = requestAnimationFrame(() => {
                setShowLoading(false);
            });
        } else {
            timer = setTimeout(() => {
                setShowLoading(true);
            }, 1000);
        }

        return () => {
            if (timer) clearTimeout(timer);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [isLoading]);

    const getLastMessage = (messages: Message[], session?: ChatSession) => {
        if (messages.length === 0) {
            return (session?.persona?.greeting) || '开始聊天';
        }
        const lastMsg = messages[messages.length - 1];
        return lastMsg.content;
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-warm)'
        }}>
            {/* 顶部导航栏 */}
            <div style={{
                background: 'var(--bg-white)',
                borderBottom: '0.5px solid var(--border-light)',
                padding: '10px 16px',
                paddingTop: 'calc(10px + env(safe-area-inset-top))',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <h1 style={{
                        fontSize: '17px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                    }}>
                        消息
                    </h1>
                    <button
                        onClick={() => navigate('/personas/new')}
                        style={{
                            fontSize: '20px',
                            color: 'var(--text-primary)',
                            border: 'none',
                            background: 'none',
                            padding: 0
                        }}
                    >
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                </div>
            </div>

            {/* Offline Indicator Banner - Between header and message list */}
            {!isOnline && (
                <div
                    style={{
                        background: '#ff4444',
                        color: '#fff',
                        padding: '6px 16px',
                        fontSize: '13px',
                        textAlign: 'center',
                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                    }}
                >
                    当前无法连接网络，可检查网络设置是否正常
                </div>
            )}

            {/* 聊天列表 */}
            <div style={{ flex: 1, overflow: 'auto' }} className="hide-scrollbar">
                {showLoading ? (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100px'
                    }}>
                        <div className="wechat-loading" />
                    </div>
                ) : error ? (
                    <div style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)'
                    }}>
                        <div style={{ fontSize: '15px', marginBottom: '8px' }}>加载失败</div>
                        <div style={{ fontSize: '13px' }}>请检查网络连接</div>
                    </div>
                ) : sessions.length === 0 ? (
                    <div style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                            <FontAwesomeIcon icon={faRobot} />
                        </div>
                        <div style={{ fontSize: '15px', marginBottom: '8px' }}>暂无聊天</div>
                        <div style={{ fontSize: '13px' }}>点击右上角创建第一个角色</div>
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div
                            key={session.id}
                            className="wechat-list-item"
                            onClick={() => navigate(`/chat/${session.id}`)}
                            style={{
                                cursor: 'pointer',
                                background: session.isPinned ? '#f7f7f7' : 'var(--bg-white)',
                                position: 'relative'
                            }}
                        >
                            <div className="wechat-avatar" style={{
                                marginRight: '12px',
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                <Image
                                    src={getAvatarUrl(session.persona.avatar, session.persona.id, 'persona')}
                                    alt={session.persona.name}
                                    fill
                                    sizes="48px"
                                    style={{ objectFit: 'cover' }}
                                    unoptimized
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    color: 'var(--text-primary)',
                                    marginBottom: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {session.persona.name}
                                    {session.isPinned && (
                                        <FontAwesomeIcon
                                            icon={faThumbtack}
                                            style={{ fontSize: '12px', color: '#888' }}
                                        />
                                    )}
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: 'var(--text-secondary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {getLastMessage(session.messages, session)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

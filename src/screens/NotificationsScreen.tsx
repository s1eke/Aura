'use client';

import { useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { getAvatarUrl } from '@/lib/avatar';
import { useNotification } from '@/components/NotificationProvider';
import { useNotifications, useMarkNotificationRead } from '@/hooks/useQueries';
import { queryKeys } from '@/lib/query-client';

interface Notification {
    id: string;
    type: string;
    content?: string;
    isRead: boolean;
    createdAt: string;
    sourceUser?: {
        id: string;
        username: string;
        avatar?: string;
    };
    sourcePersona?: {
        id: string;
        name: string;
        avatar?: string | null;
    };
    moment?: {
        id: string;
        content: string;
        images?: Array<{
            id: string;
            image: {
                filepath: string;
            };
        }>;
    };
}

export default function NotificationsScreen() {
    const navigate = useNavigate();
    const { refreshUnreadCount } = useNotification();
    const queryClient = useQueryClient();

    // Use TanStack Query for cached notifications
    const { data: notifications = [], isLoading: loading } = useNotifications();
    const markNotificationReadMutation = useMarkNotificationRead();

    // Track which notifications have been marked to avoid infinite loops
    const markedNotificationsRef = useRef<Set<string>>(new Set());

    const markAsRead = useCallback(async (notificationIds: string[]) => {
        try {
            // Optimistic update: immediately mark as read in the cache
            queryClient.setQueryData(queryKeys.notifications, (oldData: Notification[] | undefined) => {
                if (!oldData) return oldData;
                return oldData.map((notification: Notification) =>
                    notificationIds.includes(notification.id)
                        ? { ...notification, isRead: true }
                        : notification
                );
            });

            // Send API request in background
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds }),
            });

            // Refresh global unread count
            refreshUnreadCount();

            // Invalidate useCounts query to update notification badge immediately
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

            // Invalidate to ensure we have server data eventually
            if (notificationIds.length > 0) {
                markNotificationReadMutation.mutate(notificationIds[0]);
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
            // Revert optimistic update on error
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
        }
    }, [queryClient, refreshUnreadCount, markNotificationReadMutation]);

    // Automatically mark unread notifications as read when they load
    useEffect(() => {
        if (notifications.length > 0) {
            const unreadIds = notifications
                .filter((n) => !n.isRead && !markedNotificationsRef.current.has(n.id))
                .map((n) => n.id);

            if (unreadIds.length > 0) {
                // Add to marked set immediately to prevent duplicate calls
                unreadIds.forEach(id => markedNotificationsRef.current.add(id));

                // Mark as read in background
                markAsRead(unreadIds);
            }
        }
    }, [notifications, markAsRead]);



    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            markAsRead([notification.id]);
        }
        if (notification.moment) {
            // In React Router, navigate to moments
            navigate('/moments');
        }
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        border: 'none',
                        background: 'none',
                        fontSize: '18px',
                        color: 'var(--text-primary)',
                        padding: 0,
                        cursor: 'pointer',
                    }}
                >
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <h1 style={{
                    fontSize: '17px',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                }}>
                    通知
                </h1>
                <div style={{ width: '18px' }} />
            </div>

            {/* 通知列表 */}
            <div style={{ flex: 1, overflow: 'auto' }} className="hide-scrollbar">
                {loading ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'var(--text-tertiary)',
                    }}>
                        加载中...
                    </div>
                ) : notifications.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'var(--text-tertiary)',
                    }}>
                        暂无通知
                    </div>
                ) : (
                    notifications.map((notification) => {
                        const sourceName = notification.sourceUser?.username || notification.sourcePersona?.name || '未知用户';
                        const sourceAvatar = notification.sourceUser?.avatar || notification.sourcePersona?.avatar;
                        const sourceId = notification.sourceUser?.id || notification.sourcePersona?.id || 'unknown';

                        return (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                style={{
                                    background: notification.isRead ? 'var(--bg-white)' : '#f0f8ff',
                                    padding: '16px',
                                    borderBottom: '0.5px solid var(--border-light)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    gap: '12px',
                                }}
                            >
                                {/* Source Avatar */}
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    position: 'relative'
                                }}>
                                    <Image
                                        src={getAvatarUrl(sourceAvatar, sourceId, notification.sourcePersona ? 'persona' : 'user')}
                                        alt={sourceName}
                                        fill
                                        sizes="40px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    {/* Notification Content */}
                                    <div style={{
                                        fontSize: '15px',
                                        color: 'var(--text-primary)',
                                        marginBottom: '4px',
                                        lineHeight: '1.4',
                                    }}>
                                        <span style={{ fontWeight: '600', color: 'var(--primary-pink-dark)' }}>
                                            {sourceName}
                                        </span>
                                        {notification.type === 'LIKE' && ' 赞了你的动态'}
                                        {notification.type === 'COMMENT' && (
                                            <>
                                                {' 评论了：'}
                                                <span>{notification.content}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Moment Preview */}
                                    {notification.moment && (
                                        <div style={{
                                            fontSize: '14px',
                                            color: 'var(--text-secondary)',
                                            marginTop: '8px',
                                            display: 'flex',
                                            gap: '8px',
                                            alignItems: 'center',
                                        }}>
                                            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {notification.moment.content}
                                            </div>
                                            {notification.moment.images && notification.moment.images.length > 0 && (
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden',
                                                    position: 'relative',
                                                    flexShrink: 0
                                                }}>
                                                    <Image
                                                        src={notification.moment.images[0].image.filepath}
                                                        alt="Moment thumbnail"
                                                        fill
                                                        sizes="40px"
                                                        style={{ objectFit: 'cover' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Time */}
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--text-tertiary)',
                                        marginTop: '4px',
                                    }}>
                                        {new Date(notification.createdAt).toLocaleString('zh-CN')}
                                    </div>
                                </div>

                                {/* Unread Indicator */}
                                {!notification.isRead && (
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: '#ff3b30',
                                        flexShrink: 0,
                                        marginTop: '6px',
                                    }} />
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

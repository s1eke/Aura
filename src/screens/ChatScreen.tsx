'use client';

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import MessageList from '@/components/MessageList';
import MessageInput from '@/components/MessageInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { saveMessages } from '@/lib/indexedDB';
import { useSessionMessages } from '@/hooks/useQueries';
import StickerPanel from '@/components/StickerPanel';
import UploadPanel from '@/components/UploadPanel';
import { validateImageFile } from '@/lib/image-validator';
import { showWarning, showError, showImageConfirm } from '@/lib/modal';

interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    createdAt: string;
    imageUrl?: string;
    status?: 'sending' | 'sent' | 'error' | 'blocked';
}

export default function ChatScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: sessionData, isLoading, refetch } = useSessionMessages(id || '');

    // Extract data from query result
    const messages = sessionData?.messages || [];
    const session = sessionData?.session;
    const hasMoreMessages = sessionData?.hasMore || false;
    const nextCursor = sessionData?.nextCursor || null;
    const [sending, setSending] = useState(false);

    // Pagination state
    const [loadingMore, setLoadingMore] = useState(false);



    // Panel states
    const [showStickerPanel, setShowStickerPanel] = useState(false);
    const [showUploadPanel, setShowUploadPanel] = useState(false);

    // Online/offline state
    const [isOnline, setIsOnline] = useState(true);

    // Optimistic messages for immediate UI feedback
    const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);



    // Fix mobile viewport height to account for browser UI
    useEffect(() => {
        const setViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', setViewportHeight);

        return () => {
            window.removeEventListener('resize', setViewportHeight);
            window.removeEventListener('orientationchange', setViewportHeight);
        };
    }, []);

    useEffect(() => {
        // Add click-outside handler for emoji panel and upload menu
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Check if click is outside the input area and panels
            if (!target.closest('[data-message-input]') &&
                !target.closest('[data-sticker-panel]') &&
                !target.closest('[data-upload-panel]')) {
                setShowStickerPanel(false);
                setShowUploadPanel(false);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Track online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => {
            setIsOnline(false);
            // When going offline, refetch to load from cache
            refetch();
        };

        setIsOnline(navigator.onLine);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [refetch]);

    // Helper function to update query cache with new message
    const updateCacheWithMessage = (newMessage: Message) => {
        if (!id) return;

        queryClient.setQueryData(['messages', id], (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object') return oldData;
            const data = oldData as { messages?: Message[] };

            // Check if message already exists (avoid duplicates)
            const messageExists = data.messages?.some((m: Message) => m.id === newMessage.id);
            if (messageExists) return oldData;

            return {
                ...data,
                messages: [...(data.messages || []), newMessage]
            };
        });
    };

    const loadMoreMessages = async () => {
        if (loadingMore || !hasMoreMessages || !nextCursor || !id) {
            return;
        }

        setLoadingMore(true);
        try {
            const response = await fetch(`/api/sessions/${id}?cursor=${nextCursor}&limit=20`);
            if (!response.ok) throw new Error('Failed to load more messages');

            const data = await response.json();
            const olderMessages = data.session?.messages || [];

            if (olderMessages.length > 0) {
                const messagesWithSessionId = olderMessages.map((m: Message) => ({
                    ...m,
                    sessionId: id,
                    status: ('isBlocked' in m && m.isBlocked) ? 'blocked' : ('status' in m ? m.status : 'sent')
                }));

                // Save to IndexedDB
                await saveMessages(messagesWithSessionId);

                // Update query cache directly by prepending older messages
                queryClient.setQueryData(['messages', id], (oldData: unknown) => {
                    if (!oldData || typeof oldData !== 'object') return oldData;
                    const currentData = oldData as {
                        messages?: Message[];
                        session?: unknown;
                        hasMore?: boolean;
                        nextCursor?: string | null;
                    };

                    const updated = {
                        ...currentData,
                        messages: [...messagesWithSessionId, ...(currentData.messages || [])],
                        hasMore: data.hasMore,
                        nextCursor: data.nextCursor
                    };

                    return updated;
                });
            }
        } catch (error) {
            console.error('Failed to load more messages:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    // Helper function to handle API configuration errors
    const handleApiConfigError = () => {
        showWarning({
            title: 'API 配置',
            content: '请先在"我-偏好设置-API设置"中配置API Key'
        });
        setSending(false);
        setOptimisticMessages([]);
    };

    const sendMessage = async (content: string) => {
        if (!id) return;
        if (!isOnline) {
            showWarning({
                title: '网络错误',
                content: '当前无网络连接，无法发送消息'
            });
            return;
        }
        setSending(true);

        // Create optimistic message to show immediately
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`,
            content,
            role: 'user',
            createdAt: new Date().toISOString(),
            status: 'sending'
        };
        setOptimisticMessages([optimisticMsg]);

        try {
            const response = await fetch(`/api/sessions/${id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content }),
            });

            // Check for JSON response (blocked or other non-stream response)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();

                if (data.status === 'blocked') {
                    // Save to cache and refetch
                    await saveMessages([{ ...data.message, sessionId: id, status: 'blocked' }]);
                    refetch();
                    setSending(false);
                    return;
                }
            }

            if (!response.ok) {
                handleApiConfigError();
                return;
            }

            if (!response.body) {
                throw new Error('Response body is empty');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let userMessageReceived = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === 'message' && data.message) {
                                const realMessage = data.message;
                                // Save to IndexedDB
                                await saveMessages([{ ...realMessage, sessionId: id }]);

                                // Clear optimistic message when real user message arrives
                                if (!userMessageReceived && realMessage.role === 'user') {
                                    userMessageReceived = true;
                                    setOptimisticMessages([]);
                                }

                                // Update cache directly instead of refetching
                                updateCacheWithMessage(realMessage);
                            }
                        } catch {
                            // Ignore parsing errors
                        }
                    }
                }
            }

            // No need to refetch - cache already updated during stream
        } catch (error) {
            console.error('Failed to send message:', error);
            refetch();
        } finally {
            setSending(false);
        }
    };

    const handleSelectImage = async (file: File) => {
        // Validate image
        const validation = validateImageFile(file);
        if (!validation.valid) {
            showError({
                title: '图片验证失败',
                content: validation.error || '图片格式不支持'
            });
            return;
        }

        // Show confirmation modal with preview
        showImageConfirm({
            imageFile: file,
            onOk: () => handleSendImage(file),
            onCancel: () => { /* Modal closed, do nothing */ }
        });
    };

    const handleSendImage = async (file: File) => {
        if (!id) return;
        if (!isOnline) {
            showWarning({
                title: '网络错误',
                content: '当前无网络连接，无法发送图片'
            });
            return;
        }
        setSending(true);

        try {
            // Upload image
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) {
                const errorData = await uploadRes.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const { url: imageUrl, imageId } = await uploadRes.json();

            // Create optimistic message to show immediately
            const optimisticMsg: Message = {
                id: `temp - ${Date.now()} `,
                content: '',
                role: 'user',
                imageUrl,
                createdAt: new Date().toISOString(),
                status: 'sending'
            };
            setOptimisticMessages([optimisticMsg]);

            // Send message with image
            const response = await fetch(`/api/sessions/${id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: '',
                    imageUrl,
                    imageId
                }),
            });

            if (!response.ok) {
                handleApiConfigError();
                return;
            }

            // Handle SSE stream for AI response
            const reader = response.body?.getReader();
            if (!reader) return;

            const decoder = new TextDecoder();
            let userMessageReceived = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            // Check for error in stream
                            if (data.error) {
                                handleApiConfigError();
                                return; // Stop processing stream
                            }

                            if (data.type === 'message' && data.message) {
                                const realMessage = data.message;
                                await saveMessages([{ ...realMessage, sessionId: id }]);

                                // Clear optimistic message when real user message arrives
                                if (!userMessageReceived && realMessage.role === 'user') {
                                    userMessageReceived = true;
                                    setOptimisticMessages([]);
                                }

                                // Update cache directly instead of refetching
                                updateCacheWithMessage(realMessage);
                            }
                        } catch {
                            // Ignore parsing errors
                        }
                    }
                }
            }

            // No need to refetch - cache already updated during stream
        } catch (error) {
            console.error('Failed to send image:', error);
            showError({
                title: '发送失败',
                content: error instanceof Error ? error.message : '图片发送失败，请重试'
            });
            setOptimisticMessages([]);
            refetch();
        } finally {
            setSending(false);
        }
    };

    // Combined loading state: Only hide during actual data loading
    // Don't hide when list is ready but empty (offline mode)
    const showLoading = isLoading && !session;

    // Ensure we have at least a minimal session for offline mode
    const displaySession = session || {
        id: id || '',
        persona: { name: '离线模式' },
        user: {}
    };

    return (
        <>
            <div
                style={{
                    height: 'calc(var(--vh, 1vh) * 100)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    backgroundColor: 'var(--bg-secondary)',
                    opacity: showLoading ? 0 : 1, // Hide content until ready
                }}
            >
                {/* Background Layer */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 0,
                        pointerEvents: 'none',
                        // Default style
                        backgroundImage: displaySession?.bgImage ? `url(${displaySession.bgImage})` : 'none',
                        backgroundColor: '#f5f5f5', // 处理透明图片
                        ...(displaySession?.bgMode === 'stretch' ? {
                            backgroundSize: '100% 100%',
                            backgroundRepeat: 'no-repeat',
                        } : displaySession?.bgMode === 'tile' ? {
                            backgroundSize: 'auto',
                            backgroundRepeat: 'repeat',
                        } : displaySession?.bgMode === 'center' ? {
                            // ...
                            backgroundSize: 'auto',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                        } : displaySession?.bgMode === 'contain' ? {
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                        } : {
                            // cover (default)
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                        })
                    }}
                />

                {/* Content Layer - This stays normal */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* 顶部导航栏 */}
                    <div style={{
                        background: 'var(--bg-white)',
                        borderBottom: '0.5px solid var(--border-light)',
                        padding: '10px 12px',
                        paddingTop: 'calc(10px + env(safe-area-inset-top))',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                fontSize: '18px',
                                color: 'var(--text-primary)',
                                padding: '4px',
                                border: 'none',
                                background: 'none'
                            }}
                        >
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '17px',
                                fontWeight: '600',
                                color: 'var(--text-primary)'
                            }}>
                                {sending ? '对方正在输入...' : (displaySession.persona?.name || '未命名')}
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/chat/${id}/settings`)}
                            style={{
                                fontSize: '18px',
                                color: 'var(--text-primary)',
                                padding: '4px',
                                border: 'none',
                                background: 'none'
                            }}
                        >
                            <FontAwesomeIcon icon={faEllipsis} />
                        </button>
                    </div>

                    {/* 消息列表 */}
                    <MessageList
                        messages={[...messages, ...optimisticMessages]}
                        personaAvatar={displaySession?.persona?.avatar}
                        personaId={displaySession?.personaId}
                        userAvatar={displaySession?.user?.avatar}
                        myColors={{
                            background: displaySession?.user?.myBubbleBackground || '#95ec69',
                            border: displaySession?.user?.myBubbleBorder || 'transparent',
                            text: displaySession?.user?.myBubbleText || '#000000'
                        }}
                        otherColors={{
                            background: displaySession?.user?.otherBubbleBackground || '#ffffff',
                            border: displaySession?.user?.otherBubbleBorder || '#e5e5e5',
                            text: displaySession?.user?.otherBubbleText || '#000000'
                        }}
                        onLoadMore={loadMoreMessages}
                        hasMore={hasMoreMessages}
                        loadingMore={loadingMore}
                    />

                    {/* 输入框 */}
                    <MessageInput
                        onSend={sendMessage}
                        disabled={!isOnline}
                        onToggleStickerPanel={() => {
                            setShowStickerPanel(!showStickerPanel);
                            setShowUploadPanel(false);
                        }}
                        onToggleUploadPanel={() => {
                            setShowUploadPanel(!showUploadPanel);
                            setShowStickerPanel(false);
                        }}
                        showStickerPanel={showStickerPanel}
                        showUploadPanel={showUploadPanel}
                    />

                    {/* Sticker Panel */}
                    {showStickerPanel && (
                        <StickerPanel
                            onSelectSticker={(stickerUrl) => {
                                // TODO: Send sticker as message
                                console.log('Selected sticker:', stickerUrl);
                                setShowStickerPanel(false);
                            }}
                            onClose={() => setShowStickerPanel(false)}
                        />
                    )}

                    {/* Upload Panel */}
                    {showUploadPanel && (
                        <UploadPanel
                            onClose={() => setShowUploadPanel(false)}
                            onSelectImage={handleSelectImage}
                        />
                    )}
                </div>


            </div >
        </>
    );
}

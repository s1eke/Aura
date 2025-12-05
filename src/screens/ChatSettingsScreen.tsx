'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import BackgroundEditor from '@/components/BackgroundEditor';
import { showConfirm, showError } from '@/lib/modal';
import { getAvatarUrl } from '@/lib/avatar';

interface SessionData {
    id?: string;
    personaId?: string;
    isPinned?: boolean;
    isBlacklisted?: boolean;
    allowActionDescription?: boolean;
    bgImage?: string;
    bgMode?: string;
    persona?: {
        id: string;
        name: string;
        avatar?: string;
        gender?: string;
    };
    user?: {
        avatar?: string;
        myBubbleBackground?: string;
        myBubbleText?: string;
        otherBubbleBackground?: string;
        otherBubbleText?: string;
    };
}

interface MessagesQueryData {
    messages: unknown[];
    hasMore?: boolean;
    nextCursor?: string | null;
    session?: SessionData;
}


import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

export default function ChatSettingsScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [session, setSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClearHistory = async () => {
        try {
            const res = await fetch(`/api/sessions/${id}/messages`, {
                method: 'DELETE',
            });
            if (res.ok) {
                // Clear local cache
                const { clearSessionMessages } = await import('@/lib/indexedDB');
                if (id) await clearSessionMessages(id);

                // Invalidate queries
                if (id) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
                    queryClient.invalidateQueries({ queryKey: queryKeys.session(id) });
                }
                queryClient.invalidateQueries({ queryKey: queryKeys.sessions });

                // Reload page or navigate home
                navigate('/', { replace: true });
            } else {
                throw new Error('清除失败');
            }
        } catch (error) {
            console.error('Clear history error:', error);
            showError({
                title: '清除失败',
                content: '请重试'
            });
        }
    };

    const fetchSession = useCallback(async () => {
        if (!id) return;
        try {
            const res = await fetch(`/api/sessions/${id}`);
            if (res.ok) {
                const data = await res.json();
                setSession(data.session);
            }
        } catch (error) {
            console.error('Fetch session error:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    const updateSetting = async (field: string, value: unknown) => {
        try {
            const res = await fetch(`/api/sessions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value }),
            });

            if (res.ok) {
                setSession({ ...session, [field]: value });
                // Invalidate caches to update other screens
                if (id) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.session(id) });
                    // If pinning changes, we need to update the sessions list order
                    if (field === 'isPinned') {
                        queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
                    }
                }
            }
        } catch (error) {
            console.error('Update setting error:', error);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('上传失败');

            const { url } = await response.json();
            setUploadedImageUrl(url);
            setShowEditor(true);
        } catch (error) {
            console.error('Upload error:', error);
            showError({
                title: '上传失败',
                content: '图片上传失败，请重试'
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleEditorSave = async (params: { imageUrl: string; bgMode: string }) => {
        try {
            const res = await fetch(`/api/sessions/${id}/background`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: params.imageUrl,
                    bgMode: params.bgMode,
                }),
            });

            if (!res.ok) throw new Error('保存失败');

            const data = await res.json();
            setSession({
                ...session,
                bgImage: data.bgImage,
                bgMode: data.bgMode,
            } as SessionData);
            setShowEditor(false);
            setUploadedImageUrl('');

            // Invalidate queries to ensure ChatScreen updates immediately
            if (id) {
                // Optimistically update the cache for immediate feedback
                // We need to update the 'messages' query because that's what ChatScreen uses
                queryClient.setQueryData(queryKeys.messages(id), (oldData: MessagesQueryData | undefined) => {
                    if (!oldData || !oldData.session) return oldData;
                    return {
                        ...oldData,
                        session: {
                            ...oldData.session,
                            bgImage: data.bgImage,
                            bgMode: data.bgMode
                        }
                    };
                });

                // Also update the session query if it exists
                queryClient.setQueryData(queryKeys.session(id), (oldData: SessionData | undefined) => {
                    if (!oldData) return oldData;
                    return {
                        ...oldData,
                        bgImage: data.bgImage,
                        bgMode: data.bgMode
                    };
                });

                // Important: invalidate messages query because that's what ChatScreen uses to get session data (including background)
                queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
                queryClient.invalidateQueries({ queryKey: queryKeys.session(id) });
                queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
            }

        } catch (error) {
            console.error('Save error:', error);
            showError({
                title: '保存失败',
                content: '保存失败，请重试'
            });
        }
    };

    const handleEditorCancel = () => {
        setShowEditor(false);
        setUploadedImageUrl('');
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#999' }}>加载中...</div>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
            {/* Hide settings content when BackgroundEditor is open */}
            {!showEditor && (
                <>
                    {/* Header */}
                    <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5' }}>
                        <div style={{
                            padding: '12px 16px',
                            paddingTop: 'calc(12px + env(safe-area-inset-top))',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <button
                                onClick={() => navigate(-1)}
                                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#576b95' }}
                            >
                                <FontAwesomeIcon icon={faChevronLeft} size="lg" />
                            </button>
                            <h1 style={{ fontSize: '17px', fontWeight: '500', color: '#000', margin: 0 }}>聊天设置</h1>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '16px',
                        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                        WebkitOverflowScrolling: 'touch'
                    }} className="hide-scrollbar">
                        {/* Persona Card */}
                        <div style={{
                            background: '#fff',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                <Image
                                    src={getAvatarUrl(session?.persona?.avatar, session?.personaId || 'unknown', 'persona')}
                                    alt={session?.persona?.name || '角色头像'}
                                    fill
                                    sizes="56px"
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '17px', fontWeight: '500', color: '#000', marginBottom: '2px' }}>
                                    {session?.persona?.name || '未命名'}
                                </div>
                            </div>
                            <div style={{ fontSize: '20px', color: '#576b95' }}>
                                {session?.persona?.gender === 'male' ? '♂' : session?.persona?.gender === 'female' ? '♀' : ''}
                            </div>
                        </div>

                        {/* Basic Settings */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '14px', color: '#999', padding: '0 8px 8px 8px' }}>基本设置</div>
                            <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <button
                                    onClick={() => navigate(`/personas/${session?.personaId}/edit`)}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: '1px solid #f0f0f0',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f8f8'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    <span style={{ fontSize: '16px', color: '#000' }}>Ta的人设</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '14px', color: '#999' }}>编辑角色性格和身份</span>
                                        <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '14px', color: '#c7c7c7' }} />
                                    </div>
                                </button>

                                <button
                                    onClick={() => navigate(`/chat/${id}/memory`)}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: '1px solid #f0f0f0',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f8f8'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    <span style={{ fontSize: '16px', color: '#000' }}>Ta的记忆</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '14px', color: '#999' }}>记住重要的对话内容</span>
                                        <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '14px', color: '#c7c7c7' }} />
                                    </div>
                                </button>

                                <button
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: '1px solid #f0f0f0',
                                        cursor: 'not-allowed',
                                        opacity: 0.5
                                    }}
                                >
                                    <span style={{ fontSize: '16px', color: '#000' }}>Ta的音色</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '14px', color: '#999' }}>自定义角色音</span>
                                        <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '14px', color: '#c7c7c7' }} />
                                    </div>
                                </button>

                                <button
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'not-allowed',
                                        opacity: 0.5
                                    }}
                                >
                                    <span style={{ fontSize: '16px', color: '#000' }}>我的人设</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '14px', color: '#999' }}>编辑</span>
                                        <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '14px', color: '#c7c7c7' }} />
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Conversation Settings */}
                        <div>
                            <div style={{ fontSize: '14px', color: '#999', padding: '0 8px 8px 8px' }}>对话设置</div>
                            <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                {/* Pin Toggle */}
                                <div style={{
                                    padding: '14px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <span style={{ fontSize: '16px', color: '#000' }}>置顶聊天</span>
                                    <button
                                        onClick={() => updateSetting('isPinned', !session?.isPinned)}
                                        style={{
                                            position: 'relative',
                                            width: '48px',
                                            height: '28px',
                                            borderRadius: '14px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'background 0.3s',
                                            background: session?.isPinned ? '#07c160' : '#e5e5e5',
                                            padding: 0
                                        }}
                                    >
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '2px',
                                                left: session?.isPinned ? '22px' : '2px',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: '#fff',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                transition: 'left 0.3s'
                                            }}
                                        />
                                    </button>
                                </div>

                                {/* Blacklist Toggle */}
                                <div style={{
                                    padding: '14px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <span style={{ fontSize: '16px', color: '#000' }}>加入黑名单</span>
                                    <button
                                        onClick={() => updateSetting('isBlacklisted', !session?.isBlacklisted)}
                                        style={{
                                            position: 'relative',
                                            width: '48px',
                                            height: '28px',
                                            borderRadius: '14px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'background 0.3s',
                                            background: session?.isBlacklisted ? '#07c160' : '#e5e5e5',
                                            padding: 0
                                        }}
                                    >
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '2px',
                                                left: session?.isBlacklisted ? '22px' : '2px',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: '#fff',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                transition: 'left 0.3s'
                                            }}
                                        />
                                    </button>
                                </div>

                                {/* Allow Action Description Toggle */}
                                <div style={{
                                    padding: '14px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <div style={{ flex: 1, paddingRight: '12px' }}>
                                        <div style={{ fontSize: '16px', color: '#000', marginBottom: '2px' }}>允许动作描述</div>
                                        <div style={{ fontSize: '13px', color: '#999' }}>关闭后，角色回复中将不会使用动作或神态描写</div>
                                    </div>
                                    <button
                                        onClick={() => updateSetting('allowActionDescription', !session?.allowActionDescription)}
                                        style={{
                                            position: 'relative',
                                            width: '48px',
                                            height: '28px',
                                            borderRadius: '14px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'background 0.3s',
                                            background: session?.allowActionDescription ? '#07c160' : '#e5e5e5',
                                            padding: 0
                                        }}
                                    >
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '2px',
                                                left: session?.allowActionDescription ? '22px' : '2px',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: '#fff',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                transition: 'left 0.3s'
                                            }}
                                        />
                                    </button>
                                </div>

                                {/* Background */}
                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'none',
                                        border: 'none',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        opacity: uploading ? 0.6 : 1,
                                    }}
                                    onMouseEnter={(e) => !uploading && (e.currentTarget.style.background = '#f8f8f8')}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    <span style={{ fontSize: '16px', color: '#000' }}>聊天背景</span>
                                    <span style={{ fontSize: '14px', color: '#999' }}>
                                        {uploading ? '上传中...' : '点击上传'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div style={{ marginTop: '24px' }}>
                            <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <button
                                    onClick={() => {
                                        showConfirm({
                                            title: '清除聊天记录',
                                            content: '确定要清除所有聊天记录吗？此操作不可恢复。',
                                            onOk: handleClearHistory,
                                            okText: '清除',
                                            cancelText: '取消',
                                            danger: true
                                        });
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f8f8'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    <span style={{ fontSize: '16px', color: '#ff4d4f', fontWeight: '500' }}>清除聊天记录</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}



            {/* Background Editor Modal */}
            {showEditor && uploadedImageUrl && (
                <BackgroundEditor
                    imageUrl={uploadedImageUrl}
                    userAvatar={session?.user?.avatar || undefined}
                    personaAvatar={session?.persona?.avatar || undefined}
                    initialMode={session?.bgMode || 'cover'}
                    // 传递气泡颜色
                    myBubble={{
                        background: session?.user?.myBubbleBackground || '#95ec69',
                        text: session?.user?.myBubbleText || '#000000'
                    }}
                    personaBubble={{
                        background: session?.user?.otherBubbleBackground || '#ffffff',
                        text: session?.user?.otherBubbleText || '#000000'
                    }}
                    onSave={handleEditorSave}
                    onCancel={handleEditorCancel}
                />
            )}
        </div>
    );
}

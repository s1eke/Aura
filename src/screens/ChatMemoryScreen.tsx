'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { showAlert } from '@/lib/modal';
import { getAvatarUrl } from '@/lib/avatar';

interface Memory {
    id: string;
    content: string;
    messageCount: number;
    createdAt: string;
}

interface Session {
    persona?: {
        name: string;
        avatar?: string;
    };
    personaId?: string;
}

export default function ChatMemoryScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<Session | null>(null);
    const [memories, setMemories] = useState<Memory[]>([]);
    const [editedContent, setEditedContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [sessionRes, memoriesRes] = await Promise.all([
                fetch(`/api/sessions/${id}`),
                fetch(`/api/sessions/${id}/memories`),
            ]);

            if (sessionRes.ok) {
                const data = await sessionRes.json();
                setSession(data.session);
            }

            if (memoriesRes.ok) {
                const data = await memoriesRes.json();
                setMemories(data.memories);
                // Combine all memories for editing
                if (data.memories.length > 0) {
                    setEditedContent(data.memories.map((m: Memory) => m.content).join('\n\n'));
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchData();
    }, [id, fetchData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const trimmedContent = editedContent.trim();

            if (trimmedContent === '') {
                // User deleted all content - delete all memories
                console.log('Deleting all memories...');
                const deletePromises = memories.map(m =>
                    fetch(`/api/sessions/${id}/memories/${m.id}`, {
                        method: 'DELETE'
                    })
                );

                const results = await Promise.all(deletePromises);

                // Check if all deletions succeeded
                const allSucceeded = results.every(res => res.ok);
                if (!allSucceeded) {
                    throw new Error('Failed to delete some memories');
                }

                // Update local state
                setMemories([]);
                setEditedContent('');

            } else if (memories.length > 0) {
                // Update first memory with all content
                console.log('Updating first memory and deleting extras...');
                const updateRes = await fetch(`/api/sessions/${id}/memories/${memories[0].id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: trimmedContent })
                });

                if (!updateRes.ok) {
                    throw new Error('Failed to update memory');
                }

                // Delete any additional memories (consolidate to one)
                if (memories.length > 1) {
                    const deletePromises = memories.slice(1).map(m =>
                        fetch(`/api/sessions/${id}/memories/${m.id}`, {
                            method: 'DELETE'
                        })
                    );

                    const results = await Promise.all(deletePromises);
                    const allSucceeded = results.every(res => res.ok);
                    if (!allSucceeded) {
                        throw new Error('Failed to delete extra memories');
                    }
                }
            }

            navigate(-1);
        } catch (error) {
            console.error('Save error:', error);
            showAlert({
                title: '保存失败',
                content: '请重试'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSummarizeNow = async () => {
        setIsSummarizing(true);
        try {
            const res = await fetch(`/api/sessions/${id}/memories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageCount: 30 })
            });

            if (res.ok) {
                // Reload memories to show updated content
                await fetchData();
                showAlert({
                    title: '总结成功',
                    content: '记忆已更新'
                });
            } else {
                showAlert({
                    title: '总结失败',
                    content: '请重试'
                });
            }
        } catch (error) {
            console.error('Summarize error:', error);
            showAlert({
                title: '总结失败',
                content: '请重试'
            });
        } finally {
            setIsSummarizing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#999' }}>加载中...</div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100%', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
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
                    <h1 style={{ fontSize: '17px', fontWeight: '500', color: '#000', margin: 0 }}>
                        {session?.persona?.name}的记忆
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
                <div style={{ width: '100%', maxWidth: '480px' }}>
                    {/* Avatar */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                        <div style={{
                            width: '96px',
                            height: '96px',
                            borderRadius: '48px',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <Image
                                src={getAvatarUrl(session?.persona?.avatar, (session?.personaId ?? id) ?? 'unknown', 'persona')}
                                alt={session?.persona?.name ?? 'Avatar'}
                                fill
                                sizes="96px"
                                style={{ objectFit: 'cover' }}
                            />
                        </div>
                    </div>

                    {/* Content Card */}
                    <div style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        minHeight: '180px'
                    }}>
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            placeholder="还没有记忆内容，开始聊天后角色会自动记录..."
                            style={{
                                width: '100%',
                                minHeight: '160px',
                                border: 'none',
                                outline: 'none',
                                fontSize: '15px',
                                lineHeight: '1.6',
                                color: '#333',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                background: 'transparent'
                            }}
                        />
                    </div>

                    {/* Help Text */}
                    <p style={{
                        textAlign: 'center',
                        fontSize: '13px',
                        color: '#999',
                        lineHeight: '1.5',
                        margin: '0 0 24px 0',
                        padding: '0 16px'
                    }}>
                        角色每对话30条消息会自动总结记忆，你也可以手动添加或修改
                    </p>

                    {/* Summarize Now Button */}
                    <button
                        onClick={handleSummarizeNow}
                        disabled={isSummarizing}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: isSummarizing
                                ? 'linear-gradient(135deg, #d0d0d0 0%, #e0e0e0 100%)'
                                : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                            border: 'none',
                            borderRadius: '24px',
                            fontSize: '16px',
                            fontWeight: '500',
                            color: '#fff',
                            cursor: isSummarizing ? 'not-allowed' : 'pointer',
                            boxShadow: isSummarizing
                                ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                                : '0 4px 12px rgba(168, 237, 234, 0.3)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            marginBottom: '12px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            if (!isSummarizing) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(168, 237, 234, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isSummarizing) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 237, 234, 0.3)';
                            }
                        }}
                    >
                        {isSummarizing && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                height: '100%',
                                width: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                animation: 'shimmer 1.5s infinite'
                            }} />
                        )}
                        <style jsx>{`
                            @keyframes shimmer {
                                0% { transform: translateX(-100%); }
                                100% { transform: translateX(100%); }
                            }
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                        <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            {isSummarizing && (
                                <span style={{
                                    display: 'inline-block',
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid #fff',
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                            )}
                            {isSummarizing ? '总结中...' : '立即总结'}
                        </span>
                    </button>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #ffc1e3 0%, #ffb3d9 100%)',
                            border: 'none',
                            borderRadius: '24px',
                            fontSize: '16px',
                            fontWeight: '500',
                            color: '#fff',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(255, 179, 217, 0.3)',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 179, 217, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 179, 217, 0.3)';
                        }}
                    >
                        {isSaving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );
}

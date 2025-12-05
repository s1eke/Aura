'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faPlus, faHeart, faComment, faTrash, faImage, faTimes } from '@fortawesome/free-solid-svg-icons';
import { getAvatarUrl } from '@/lib/avatar';
import ImageLightbox from '@/components/ImageLightbox';
import { useMoments, useCounts } from '@/hooks/useQueries';
import Image from 'next/image';
import { logger } from '@/lib/logger';



export default function MomentsScreen() {
    const navigate = useNavigate();
    const { data: session } = useSession();

    // Use TanStack Query for cached moments and notifications
    const { data: moments = [], refetch: refetchMoments } = useMoments();
    const { data: counts, isLoading: countsLoading, dataUpdatedAt } = useCounts(); // Use counts for badge display
    const unreadCount = counts?.unreadNotifications || 0;

    // Debug
    logger.debug('[MomentsScreen] counts:', counts, 'unreadCount:', unreadCount, 'loading:', countsLoading, 'updatedAt:', new Date(dataUpdatedAt));

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newMomentContent, setNewMomentContent] = useState('');
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [showLightbox, setShowLightbox] = useState(false);

    // Memoize blob URLs to prevent regeneration on every render
    const imagePreviewUrls = useMemo(() => {
        return selectedImages.map(file => URL.createObjectURL(file));
    }, [selectedImages]);

    // Cleanup blob URLs when images change or component unmounts
    useEffect(() => {
        return () => {
            imagePreviewUrls.forEach((url: string) => URL.revokeObjectURL(url));
        };
    }, [imagePreviewUrls]);

    const openLightbox = (images: string[], index: number) => {
        setLightboxImages(images);
        setLightboxIndex(index);
        setShowLightbox(true);
    };

    const closeLightbox = () => {
        setShowLightbox(false);
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setSelectedImages(prev => [...prev, ...files]);
    };

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    const createMoment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMomentContent.trim() && selectedImages.length === 0) return;

        setLoading(true);
        try {
            // Upload images first
            const imageIds: string[] = [];
            for (const file of selectedImages) {
                const formData = new FormData();
                formData.append('file', file);

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                const uploadData = await uploadResponse.json();
                if (uploadData.imageId) {
                    imageIds.push(uploadData.imageId);
                }
            }

            // Create moment
            const response = await fetch('/api/moments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newMomentContent,
                    imageIds,
                }),
            });

            if (response.ok) {
                setNewMomentContent('');
                setSelectedImages([]);
                setShowCreateForm(false);
                await refetchMoments();
            }
        } catch (error) {
            logger.error('Failed to create moment:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleLike = async (momentId: string) => {
        try {
            const response = await fetch(`/api/moments/${momentId}/like`, {
                method: 'POST',
            });

            if (response.ok) {
                await refetchMoments();
            }
        } catch (error) {
            logger.error('Failed to toggle like:', error);
        }
    };

    const addComment = async (momentId: string) => {
        const content = commentInputs[momentId];
        if (!content?.trim()) return;

        try {
            const response = await fetch(`/api/moments/${momentId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                setCommentInputs(prev => ({ ...prev, [momentId]: '' }));
                await refetchMoments();
            }
        } catch (error) {
            logger.error('Failed to add comment:', error);
        }
    };

    const deleteMoment = async (momentId: string) => {
        if (!confirm('确定要删除这条动态吗？')) return;

        try {
            const response = await fetch(`/api/moments/${momentId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await refetchMoments();
            }
        } catch (error) {
            logger.error('Failed to delete moment:', error);
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
                <h1 style={{
                    fontSize: '17px',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                }}>
                    动态
                </h1>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/moments/notifications')}
                        style={{ fontSize: '20px', color: 'var(--text-primary)', border: 'none', background: 'none', padding: 0, position: 'relative', cursor: 'pointer' }}
                    >
                        <FontAwesomeIcon icon={faBell} />
                        {unreadCount > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-10px',
                                background: '#ff3b30',
                                color: 'white',
                                borderRadius: '10px',
                                minWidth: '18px',
                                height: '18px',
                                fontSize: '11px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                            }}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </div>
                        )}
                    </button>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        style={{ fontSize: '20px', color: 'var(--text-primary)', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                    >
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                </div>
            </div>

            {/* 创建动态表单 */}
            {showCreateForm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px',
                }}>
                    <div style={{
                        background: 'var(--bg-white)',
                        borderRadius: '12px',
                        padding: '20px',
                        maxWidth: '500px',
                        width: '100%',
                        maxHeight: '80vh',
                        overflow: 'auto',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>发布动态</h2>
                            <button
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setNewMomentContent('');
                                    setSelectedImages([]);
                                }}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <form onSubmit={createMoment}>
                            <textarea
                                value={newMomentContent}
                                onChange={(e) => setNewMomentContent(e.target.value)}
                                placeholder="分享你的想法..."
                                style={{
                                    width: '100%',
                                    minHeight: '120px',
                                    padding: '12px',
                                    fontSize: '15px',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '8px',
                                    resize: 'vertical',
                                    marginBottom: '16px',
                                }}
                            />

                            {/* Image preview */}
                            {selectedImages.length > 0 && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '8px',
                                    marginBottom: '16px',
                                }}>
                                    {selectedImages.map((file, index) => (
                                        <div key={index} style={{ position: 'relative' }}>
                                            <Image
                                                src={imagePreviewUrls[index]}
                                                alt="Preview"
                                                width={200}
                                                height={200}
                                                style={{
                                                    width: '100%',
                                                    height: 'auto',
                                                    aspectRatio: '1',
                                                    objectFit: 'cover',
                                                    borderRadius: '8px',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    background: 'rgba(0, 0, 0, 0.6)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '24px',
                                                    height: '24px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faTimes} size="xs" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <label style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                }}>
                                    <FontAwesomeIcon icon={faImage} style={{ marginRight: '8px' }} />
                                    选择图片
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageSelect}
                                        style={{ display: 'none' }}
                                    />
                                </label>

                                <button
                                    type="submit"
                                    disabled={loading || (!newMomentContent.trim() && selectedImages.length === 0)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: (loading || (!newMomentContent.trim() && selectedImages.length === 0)) ? '#e5e5e5' : 'var(--primary-pink)',
                                        color: (loading || (!newMomentContent.trim() && selectedImages.length === 0)) ? '#999' : 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '500',
                                        cursor: (loading || (!newMomentContent.trim() && selectedImages.length === 0)) ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {loading ? '发布中...' : '发布'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 动态列表 */}
            <div style={{ flex: 1, overflow: 'auto' }} className="hide-scrollbar">
                {moments.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'var(--text-tertiary)',
                    }}>
                        还没有动态，快来发布第一条吧！
                    </div>
                ) : (
                    moments.map((moment) => {
                        const userLiked = moment.likes.some(like => like.user?.username === session?.user?.name);

                        return (
                            <div key={moment.id} style={{
                                background: 'var(--bg-white)',
                                padding: '16px',
                                marginBottom: '8px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {/* User Avatar */}
                                        <Image
                                            src={getAvatarUrl(moment.user?.avatar, moment.user?.email || moment.user?.username, 'user')}
                                            alt={moment.user?.username}
                                            width={40}
                                            height={40}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '8px',
                                                objectFit: 'cover',
                                            }}
                                        />
                                        <div>
                                            <div style={{
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                color: 'var(--primary-pink-dark)',
                                                marginBottom: '4px'
                                            }}>
                                                {moment.user?.username || session?.user?.name || '我'}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                {new Date(moment.createdAt).toLocaleString('zh-CN')}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteMoment(moment.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-tertiary)',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>

                                <div style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                                    {moment.content}
                                </div>

                                {/* Images */}
                                {moment.images.length > 0 && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: moment.images.length === 1 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                                        gap: '8px',
                                        marginBottom: '12px',
                                        maxWidth: moment.images.length === 1 ? '50%' : '100%',
                                    }}>
                                        {moment.images.map((img, index) => (
                                            <Image
                                                key={img.id}
                                                src={img.image.filepath}
                                                alt={img.image.filename}
                                                width={200}
                                                height={200}
                                                onClick={() => openLightbox(
                                                    moment.images.map(i => i.image.filepath),
                                                    index
                                                )}
                                                style={{
                                                    width: '100%',
                                                    height: 'auto',
                                                    aspectRatio: '1',
                                                    objectFit: 'cover',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Like and comment buttons */}
                                <div style={{
                                    display: 'flex',
                                    gap: '16px',
                                    marginBottom: '12px',
                                }}>
                                    <button
                                        onClick={() => toggleLike(moment.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            fontSize: '16px',
                                            color: userLiked ? 'var(--primary-pink)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faHeart} />
                                        {moment.likes.length > 0 && <span>{moment.likes.length}</span>}
                                    </button>
                                    <button style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '16px',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        <FontAwesomeIcon icon={faComment} />
                                        {moment.comments.length > 0 && <span>{moment.comments.length}</span>}
                                    </button>
                                </div>

                                {/* Comments section */}
                                {(moment.comments.length > 0 || moment.likes.length > 0) && (
                                    <div style={{
                                        background: 'var(--bg-warm)',
                                        borderRadius: '4px',
                                        padding: '12px',
                                        marginBottom: '12px',
                                    }}>
                                        {/* Likes */}
                                        {moment.likes.length > 0 && (
                                            <div style={{
                                                fontSize: '14px',
                                                marginBottom: moment.comments.length > 0 ? '8px' : 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}>
                                                <FontAwesomeIcon icon={faHeart} style={{ color: 'var(--primary-pink)', fontSize: '12px' }} />
                                                <span style={{ color: 'var(--primary-pink-dark)' }}>
                                                    {moment.likes.map(like => like.user?.username || like.persona?.name).join('、')}
                                                </span>
                                            </div>
                                        )}

                                        {/* Comments */}
                                        {moment.comments.map((comment) => (
                                            <div key={comment.id} style={{
                                                fontSize: '14px',
                                                marginBottom: '4px',
                                                lineHeight: '1.4'
                                            }}>
                                                <span style={{ color: 'var(--primary-pink-dark)', fontWeight: '500' }}>
                                                    {comment.user?.username || comment.persona?.name}
                                                </span>
                                                <span style={{ color: 'var(--text-primary)' }}>
                                                    ：{comment.content}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Comment input */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        value={commentInputs[moment.id] || ''}
                                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [moment.id]: e.target.value }))}
                                        placeholder="写评论..."
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            fontSize: '14px',
                                            border: '1px solid var(--border-light)',
                                            borderRadius: '20px',
                                        }}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                addComment(moment.id);
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => addComment(moment.id)}
                                        disabled={!commentInputs[moment.id]?.trim()}
                                        style={{
                                            padding: '8px 16px',
                                            background: commentInputs[moment.id]?.trim() ? 'var(--primary-pink)' : 'var(--border-light)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '20px',
                                            fontSize: '14px',
                                            cursor: commentInputs[moment.id]?.trim() ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        发送
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Image Lightbox */}
            {showLightbox && (
                <ImageLightbox
                    images={lightboxImages}
                    initialIndex={lightboxIndex}
                    onClose={closeLightbox}
                />
            )}
        </div>
    );
}

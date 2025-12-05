import React, { useState } from 'react';
import Image from 'next/image';
import ImageLightbox from '@/components/ImageLightbox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { getAvatarUrl } from '@/lib/avatar';

interface BubbleColors {
    background: string;
    border: string;
    text: string;
}

interface MessageBubbleProps {
    content: string;
    role: 'user' | 'assistant';
    isStreaming?: boolean;
    userAvatar?: string | null;
    personaAvatar?: string | null;
    personaId?: string;
    myColors?: BubbleColors;
    otherColors?: BubbleColors;
    imageUrl?: string | null;
    createdAt?: string;
    status?: 'sending' | 'sent' | 'error' | 'blocked';
    onImageLoad?: () => void;
}

function MessageBubble({
    content,
    role,
    isStreaming,
    userAvatar,
    personaAvatar,
    personaId,
    myColors,
    otherColors,
    imageUrl,
    createdAt,
    status = 'sent',
    onImageLoad,
}: MessageBubbleProps) {
    const isUser = role === 'user';
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Get colors for this bubble
    const colors = isUser ? myColors : otherColors;
    const bg = colors?.background || (isUser ? '#95ec69' : '#ffffff');
    const border = colors?.border || (isUser ? 'transparent' : '#e5e5e5');
    const textColor = colors?.text || '#000000';

    const displayAvatar = isUser
        ? (userAvatar ? getAvatarUrl(userAvatar, 'user', 'user') : getAvatarUrl('default', 'user', 'user'))
        : (personaAvatar ? getAvatarUrl(personaAvatar, personaId || 'bot', 'persona') : getAvatarUrl('default', personaId || 'bot', 'persona'));

    // Format time
    const formatTime = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    };

    const timeString = formatTime(createdAt);

    return (
        <div style={{
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column', // Changed to column to accommodate error text below
            gap: '4px'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                gap: '8px',
                alignItems: 'flex-start'
            }}>
                {/* 头像 */}
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'var(--bg-secondary)',
                    position: 'relative'
                }}>
                    <Image
                        src={displayAvatar}
                        alt={isUser ? 'User' : 'AI'}
                        fill
                        sizes="40px"
                        style={{ objectFit: 'cover' }}
                        unoptimized
                    />
                </div>

                {/* 消息内容区域 (包含气泡/图片和时间状态) */}
                <div style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    alignItems: 'center', // Align center for error icon
                    gap: '8px',
                    maxWidth: '70%'
                }}>
                    {/* 消息气泡或图片 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start'
                    }}>
                        {/* 如果有图片，单独显示图片 */}
                        {imageUrl && (
                            <>
                                <Image
                                    src={imageUrl}
                                    alt="Message image"
                                    width={300}
                                    height={300}
                                    onLoad={onImageLoad}
                                    style={{
                                        maxWidth: '300px',
                                        maxHeight: '300px',
                                        width: 'auto',
                                        height: 'auto',
                                        objectFit: 'contain',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        background: 'var(--bg-secondary)',
                                    }}
                                    onClick={() => setLightboxOpen(true)}
                                />
                                {lightboxOpen && imageUrl && (
                                    <ImageLightbox
                                        images={[imageUrl]}
                                        initialIndex={0}
                                        onClose={() => setLightboxOpen(false)}
                                    />
                                )}
                            </>
                        )}

                        {/* 如果有文字内容，显示文字气泡 */}
                        {content && (
                            <div style={{
                                background: status === 'blocked' ? bg : bg,
                                border: `1px solid ${border}`,
                                borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px',
                                padding: '10px 12px',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                                fontSize: '16px',
                                lineHeight: '1.4',
                                color: textColor,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                position: 'relative',
                                // opacity: status === 'sending' ? 0.7 : 1, // Removed
                                marginTop: imageUrl ? '8px' : '0'
                            }}>
                                {content}
                                {isStreaming && (
                                    <span style={{
                                        display: 'inline-block',
                                        width: '2px',
                                        height: '16px',
                                        background: 'currentColor',
                                        marginLeft: '2px',
                                        verticalAlign: 'text-bottom',
                                        animation: 'blink 1s infinite'
                                    }} />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Error Icon for Blocked/Failed state */}
                    {(status === 'blocked' || status === 'error') && (
                        <div style={{
                            color: '#fa5151',
                            fontSize: '20px',
                            cursor: 'pointer'
                        }}>
                            <FontAwesomeIcon icon={faExclamationCircle} />
                        </div>
                    )}

                    {/* 时间和状态 */}
                    {status !== 'blocked' && status !== 'error' && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isUser ? 'flex-end' : 'flex-start',
                            fontSize: '12px',
                            color: 'var(--text-tertiary)',
                            minWidth: 'fit-content',
                            marginBottom: '2px', // Slight adjustment to align with bubble bottom
                            alignSelf: 'flex-end'
                        }}>
                            {timeString && <span>{timeString}</span>}
                        </div>
                    )}
                </div>
            </div>

            {/* Blocked Message Text */}
            {status === 'blocked' && (
                <div style={{
                    fontSize: '12px',
                    color: '#999',
                    textAlign: isUser ? 'right' : 'left',
                    paddingRight: isUser ? '48px' : '0', // Align with bubble roughly (40px avatar + 8px gap)
                    paddingLeft: isUser ? '0' : '48px',
                    marginTop: '-4px'
                }}>
                    您已拉黑对方，无法向其发送消息。
                </div>
            )}

            <style jsx>{`
                @keyframes blink {
                    0%, 49% { opacity: 1; }
                    50%, 100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}

// Memoize the component to prevent unnecessary re-renders
export default React.memo(MessageBubble, (prev, next) => {
    return (
        prev.content === next.content &&
        prev.status === next.status &&
        prev.isStreaming === next.isStreaming &&
        prev.imageUrl === next.imageUrl
    );
});

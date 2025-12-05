import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';

interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    createdAt: string;
    imageUrl?: string;
    status?: 'sending' | 'sent' | 'error' | 'blocked';
}

interface MessageListProps {
    messages: Message[];
    personaAvatar?: string | null;
    personaId?: string;
    userAvatar?: string | null;
    myColors?: { background: string; border: string; text: string };
    otherColors?: { background: string; border: string; text: string };
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
    onReady?: () => void;
}

export default function MessageList({
    messages,
    personaAvatar,
    personaId,
    userAvatar,
    myColors,
    otherColors,
    onLoadMore,
    hasMore,
    loadingMore,
    onReady,
}: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const isFirstScroll = useRef(true);
    const prevScrollHeight = useRef(0);

    // 橡皮筋回弹效果状态
    const [bounceOffset, setBounceOffset] = useState(0);
    const touchStartY = useRef(0);
    const currentBounceOffset = useRef(0);
    const isTouching = useRef(false);
    const animationFrame = useRef<number>(0);

    // Initial load state to prevent scroll flash
    // Initialize as true if there are no messages (nothing to scroll to)
    const [isReady, setIsReady] = useState(() => messages.length === 0);

    // Disable browser scroll restoration to handle it manually
    useEffect(() => {
        if ('scrollRestoration' in history) {
            const original = history.scrollRestoration;
            history.scrollRestoration = 'manual';
            return () => {
                history.scrollRestoration = original;
            };
        }
    }, []);

    // Call onReady callback when component is initially ready with no messages
    useEffect(() => {
        if (isFirstScroll.current && messages.length === 0 && onReady) {
            isFirstScroll.current = false;
            onReady();
        }
    }, [messages.length, onReady]);

    // Handle initial scroll with strict clamping
    useLayoutEffect(() => {
        if (isFirstScroll.current && messages.length > 0) {
            // Force scroll to bottom immediately
            if (containerRef.current) {
                // Use a very large number to ensure we hit the bottom even if layout shifts occur
                containerRef.current.scrollTop = Number.MAX_SAFE_INTEGER;
            }

            // Do not immediately mark as ready. 
            // We wait for checking layout stability or just give it a safe delay.
            // Using a slightly longer timeout allows for heavy React renders (like huge text blocks) to settle.
            const timer = setTimeout(() => {
                isFirstScroll.current = false;
                setIsReady(true);
                if (onReady) onReady();
            }, 50); // Small buffer for layout to settle

            return () => clearTimeout(timer);
        }
    }, [messages, onReady]);

    // Use ResizeObserver to keep pinning to bottom while initializing
    // This helps when long messages cause layout shifts *after* the initial render but *before* isReady
    useEffect(() => {
        if (!isReady && containerRef.current && messages.length > 0) {
            const observer = new ResizeObserver(() => {
                if (containerRef.current) {
                    containerRef.current.scrollTop = Number.MAX_SAFE_INTEGER;
                }
            });

            if (contentRef.current) {
                observer.observe(contentRef.current);
            }

            return () => observer.disconnect();
        }
    }, [isReady, messages]);

    // Handle auto-scroll for new messages when sending
    // Handle auto-scroll for new messages when sending
    useEffect(() => {
        if (!isReady || messages.length === 0 || !bottomRef.current || !containerRef.current) return;

        const lastMessage = messages[messages.length - 1];
        const isUser = lastMessage.role === 'user';

        // Calculate if user is near bottom
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150; // 150px threshold

        // Always scroll for user messages
        if (isUser) {
            requestAnimationFrame(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            });
        }
        // For AI messages (or others), only scroll if already near bottom
        else if (isNearBottom) {
            requestAnimationFrame(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            });
        }
    }, [messages, isReady]); // Include full messages array since we access messages[messages.length - 1]

    // 加载更多消息时保持滚动位置
    useLayoutEffect(() => {
        if (containerRef.current && prevScrollHeight.current > 0) {
            const newScrollHeight = containerRef.current.scrollHeight;
            const scrollDiff = newScrollHeight - prevScrollHeight.current;

            if (scrollDiff > 0) {
                containerRef.current.scrollTop += scrollDiff;
            }
            prevScrollHeight.current = 0;
        }
    }, [messages]);

    // iOS 风格的弹簧动画，使用 UIKit 弹簧物理效果
    // 基于 iOS UIScrollView 橡皮筋行为
    const animateSpringBack = useCallback(() => {
        // iOS 弹簧参数（类似于 UISpringTimingParameters）
        const tension = 300; // 弹簧张力（刚度）
        const friction = 20; // 阻尼系数
        const mass = 1;

        let velocity = 0;
        let position = currentBounceOffset.current;
        let lastTimestamp: number | null = null;

        const animate = (timestamp: number) => {
            if (lastTimestamp === null) {
                lastTimestamp = timestamp;
                animationFrame.current = requestAnimationFrame(animate);
                return;
            }
            // 以秒为单位的时间差（限制以避免大的跳跃）
            const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.032);
            lastTimestamp = timestamp;

            // 弹簧物理学：F = -kx - cv (胡克定律与阻尼)
            const springForce = -tension * position;
            const dampingForce = -friction * velocity;
            const acceleration = (springForce + dampingForce) / mass;

            velocity += acceleration * dt;
            position += velocity * dt;

            // 当稳定时停止（iOS 使用类似的阈值）
            if (Math.abs(position) < 0.1 && Math.abs(velocity) < 0.1) {
                setBounceOffset(0);
                currentBounceOffset.current = 0;
                return;
            }

            setBounceOffset(position);
            currentBounceOffset.current = position;
            animationFrame.current = requestAnimationFrame(animate);
        };

        animationFrame.current = requestAnimationFrame(animate);
    }, []);

    // 卸载时清除动画帧
    useEffect(() => {
        return () => {
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
        };
    }, []);

    // 橡皮筋回弹效果处理函数
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // 取消任何正在进行的动画
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
        }
        isTouching.current = true;
        touchStartY.current = e.touches[0].clientY;
        // 如果动画被中断，捕获当前偏移量
        currentBounceOffset.current = bounceOffset;
    }, [bounceOffset]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isTouching.current || !containerRef.current) return;

        const container = containerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const touchY = e.touches[0].clientY;
        const deltaY = touchY - touchStartY.current;

        const isAtTop = scrollTop <= 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

        // 在边界处应用 iOS 风格的橡皮筋效果
        if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
            // iOS 使用大约 0.55 作为橡皮筋系数
            // 公式：offset = (1 - 1/(x*c+1)) * d
            // 其中 c 是阻力系数，d 是维度
            const dimension = clientHeight;
            const c = 0.55;
            const absD = Math.abs(deltaY);

            // iOS 橡皮筋公式
            const offset = (1.0 - (1.0 / ((absD * c / dimension) + 1.0))) * dimension;
            const signedOffset = deltaY > 0 ? offset : -offset;

            setBounceOffset(signedOffset);
            currentBounceOffset.current = signedOffset;
        } else if (currentBounceOffset.current !== 0) {
            // 如果不再处于边界，则重置
            setBounceOffset(0);
            currentBounceOffset.current = 0;
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        isTouching.current = false;
        if (currentBounceOffset.current !== 0) {
            animateSpringBack();
        }
    }, [animateSpringBack]);

    // Debounced scroll handler to prevent excessive load more calls
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleScroll = () => {
        // Clear previous timeout
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Debounce to avoid excessive calls during fast scrolling
        scrollTimeoutRef.current = setTimeout(() => {
            if (containerRef.current && onLoadMore && hasMore && !loadingMore) {
                const { scrollTop } = containerRef.current;

                // Only trigger when scrolled near the top (100px from top)
                // Don't trigger if already at the very top (scrollTop < 1) to prevent infinite loops
                if (scrollTop > 1 && scrollTop < 100) {
                    prevScrollHeight.current = containerRef.current.scrollHeight;
                    onLoadMore();
                }
            }
        }, 100); // 100ms debounce
    };

    // Cleanup scroll timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                WebkitOverflowScrolling: 'touch',
                overflowAnchor: 'none', // Prevent browser scroll anchoring interference
                // scrollBehavior: isReady ? 'smooth' : 'auto', // Auto during init, smooth after
                // opacity: isReady ? 1 : 0, // Parent now handles visibility
            }}
            className="hide-scrollbar"
        >
            <div
                ref={contentRef}
                style={{
                    transform: `translate3d(0, ${bounceOffset}px, 0)`,
                    willChange: bounceOffset !== 0 ? 'transform' : 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1
                }}
            >
                {loadingMore && (
                    <div style={{ height: '1px', width: '100%', opacity: 0 }} />
                )}
                {messages.length === 0 ? (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-tertiary)',
                        fontSize: '14px'
                    }}>
                        <FontAwesomeIcon icon={faComment} style={{ marginRight: '8px' }} />
                        发送消息开始对话
                    </div>
                ) : (
                    <>
                        <div style={{ padding: '8px 0' }}>
                            {messages.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    content={message.content}
                                    role={message.role}
                                    userAvatar={userAvatar}
                                    personaAvatar={personaAvatar}
                                    personaId={personaId}
                                    myColors={myColors}
                                    otherColors={otherColors}
                                    imageUrl={message.imageUrl}
                                    createdAt={message.createdAt}
                                    status={message.status}
                                    onImageLoad={() => {
                                        // 图片加载处理
                                        if (containerRef.current) {
                                            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
                                            const isNearBottom = scrollHeight - scrollTop - clientHeight < 150; // 150px threshold
                                            const isUserSending = message.role === 'user' && message.status === 'sending';

                                            if (isReady && (isNearBottom || isUserSending) && bottomRef.current) {
                                                // 只有当用户已经在底部附近，或者正在发送新消息时，才跟随图片加载滚动到底部
                                                bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                            } else if (!isReady && bottomRef.current) {
                                                // 如果未准备好（初始加载），则立即固定到底部
                                                containerRef.current.scrollTop = containerRef.current.scrollHeight;
                                            }
                                        }
                                    }}
                                />
                            ))}
                        </div>
                        <div ref={bottomRef} />
                    </>
                )}
            </div>
        </div>
    );
}

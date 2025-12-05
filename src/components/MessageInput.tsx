import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFaceSmile, faPlus } from '@fortawesome/free-solid-svg-icons';

interface MessageInputProps {
    onSend: (content: string) => void;
    onToggleStickerPanel: () => void;
    onToggleUploadPanel: () => void;
    showStickerPanel: boolean;
    showUploadPanel: boolean;
    disabled?: boolean;
}

// WeakMap to store last touch position for each textarea element
const lastTouchMap = new WeakMap<HTMLTextAreaElement, React.Touch>();

export default function MessageInput({
    onSend,
    onToggleStickerPanel,
    onToggleUploadPanel,
    showStickerPanel,
    showUploadPanel,
    disabled = false
}: MessageInputProps) {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (input.trim() && !disabled) {
            onSend(input.trim());
            setInput('');
            if (textareaRef.current) {
                textareaRef.current.style.height = '36px';
            }
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const textarea = e.target;
        textarea.style.height = '36px';
        const scrollHeight = textarea.scrollHeight;
        textarea.style.height = Math.min(scrollHeight, 100) + 'px';
    };

    // Prevent scroll propagation when textarea reaches boundaries
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement> | React.WheelEvent<HTMLTextAreaElement> | React.TouchEvent<HTMLTextAreaElement>) => {
        const textarea = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = textarea;

        // Check if we're at top or bottom boundary
        const isAtTop = scrollTop === 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1; // -1 for rounding errors

        // For wheel events
        if ('deltaY' in e) {
            const scrollingUp = e.deltaY < 0;
            const scrollingDown = e.deltaY > 0;

            if ((isAtTop && scrollingUp) || (isAtBottom && scrollingDown)) {
                e.preventDefault();
            }
        }

        // For touch events - store touch start position
        if (e.type === 'touchmove') {
            const touch = (e as React.TouchEvent).touches[0];
            const prevTouch = lastTouchMap.get(textarea);

            if (prevTouch) {
                const touchDeltaY = touch.clientY - prevTouch.clientY;
                const scrollingUp = touchDeltaY > 0;
                const scrollingDown = touchDeltaY < 0;

                if ((isAtTop && scrollingUp) || (isAtBottom && scrollingDown)) {
                    e.preventDefault();
                }
            }

            lastTouchMap.set(textarea, touch);
        }
    };


    return (
        <div
            data-message-input
            style={{
                background: 'var(--bg-white)',
                borderTop: '0.5px solid var(--border-light)',
                padding: '8px 12px',
                paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                position: 'relative',
                transition: 'all 0.3s ease'
            }}
        >
            {/* Input Textarea */}
            <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                onWheel={handleScroll}
                onTouchMove={handleScroll}
                onTouchStart={(e) => {
                    // Store initial touch position
                    const textarea = e.currentTarget;
                    lastTouchMap.set(textarea, e.touches[0]);
                }}
                placeholder={disabled ? "网络连接中断" : "请输入消息..."}
                disabled={disabled}
                style={{
                    flex: 1,
                    background: 'var(--bg-warm)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    lineHeight: '20px',
                    resize: 'none',
                    height: '36px',
                    maxHeight: '100px',
                    color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    opacity: disabled ? 0.6 : 1
                }}
                rows={1}
            />

            {/* Emoji/Sticker Button */}
            <button
                onClick={(e) => {
                    if (!disabled) {
                        e.stopPropagation();
                        onToggleStickerPanel();
                    }
                }}
                disabled={disabled}
                style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '22px',
                    color: showStickerPanel ? 'var(--primary-pink)' : 'var(--text-secondary)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    padding: '6px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'color 0.2s',
                    opacity: disabled ? 0.5 : 1
                }}
            >
                <FontAwesomeIcon icon={faFaceSmile} />
            </button>

            {/* Plus Button - Only show when no input */}
            {!input.trim() && (
                <button
                    onClick={(e) => {
                        if (!disabled) {
                            e.stopPropagation();
                            onToggleUploadPanel();
                        }
                    }}
                    disabled={disabled}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        width: '36px',
                        height: '36px',
                        fontSize: '20px',
                        color: showUploadPanel ? 'var(--primary-pink)' : 'var(--text-secondary)',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        borderRadius: '6px',
                        transition: 'all 0.2s',
                        opacity: disabled ? 0.5 : 1
                    }}
                >
                    <FontAwesomeIcon icon={faPlus} />
                </button>
            )}


            {/* Send Button - Only show when there's input  */}
            {input.trim() && (
                <button
                    onClick={handleSend}
                    disabled={disabled}
                    style={{
                        background: 'var(--primary-pink)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0 12px',
                        height: '32px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                        transition: 'background 0.2s',
                        opacity: disabled ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = '#ff4081')}
                    onMouseLeave={(e) => !disabled && (e.currentTarget.style.background = 'var(--primary-pink)')}
                >
                    发送
                </button>
            )}
        </div>
    );
}

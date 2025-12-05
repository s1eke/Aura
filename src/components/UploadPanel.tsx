import { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faImage } from '@fortawesome/free-solid-svg-icons';
import { showInfo } from '@/lib/modal';

interface UploadPanelProps {
    onSelectImage: (file: File) => void;
    onClose: () => void;
}

export default function UploadPanel({ onSelectImage, onClose }: UploadPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onSelectImage(file);
            onClose();
        }
    };

    return (
        <div
            data-upload-panel
            style={{
                background: 'var(--bg-warm)',
                borderTop: '1px solid var(--border-light)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                animation: 'slideUp 0.3s ease-out',
                height: '280px',
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

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
            />

            {/* Upload Options Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)'
            }}>
                {/* Photo Library */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        color: 'var(--primary-pink)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        transition: 'transform 0.2s'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <FontAwesomeIcon icon={faImage} />
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>相册</span>
                </div>

                {/* Camera */}
                <div
                    onClick={() => {
                        showInfo({
                            title: '功能开发中',
                            content: '拍照功能正在开发中，敬请期待'
                        });
                    }}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        color: 'var(--primary-pink)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        transition: 'transform 0.2s'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <FontAwesomeIcon icon={faCamera} />
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>拍摄</span>
                </div>
            </div>
        </div>
    );
}

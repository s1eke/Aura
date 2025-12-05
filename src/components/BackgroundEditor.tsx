import React, { useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faExpand, faArrowsAltH, faTh, faCompress } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type BgMode = 'cover' | 'contain' | 'stretch' | 'tile' | 'center';

interface BackgroundEditorProps {
    imageUrl: string;
    onSave: (params: { imageUrl: string, bgMode: string }) => void;
    onCancel: () => void;
    userAvatar?: string;
    personaAvatar?: string;
    initialMode?: string;
    // 气泡颜色设置
    myBubble?: {
        background: string;
        text: string;
    };
    personaBubble?: {
        background: string;
        text: string;
    };
}

export default function BackgroundEditor({
    imageUrl,
    onSave,
    onCancel,
    userAvatar,
    personaAvatar,
    initialMode = 'cover',
    myBubble = { background: '#95ec69', text: '#000' },
    personaBubble = { background: '#fff', text: '#000' }
}: BackgroundEditorProps) {
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<BgMode>(initialMode as BgMode);

    const handleSave = async () => {
        setSaving(true);
        try {
            onSave({ imageUrl, bgMode: mode });
        } catch (error) {
            console.error(error);
            setSaving(false);
        }
    };

    // 获取背景样式
    const getBackgroundStyle = () => {
        const baseStyle: React.CSSProperties = {
            backgroundImage: `url(${imageUrl})`,
            backgroundColor: '#f5f5f5', // 默认底色处理透明图片
        };

        switch (mode) {
            case 'cover': // 填充 (默认)
                return { ...baseStyle, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
            case 'contain': // 适应 (新增)
                return { ...baseStyle, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
            case 'stretch': // 拉伸
                return { ...baseStyle, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' };
            case 'tile': // 平铺
                return { ...baseStyle, backgroundSize: 'auto', backgroundRepeat: 'repeat' };
            case 'center': // 居中
                return { ...baseStyle, backgroundSize: 'auto', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
            default:
                return baseStyle;
        }
    };

    const modes: { key: BgMode, label: string, icon: IconDefinition }[] = [
        { key: 'cover', label: '填充', icon: faExpand },
        { key: 'contain', label: '适应', icon: faCompress },
        { key: 'stretch', label: '拉伸', icon: faArrowsAltH },
        { key: 'tile', label: '平铺', icon: faTh },
        { key: 'center', label: '居中', icon: faCompress },
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2000,
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* 预览层 */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                ...getBackgroundStyle(),
                zIndex: 0,
            }} />

            {/* UI层 */}
            <div style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}>
                {/* 顶部标题栏 */}
                <div style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                    paddingTop: 'calc(12px + env(safe-area-inset-top))',
                }}>
                    <button onClick={onCancel} style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background: 'rgba(0,0,0,0.05)',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        color: '#333'
                    }}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                    <div style={{ fontSize: '17px', fontWeight: '600', color: '#000' }}>
                        预览背景
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            fontSize: '16px',
                            color: saving ? '#ccc' : '#07c160',
                            fontWeight: '500',
                            border: 'none',
                            background: 'none',
                            padding: '4px 8px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {saving ? '保存中...' : '确定'}
                    </button>
                </div>

                {/* 模拟聊天内容 - 使用真实头像和气泡颜色 */}
                <div style={{
                    flex: 1,
                    padding: '20px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    overflow: 'hidden'
                }}>
                    {/* 对方消息 */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Image
                            src={personaAvatar || '/default-avatar.png'}
                            alt="Persona avatar"
                            width={40}
                            height={40}
                            style={{ borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0, objectFit: 'cover' }}
                        />
                        <div style={{
                            background: personaBubble.background,
                            color: personaBubble.text,
                            padding: '10px 14px',
                            borderRadius: '0 4px 4px 4px',
                            maxWidth: '70%',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            fontSize: '16px',
                            lineHeight: '1.5'
                        }}>
                            看看这个背景效果怎么样？
                        </div>
                    </div>

                    {/* 我的消息 */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <div style={{
                            background: myBubble.background,
                            color: myBubble.text,
                            padding: '10px 14px',
                            borderRadius: '4px 0 4px 4px',
                            maxWidth: '70%',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            fontSize: '16px',
                            lineHeight: '1.5'
                        }}>
                            这个模式挺合适的！
                        </div>
                        <Image
                            src={userAvatar || '/default-avatar.png'}
                            alt="User avatar"
                            width={40}
                            height={40}
                            style={{ borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0, objectFit: 'cover' }}
                        />
                    </div>
                </div>

                {/* 底部模式选择栏 - 替代输入框位置 */}
                <div style={{
                    padding: '16px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderTop: '1px solid rgba(0,0,0,0.1)',
                    paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'space-between'
                    }}>
                        {modes.map((m) => (
                            <button
                                key={m.key}
                                onClick={() => setMode(m.key)}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '12px 8px',
                                    border: 'none',
                                    background: mode === m.key ? '#e9f3fe' : '#f5f5f5',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    color: mode === m.key ? '#07c160' : '#666',
                                }}
                            >
                                <FontAwesomeIcon icon={m.icon} size="lg" />
                                <span style={{ fontSize: '13px', fontWeight: mode === m.key ? '500' : '400' }}>
                                    {m.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

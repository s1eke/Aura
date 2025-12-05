'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';

type BubbleMode = 'solid' | 'gradient';

// Helper function to parse background and extract gradient colors
function parseBackground(bg: string | null | undefined, defaultBg: string) {
    const bgValue = bg || defaultBg;
    if (bgValue.startsWith('linear-gradient')) {
        const colors = bgValue.match(/#[0-9a-fA-F]{6}/g);
        if (colors && colors.length >= 2) {
            return {
                mode: 'gradient' as BubbleMode,
                solidColor: defaultBg,
                gradientStart: colors[0],
                gradientEnd: colors[1]
            };
        }
    }
    return {
        mode: 'solid' as BubbleMode,
        solidColor: bgValue,
        gradientStart: defaultBg,
        gradientEnd: defaultBg
    };
}

export default function BubbleSettingsScreen() {
    const navigate = useNavigate();
    const { data: session, update } = useSession();

    // Initialize from session to avoid flash
    const myBgData = parseBackground(session?.user?.myBubbleBackground, '#95ec69');
    const otherBgData = parseBackground(session?.user?.otherBubbleBackground, '#ffffff');

    // User bubble
    const [myMode, setMyMode] = useState<BubbleMode>(myBgData.mode);
    const [myBgColor, setMyBgColor] = useState(myBgData.solidColor);
    const [myBgGradientStart, setMyBgGradientStart] = useState(myBgData.gradientStart);
    const [myBgGradientEnd, setMyBgGradientEnd] = useState(myBgData.gradientEnd);
    const [myBorder, setMyBorder] = useState(session?.user?.myBubbleBorder || 'transparent');
    const [myText, setMyText] = useState(session?.user?.myBubbleText || '#000000');

    // Other bubble
    const [otherMode, setOtherMode] = useState<BubbleMode>(otherBgData.mode);
    const [otherBgColor, setOtherBgColor] = useState(otherBgData.solidColor);
    const [otherBgGradientStart, setOtherBgGradientStart] = useState(otherBgData.gradientStart);
    const [otherBgGradientEnd, setOtherBgGradientEnd] = useState(otherBgData.gradientEnd);
    const [otherBorder, setOtherBorder] = useState(session?.user?.otherBubbleBorder || '#e5e5e5');
    const [otherText, setOtherText] = useState(session?.user?.otherBubbleText || '#000000');


    const getMyBackground = () => {
        if (myMode === 'gradient') {
            return `linear-gradient(135deg, ${myBgGradientStart}, ${myBgGradientEnd})`;
        }
        return myBgColor;
    };

    const getOtherBackground = () => {
        if (otherMode === 'gradient') {
            return `linear-gradient(135deg, ${otherBgGradientStart}, ${otherBgGradientEnd})`;
        }
        return otherBgColor;
    };

    const handleSave = async () => {
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    myBubbleBackground: getMyBackground(),
                    myBubbleBorder: myBorder,
                    myBubbleText: myText,
                    otherBubbleBackground: getOtherBackground(),
                    otherBubbleBorder: otherBorder,
                    otherBubbleText: otherText,
                }),
            });

            if (res.ok) {
                await update({
                    myBubbleBackground: getMyBackground(),
                    myBubbleBorder: myBorder,
                    myBubbleText: myText,
                    otherBubbleBackground: getOtherBackground(),
                    otherBubbleBorder: otherBorder,
                    otherBubbleText: otherText,
                });
                navigate(-1);
            }
        } catch (error) {
            console.error('Failed to save bubble settings:', error);
        }
    };

    return (
        <div style={{ height: '100%', background: 'var(--bg-warm)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                background: 'var(--bg-white)',
                padding: '10px 16px',
                paddingTop: 'calc(10px + env(safe-area-inset-top))',
                display: 'flex',
                alignItems: 'center',
                borderBottom: '0.5px solid var(--border-light)'
            }}>
                <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: '18px', padding: 0, cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <h1 style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: '600', margin: 0 }}>聊天气泡设置</h1>
                <button
                    onClick={handleSave}
                    style={{
                        border: 'none',
                        background: '#07c160',
                        color: 'white',
                        fontSize: '14px',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    保存
                </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                {/* Preview */}
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px'
                }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>预览效果</div>

                    {/* AI message */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '4px',
                            background: 'var(--bg-secondary)',
                            flexShrink: 0
                        }} />
                        <div style={{
                            maxWidth: '70%',
                            padding: '10px 12px',
                            borderRadius: '0 12px 12px 12px',
                            background: getOtherBackground(),
                            border: `1px solid ${otherBorder}`,
                            color: otherText,
                            fontSize: '16px'
                        }}>
                            你好！这是对方的消息气泡。
                        </div>
                    </div>

                    {/* User message */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <div style={{
                            maxWidth: '70%',
                            padding: '10px 12px',
                            borderRadius: '12px 0 12px 12px',
                            background: getMyBackground(),
                            border: `1px solid ${myBorder}`,
                            color: myText,
                            fontSize: '16px'
                        }}>
                            你好！这是我的消息气泡。
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '4px',
                            background: 'var(--bg-secondary)',
                            flexShrink: 0
                        }} />
                    </div>
                </div>

                {/* My Bubble Settings */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>我的气泡</div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
                        {/* Background Mode */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '14px', marginBottom: '12px', fontWeight: '500' }}>背景样式</div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setMyMode('solid')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        border: `2px solid ${myMode === 'solid' ? '#07c160' : 'var(--border-light)'}`,
                                        background: myMode === 'solid' ? '#f0fdf4' : 'white',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    单色
                                </button>
                                <button
                                    onClick={() => setMyMode('gradient')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        border: `2px solid ${myMode === 'gradient' ? '#07c160' : 'var(--border-light)'}`,
                                        background: myMode === 'gradient' ? '#f0fdf4' : 'white',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    渐变
                                </button>
                            </div>
                        </div>

                        {/* Background Color */}
                        {myMode === 'solid' ? (
                            <ColorPickerField
                                label="背景颜色"
                                color={myBgColor}
                                onChange={(color) => setMyBgColor(color)}
                            />
                        ) : (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>渐变颜色</div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <ColorPicker
                                        value={myBgGradientStart}
                                        onChange={(color: Color) => setMyBgGradientStart(color.toHexString())}
                                        showText
                                        style={{ flex: 1 }}
                                    />
                                    <span style={{ color: 'var(--text-secondary)' }}>→</span>
                                    <ColorPicker
                                        value={myBgGradientEnd}
                                        onChange={(color: Color) => setMyBgGradientEnd(color.toHexString())}
                                        showText
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Border & Text */}
                        <ColorPickerField
                            label="边框颜色"
                            color={myBorder}
                            onChange={(color) => setMyBorder(color)}
                        />
                        <ColorPickerField
                            label="字体颜色"
                            color={myText}
                            onChange={(color) => setMyText(color)}
                        />
                    </div>
                </div>

                {/* Other's Bubble Settings */}
                <div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>对方气泡</div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
                        {/* Background Mode */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '14px', marginBottom: '12px', fontWeight: '500' }}>背景样式</div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setOtherMode('solid')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        border: `2px solid ${otherMode === 'solid' ? '#07c160' : 'var(--border-light)'}`,
                                        background: otherMode === 'solid' ? '#f0fdf4' : 'white',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    单色
                                </button>
                                <button
                                    onClick={() => setOtherMode('gradient')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        border: `2px solid ${otherMode === 'gradient' ? '#07c160' : 'var(--border-light)'}`,
                                        background: otherMode === 'gradient' ? '#f0fdf4' : 'white',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    渐变
                                </button>
                            </div>
                        </div>

                        {/* Background Color */}
                        {otherMode === 'solid' ? (
                            <ColorPickerField
                                label="背景颜色"
                                color={otherBgColor}
                                onChange={(color) => setOtherBgColor(color)}
                            />
                        ) : (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>渐变颜色</div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <ColorPicker
                                        value={otherBgGradientStart}
                                        onChange={(color: Color) => setOtherBgGradientStart(color.toHexString())}
                                        showText
                                        style={{ flex: 1 }}
                                    />
                                    <span style={{ color: 'var(--text-secondary)' }}>→</span>
                                    <ColorPicker
                                        value={otherBgGradientEnd}
                                        onChange={(color: Color) => setOtherBgGradientEnd(color.toHexString())}
                                        showText
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Border & Text */}
                        <ColorPickerField
                            label="边框颜色"
                            color={otherBorder}
                            onChange={(color) => setOtherBorder(color)}
                        />
                        <ColorPickerField
                            label="字体颜色"
                            color={otherText}
                            onChange={(color) => setOtherText(color)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ColorPickerField({ label, color, onChange }: { label: string; color: string; onChange: (color: string) => void }) {
    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>{label}</div>
            <ColorPicker
                value={color}
                onChange={(color: Color) => onChange(color.toHexString())}
                showText
                style={{ width: '100%' }}
            />
        </div>
    );
}

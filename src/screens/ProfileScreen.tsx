'use client';

import { useSession } from 'next-auth/react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faCog } from '@fortawesome/free-solid-svg-icons';
import * as RegularIcons from '@fortawesome/free-regular-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'; // Import explicit type
import { getAvatarUrl } from '@/lib/avatar';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

// Get all face icons
const faceIcons = Object.keys(RegularIcons)
    .filter(key => key !== 'faFace' && key.startsWith('faFace')) // 'faFace' might not be an icon itself, but careful with prefixes
    .map(key => ({
        name: key,
        icon: RegularIcons[key as keyof typeof RegularIcons] as IconDefinition
    }));

export default function ProfileScreen() {
    const { data: session, update: updateSession } = useSession();
    const [showIconPicker, setShowIconPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Use session status icon directly, or local override
    const statusIconName = session?.user?.statusIcon || null;



    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowIconPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleIconSelect = async (iconName: string) => {
        setShowIconPicker(false);

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ statusIcon: iconName })
            });

            if (response.ok) {
                await updateSession(); // Refresh session
            }
        } catch (error) {
            console.error('Failed to update status icon', error);
        }
    };


    // Helper to find icon object by name
    const currentIcon = statusIconName ? (RegularIcons[statusIconName as keyof typeof RegularIcons] as IconDefinition) : null;

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
                justifyContent: 'center'
            }}>
                <h1 style={{
                    fontSize: '17px',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                }}>
                    我
                </h1>
            </div>

            {/* 用户信息 */}
            <div style={{ flex: 1, overflow: 'auto' }} className="hide-scrollbar">
                {/* 个人信息卡片 */}
                <div style={{
                    background: 'var(--bg-white)',
                    padding: '30px 20px',
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'var(--primary-pink-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px',
                        marginBottom: '12px',
                        border: '2px solid white',
                        overflow: 'hidden'
                    }}>
                        <Image
                            src={getAvatarUrl(session?.user?.image, session?.user?.email || 'user', 'user')}
                            alt="avatar"
                            width={80}
                            height={80}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <div style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '4px'
                    }}>
                        {session?.user?.name || '用户'}
                    </div>

                    {/* Status Icon Picker */}
                    <div style={{ position: 'relative', marginTop: '8px' }} ref={pickerRef}>
                        <div
                            onClick={() => setShowIconPicker(!showIconPicker)}
                            style={{
                                fontSize: '14px',
                                color: 'var(--text-secondary)',
                                background: 'var(--bg-warm)',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            {currentIcon ? (
                                <FontAwesomeIcon icon={currentIcon} style={{ fontSize: '16px' }} />
                            ) : (
                                <span>+ 状态</span>
                            )}
                        </div>

                        {showIconPicker && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginTop: '10px',
                                background: 'white',
                                borderRadius: '12px',
                                padding: '12px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                width: '280px',
                                zIndex: 100,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(6, 1fr)',
                                gap: '10px',
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}>
                                {faceIcons.map((item) => (
                                    <div
                                        key={item.name}
                                        onClick={() => handleIconSelect(item.name)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '8px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            background: statusIconName === item.name ? 'var(--bg-warm)' : 'transparent',
                                            fontSize: '20px',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <FontAwesomeIcon icon={item.icon} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 功能列表 */}
                <div style={{
                    background: 'var(--bg-white)',
                    marginBottom: '12px',
                    padding: '0 16px'
                }}>
                    <Link to="/me/edit" className="wechat-list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ fontSize: '20px', marginRight: '12px', width: '24px', textAlign: 'center' }}>
                            <FontAwesomeIcon icon={faPenToSquare} />
                        </div>
                        <div style={{ flex: 1, fontSize: '16px' }}>编辑资料</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>›</div>
                    </Link>
                </div>

                <div style={{
                    background: 'var(--bg-white)',
                    marginBottom: '12px',
                    padding: '0 16px'
                }}>
                    <Link to="/me/settings" className="wechat-list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ fontSize: '20px', marginRight: '12px', width: '24px', textAlign: 'center' }}>
                            <FontAwesomeIcon icon={faCog} />
                        </div>
                        <div style={{ flex: 1, fontSize: '16px' }}>偏好设置</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>›</div>
                    </Link>
                </div>
            </div>
        </div>
    );
}

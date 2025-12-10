'use client';

import { useNavigate } from 'react-router-dom';
import { signOut } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useUserProfile, useUpdateUserProfile } from '@/hooks/useQueries';

export default function SettingsScreen() {
    const navigate = useNavigate();

    // Use TanStack Query for cached user profile
    const { data: userProfile, isLoading } = useUserProfile();
    const updateProfileMutation = useUpdateUserProfile();

    const momentMode = userProfile?.momentMode ?? false;

    const toggleMomentMode = async () => {
        const newValue = !momentMode;

        // Optimistically update via mutation
        updateProfileMutation.mutate({ momentMode: newValue });
    };

    const handleSignOut = async () => {
        await signOut({ redirect: false });
        window.location.href = '/login'; // Force full reload to exit SPA
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
                gap: '12px'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        fontSize: '18px',
                        color: 'var(--text-primary)',
                        padding: '4px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <h1 style={{
                    fontSize: '17px',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                }}>
                    偏好设置
                </h1>
            </div>

            {/* 设置列表 */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px' }} className="hide-scrollbar">

                {/* 气泡设置 */}
                <div
                    onClick={() => navigate('/me/settings/bubble')}
                    style={{
                        background: 'var(--bg-white)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                    }}>
                        <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>聊天气泡设置</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>›</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        自定义聊天气泡样式
                    </div>
                </div>

                {/* API 设置 */}
                <div
                    onClick={() => navigate('/me/settings/api')}
                    style={{
                        background: 'var(--bg-white)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                    }}>
                        <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>API 设置</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>›</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        配置 API Key、Base URL 和模型
                    </div>
                </div>

                {/* 角色管理 */}
                <div
                    onClick={() => navigate('/me/settings/personas')}
                    style={{
                        background: 'var(--bg-white)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                    }}>
                        <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>角色管理</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>›</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        导出和备份角色数据
                    </div>
                </div>

                {/* 朋友圈模式 */}
                {!isLoading && (
                    <div
                        onClick={toggleMomentMode}
                        style={{
                            background: 'var(--bg-white)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                朋友圈模式
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {momentMode ? '开启中：AI 只能看到动态内容，不包含互动' : '关闭中：AI 可以看到完整的动态互动'}
                            </div>
                        </div>

                        {/* Switch Toggle */}
                        <div style={{
                            width: '48px',
                            height: '28px',
                            borderRadius: '14px',
                            background: momentMode ? '#07c160' : '#e5e5e5',
                            position: 'relative',
                            transition: 'background 0.3s'
                        }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'white',
                                position: 'absolute',
                                top: '2px',
                                left: momentMode ? '22px' : '2px',
                                transition: 'left 0.3s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>
                )}
            </div>

            {/* 退出登录 */}
            <button
                onClick={handleSignOut}
                style={{
                    width: '100%',
                    background: 'transparent',
                    color: 'var(--text-tertiary)',
                    border: 'none',
                    padding: '12px',
                    fontSize: '14px',
                    cursor: 'pointer'
                }}
            >
                退出登录
            </button>
        </div>
    );
}

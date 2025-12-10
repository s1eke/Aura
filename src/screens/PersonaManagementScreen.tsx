'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faDownload } from '@fortawesome/free-solid-svg-icons';
import { usePersonas } from '@/hooks/useQueries';
import { getAvatarUrl } from '@/lib/avatar';
import { showSuccess, showError } from '@/lib/modal';

export default function PersonaManagementScreen() {
    const navigate = useNavigate();
    const { data: personas, isLoading } = usePersonas();
    const [exportingId, setExportingId] = useState<string | null>(null);
    const [showModeSelector, setShowModeSelector] = useState<string | null>(null);
    const [selectedMode, setSelectedMode] = useState<'settings' | 'full'>('settings');

    const handleExportClick = (personaId: string) => {
        setShowModeSelector(personaId);
        setSelectedMode('settings');
    };

    const handleExportConfirm = async () => {
        if (!showModeSelector) return;

        setExportingId(showModeSelector);
        const personaId = showModeSelector;
        const persona = personas?.find(p => p.id === personaId);
        setShowModeSelector(null);

        try {
            const response = await fetch('/api/personas/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personaId, mode: selectedMode }),
            });

            if (!response.ok) {
                throw new Error('导出失败');
            }

            // Get ZIP blob
            const blob = await response.blob();

            // Generate filename with timestamp
            const timestamp = new Date().toISOString()
                .replace(/T/, '_')
                .replace(/\..+/, '')
                .replace(/:/g, '-');
            const filename = `${persona?.name || 'persona'}_${timestamp}.zip`;

            // Trigger download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showSuccess({
                title: '导出成功',
                content: `角色 "${persona?.name}" 已成功导出到文件 ${filename}`,
            });
        } catch (error) {
            console.error('Export error:', error);
            showError({
                title: '导出失败',
                content: '导出角色时发生错误，请重试',
            });
        } finally {
            setExportingId(null);
        }
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-warm)'
        }}>
            {/* Header */}
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
                    角色管理
                </h1>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px' }} className="hide-scrollbar">
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        加载中...
                    </div>
                ) : !personas || personas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        还没有创建任何角色
                    </div>
                ) : (
                    <>
                        <div style={{
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px',
                            paddingLeft: '4px'
                        }}>
                            选择要导出的角色
                        </div>

                        {personas.map((persona) => (
                            <div
                                key={persona.id}
                                style={{
                                    background: 'var(--bg-white)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    background: 'var(--bg-secondary)'
                                }}>
                                    <Image
                                        src={getAvatarUrl(persona.avatar, persona.id, 'persona')}
                                        alt={persona.name}
                                        width={48}
                                        height={48}
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: '500',
                                        color: 'var(--text-primary)',
                                        marginBottom: '4px'
                                    }}>
                                        {persona.name}
                                    </div>
                                </div>

                                {/* Export Button */}
                                <button
                                    onClick={() => handleExportClick(persona.id)}
                                    disabled={exportingId === persona.id}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#07c160',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: exportingId === persona.id ? 'not-allowed' : 'pointer',
                                        opacity: exportingId === persona.id ? 0.6 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <FontAwesomeIcon icon={faDownload} />
                                    {exportingId === persona.id ? '导出中...' : '导出'}
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Mode Selector Modal */}
            {showModeSelector && (
                <div
                    onClick={() => setShowModeSelector(null)}
                    style={{
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
                        padding: '20px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '24px',
                            maxWidth: '400px',
                            width: '100%'
                        }}
                    >
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            marginBottom: '16px',
                            color: 'var(--text-primary)'
                        }}>
                            选择导出模式
                        </h2>

                        <div style={{ marginBottom: '20px' }}>
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px',
                                    border: `2px solid ${selectedMode === 'settings' ? '#07c160' : 'var(--border-light)'}`,
                                    borderRadius: '8px',
                                    marginBottom: '12px',
                                    cursor: 'pointer',
                                    background: selectedMode === 'settings' ? '#f0fdf4' : 'white'
                                }}
                            >
                                <input
                                    type="radio"
                                    name="exportMode"
                                    value="settings"
                                    checked={selectedMode === 'settings'}
                                    onChange={(e) => setSelectedMode(e.target.value as 'settings' | 'full')}
                                    style={{ marginRight: '12px' }}
                                />
                                <div>
                                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>仅角色设定</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        包括角色信息、记忆，但不含聊天记录
                                    </div>
                                </div>
                            </label>

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px',
                                    border: `2px solid ${selectedMode === 'full' ? '#07c160' : 'var(--border-light)'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    background: selectedMode === 'full' ? '#f0fdf4' : 'white'
                                }}
                            >
                                <input
                                    type="radio"
                                    name="exportMode"
                                    value="full"
                                    checked={selectedMode === 'full'}
                                    onChange={(e) => setSelectedMode(e.target.value as 'settings' | 'full')}
                                    style={{ marginRight: '12px' }}
                                />
                                <div>
                                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>包含聊天记录</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        包括角色信息、记忆和所有聊天记录
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowModeSelector(null)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleExportConfirm}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#07c160',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                确认导出
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

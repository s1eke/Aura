'use client';

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faCamera } from '@fortawesome/free-solid-svg-icons';
import { queryKeys } from '@/lib/query-client';
import { showError } from '@/lib/modal';

export default function NewPersonaScreen() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        avatar: '',
        gender: '',
        description: '',
        style: '',
        catchphrases: '',
        greeting: '',
        instruction: ''
    });



    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };



    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        try {
            setLoading(true);
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: uploadFormData,
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            setFormData(prev => ({ ...prev, avatar: data.url }));
        } catch (error) {
            console.error('Upload error:', error);
            showError({
                title: '头像上传失败',
                content: '无法上传头像，请检查图片格式后重试'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/personas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('创建失败');

            const data = await res.json();

            // Invalidate sessions query to refresh the list
            queryClient.invalidateQueries({ queryKey: queryKeys.sessions });

            if (data.sessionId) {
                navigate(`/chat/${data.sessionId}`);
            } else {
                navigate('/');
            }
        } catch (error) {
            console.error(error);
            showError({
                title: '创建失败',
                content: '创建角色失败，请重试'
            });
        } finally {
            setLoading(false);
        }
    };

    const SectionTitle = ({ children }: { children: React.ReactNode }) => (
        <div style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            marginBottom: '8px',
            paddingLeft: '4px'
        }}>
            {children}
        </div>
    );

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
                justifyContent: 'space-between'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        border: 'none',
                        background: 'none',
                        fontSize: '18px',
                        color: 'var(--text-primary)',
                        padding: 0,
                        cursor: 'pointer'
                    }}
                >
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <h1 style={{ fontSize: '17px', fontWeight: '600' }}>创建角色</h1>
                <div style={{ width: '18px' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto' }} className="hide-scrollbar">
                <div style={{ padding: '16px' }}>
                    {/* Module 1: Avatar */}
                    <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            accept="image/*"
                        />
                        <div
                            onClick={handleAvatarClick}
                            style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '12px',
                                border: '2px dashed var(--border-light)',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                background: formData.avatar ? 'transparent' : 'var(--bg-secondary)'
                            }}
                        >
                            {formData.avatar ? (
                                <>
                                    <Image
                                        src={formData.avatar}
                                        alt="avatar"
                                        fill
                                        sizes="80px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        background: 'rgba(0,0,0,0.5)',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <FontAwesomeIcon icon={faCamera} style={{ color: 'white', fontSize: '12px' }} />
                                    </div>
                                </>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: 'var(--text-tertiary)'
                                }}>
                                    <FontAwesomeIcon icon={faCamera} style={{ fontSize: '20px' }} />
                                    <span style={{ fontSize: '11px' }}>点击上传</span>
                                </div>
                            )}
                        </div>


                    </div>

                    {/* Module 2: Basic Settings */}
                    <SectionTitle>基本设置</SectionTitle>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '15px', marginBottom: '8px', fontWeight: '500' }}>
                                昵称 *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    fontSize: '16px'
                                }}
                                placeholder="例如：小助手"
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '15px', marginBottom: '12px', fontWeight: '500' }}>
                                性别
                            </label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {['男', '女', '其他'].map((option) => (
                                    <label
                                        key={option}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '10px',
                                            border: `2px solid ${formData.gender === option ? '#07c160' : 'var(--border-light)'}`,
                                            borderRadius: '8px',
                                            background: formData.gender === option ? '#f0fdf4' : 'white',
                                            cursor: 'pointer',
                                            fontSize: '15px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="gender"
                                            value={option}
                                            checked={formData.gender === option}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            style={{ display: 'none' }}
                                        />
                                        {option}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Module 3: Persona Settings */}
                    <SectionTitle>角色设定</SectionTitle>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '15px', marginBottom: '8px', fontWeight: '500' }}>
                                人设设定
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                style={{
                                    width: '100%',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    fontSize: '15px',
                                    minHeight: '80px',
                                    resize: 'vertical'
                                }}
                                placeholder="描述角色的性格、背景等..."
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '15px', marginBottom: '8px', fontWeight: '500' }}>
                                表达风格
                            </label>
                            <input
                                type="text"
                                value={formData.style}
                                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                                style={{
                                    width: '100%',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    fontSize: '15px'
                                }}
                                placeholder="例如：温柔、严厉、幽默..."
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '15px', marginBottom: '8px', fontWeight: '500' }}>
                                习惯用语
                            </label>
                            <input
                                type="text"
                                value={formData.catchphrases}
                                onChange={(e) => setFormData({ ...formData, catchphrases: e.target.value })}
                                style={{
                                    width: '100%',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    fontSize: '15px'
                                }}
                                placeholder="例如：亲爱的、你知道吗..."
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '15px', marginBottom: '8px', fontWeight: '500' }}>
                                开场白
                            </label>
                            <input
                                type="text"
                                value={formData.greeting}
                                onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                                style={{
                                    width: '100%',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    fontSize: '15px'
                                }}
                                placeholder="例如：你好呀，我是..."
                            />
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                                创建完成后会自动发送给用户
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            background: '#07c160',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '14px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? '创建中...' : '创建角色'}
                    </button>
                </div>
            </form>
        </div>
    );
}

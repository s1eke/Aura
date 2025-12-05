'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faCamera, faTrash, faExpand } from '@fortawesome/free-solid-svg-icons';
import { getAvatarUrl } from '@/lib/avatar';
import { showError } from '@/lib/modal';
import Image from 'next/image';

// Full Screen Input Modal Component
const FullScreenInputModal = ({
    isOpen,
    onClose,
    onSave,
    title,
    initialValue,
    placeholder
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (value: string) => void;
    title: string;
    initialValue: string;
    placeholder?: string;
}) => {
    const [value, setValue] = useState(initialValue);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: 'var(--bg-warm)',
            display: 'flex',
            flexDirection: 'column'
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
                    onClick={onClose}
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-tertiary)',
                        border: 'none',
                        background: 'none',
                        padding: '4px',
                        cursor: 'pointer'
                    }}
                >
                    取消
                </button>
                <h1 style={{ fontSize: '17px', fontWeight: '600' }}>{title}</h1>
                <button
                    onClick={() => {
                        onSave(value);
                        onClose();
                    }}
                    style={{
                        fontSize: '16px',
                        fontWeight: '500',
                        color: '#07c160',
                        border: 'none',
                        background: 'none',
                        padding: '4px',
                        cursor: 'pointer'
                    }}
                >
                    完成
                </button>
            </div>

            {/* Editing Area */}
            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    autoFocus
                    style={{
                        flex: 1,
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '17px',
                        lineHeight: '1.6',
                        resize: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)'
                    }}
                />
            </div>
        </div>
    );
};

// Expandable Input Wrapper
const ExpandableInput = ({
    value,
    onChange,
    label,
    placeholder,
    minHeight = '40px'
}: {
    value: string;
    onChange: (val: string) => void;
    label: string;
    placeholder?: string;
    minHeight?: string;
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div style={{ position: 'relative' }}>
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                        width: '100%',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        padding: '10px 40px 10px 12px', // Right padding for button
                        fontSize: '15px',
                        minHeight: minHeight,
                        resize: 'vertical',
                        fontFamily: 'inherit'
                    }}
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background: 'rgba(0,0,0,0.05)',
                        borderRadius: '4px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                    }}
                >
                    <FontAwesomeIcon icon={faExpand} style={{ fontSize: '12px' }} />
                </button>
            </div>

            <FullScreenInputModal
                key={isModalOpen ? value : 'closed'}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onChange}
                title={label}
                initialValue={value}
                placeholder={placeholder}
            />
        </>
    );
};

export default function EditPersonaScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        avatar: '',
        gender: '',
        description: '',
        style: '',
        catchphrases: '',
        instruction: ''
    });

    const fetchPersona = useCallback(async () => {
        try {
            const res = await fetch(`/api/personas/${id}`);
            if (!res.ok) {
                navigate('/personas'); // Or general back
                return;
            }
            const data = await res.json();
            const persona = data.persona;

            setFormData({
                name: persona.name || '',
                avatar: persona.avatar || '',
                gender: persona.gender || '',
                description: persona.description || '',
                style: persona.style || '',
                catchphrases: persona.catchphrases || '',
                instruction: persona.instruction || ''
            });
        } catch (error) {
            console.error('Failed to fetch persona:', error);
            navigate('/personas');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        if (id) fetchPersona();
    }, [id, fetchPersona]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };



    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        try {
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
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch(`/api/personas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('更新失败');

            // Invalidate queries to refresh avatar in message list and chat screens
            queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
            queryClient.invalidateQueries({ queryKey: queryKeys.personas });
            // Invalidate all session message queries that might contain this persona
            queryClient.invalidateQueries({ queryKey: ['messages'] });

            navigate(-1);
        } catch (error) {
            console.error(error);
            showError({
                title: '更新失败',
                content: '更新角色失败，请重试'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('确定删除这个角色吗？')) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/personas/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('删除失败');

            navigate('/personas');
        } catch (error) {
            console.error(error);
            showError({
                title: '删除失败',
                content: '删除角色失败，请重试'
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-warm)'
            }}>
                <div style={{ color: '#999' }}>加载中...</div>
            </div>
        );
    }

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
                <h1 style={{ fontSize: '17px', fontWeight: '600' }}>编辑角色</h1>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                        background: '#07c160',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 16px',
                        fontSize: '15px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        opacity: submitting ? 0.6 : 1,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                >
                    {submitting ? '保存中...' : '保存'}
                </button>
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
                                border: '2px solid var(--border-light)',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer'
                            }}
                        >
                            <Image
                                src={getAvatarUrl(formData.avatar, id || 'unknown', 'persona')}
                                alt="avatar"
                                fill
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
                            <ExpandableInput
                                value={formData.description}
                                onChange={(val) => setFormData({ ...formData, description: val })}
                                label="人设设定"
                                placeholder="描述角色的性格、背景等..."
                                minHeight="80px"
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '15px', marginBottom: '8px', fontWeight: '500' }}>
                                表达风格
                            </label>
                            <ExpandableInput
                                value={formData.style}
                                onChange={(val) => setFormData({ ...formData, style: val })}
                                label="表达风格"
                                placeholder="例如：温柔、严厉、幽默..."
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '15px', marginBottom: '8px', fontWeight: '500' }}>
                                习惯用语
                            </label>
                            <ExpandableInput
                                value={formData.catchphrases}
                                onChange={(val) => setFormData({ ...formData, catchphrases: val })}
                                label="习惯用语"
                                placeholder="例如：亲爱的、你知道吗..."
                            />
                        </div>
                    </div>

                    {/* Delete Button */}
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={submitting}
                        style={{
                            width: '100%',
                            background: 'transparent',
                            color: '#999',
                            border: 'none',
                            padding: '14px',
                            fontSize: '14px',
                            fontWeight: '400',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.4 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            textDecoration: 'underline'
                        }}
                    >
                        <FontAwesomeIcon icon={faTrash} style={{ fontSize: '12px' }} />
                        删除角色
                    </button>
                </div>
            </form>
        </div>
    );
}

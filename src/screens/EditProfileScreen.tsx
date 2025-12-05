'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faCamera } from '@fortawesome/free-solid-svg-icons';
import { getAvatarUrl } from '@/lib/avatar';
import { showError } from '@/lib/modal';

export default function EditProfileScreen() {
    const navigate = useNavigate();
    const { data: session, update } = useSession();
    const [username, setUsername] = useState('');
    const [avatar, setAvatar] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (session?.user) {
            setUsername(session.user.name || '');
            setAvatar(session.user.image || '');
        }
    }, [session]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };



    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true);
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            setAvatar(data.url);
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
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, avatar }),
            });

            if (!res.ok) throw new Error('更新失败');

            // Update session and wait for it to complete
            await update({ name: username, image: avatar });

            // Force a small delay to ensure session cache updates
            await new Promise(resolve => setTimeout(resolve, 100));

            // Navigate back
            navigate('/me');
        } catch (error) {
            console.error(error);
            showError({
                title: '更新失败',
                content: '无法保存个人信息，请重试'
            });
        } finally {
            setLoading(false);
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
                <h1 style={{ fontSize: '17px', fontWeight: '600' }}>个人信息</h1>
                <div style={{ width: '18px' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: '30px'
                }}>
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
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: 'var(--primary-pink-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '12px',
                            border: '2px solid white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer'
                        }}
                    >
                        <Image
                            src={getAvatarUrl(avatar, session?.user?.email || 'user', 'user')}
                            alt="avatar"
                            fill
                            sizes="100px"
                            style={{ objectFit: 'cover' }}
                        />

                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(0,0,0,0.5)',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FontAwesomeIcon icon={faCamera} style={{ color: 'white', fontSize: '14px' }} />
                        </div>
                    </div>


                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        昵称
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{
                            width: '100%',
                            border: '1px solid var(--border-light)',
                            borderRadius: '4px',
                            padding: '10px 12px',
                            fontSize: '16px'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="wechat-button"
                    style={{ width: '100%', marginTop: '20px' }}
                >
                    {loading ? '保存中...' : '保存'}
                </button>
            </form>
        </div>
    );
}

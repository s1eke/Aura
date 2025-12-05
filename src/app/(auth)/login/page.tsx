'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push('/');
                router.refresh();
            }
        } catch {
            setError('登录失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-warm)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px'
        }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <Image
                            src="/aura.png"
                            alt="Aura Logo"
                            width={200}
                            height={200}
                        />
                    </div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '8px'
                    }}>
                        Aura
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Your Kind of Conversation
                    </p>
                </div>

                {/* Login Form */}
                <div style={{
                    background: 'var(--bg-white)',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    {error && (
                        <div style={{
                            background: '#fee',
                            color: '#c00',
                            padding: '12px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            marginBottom: '20px'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                color: 'var(--text-secondary)',
                                marginBottom: '8px'
                            }}>
                                邮箱
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                style={{
                                    width: '100%',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '4px',
                                    padding: '12px',
                                    fontSize: '16px'
                                }}
                                placeholder="your@email.com"
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                color: 'var(--text-secondary)',
                                marginBottom: '8px'
                            }}>
                                密码
                            </label>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                style={{
                                    width: '100%',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '4px',
                                    padding: '12px',
                                    fontSize: '16px'
                                }}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="wechat-button"
                        >
                            {loading ? '登录中...' : '登录'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

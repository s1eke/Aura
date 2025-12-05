'use client';

import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faSave, faSpinner, faFileImport, faFileExport } from '@fortawesome/free-solid-svg-icons';
import { showAlert } from '@/lib/modal';

// Placeholder for masked API key
const MASKED_API_KEY = '••••••••••••••••';

export default function ApiSettingsScreen() {
    const navigate = useNavigate();
    const { data: session, update: updateSession } = useSession();
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [apiBaseUrl, setApiBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [llmModel, setLlmModel] = useState('');
    const [visionModel, setVisionModel] = useState('');

    const [initialized, setInitialized] = useState(false);

    // Initialize from session
    useEffect(() => {
        if (session?.user && !initialized) {
            setApiBaseUrl(session.user.apiBaseUrl || 'https://api.openai.com/v1');
            // Show placeholder if API key exists in DB, otherwise empty for new input
            setApiKey(session.user.apiKey ? MASKED_API_KEY : '');
            setLlmModel(session.user.llmModel || 'gpt-4o-mini');
            setVisionModel(session.user.visionModel || 'gpt-4-vision-preview');
            setInitialized(true);
        }
    }, [session, initialized]);

    const handleExport = () => {
        const settings = {
            apiBaseUrl,
            llmModel,
            visionModel,
            // Only export API key if it's visible (user just typed it), otherwise skip for security
            ...(apiKey && apiKey !== MASKED_API_KEY ? { apiKey } : {})
        };

        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'aura-api-settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (apiKey === MASKED_API_KEY) {
            showAlert({ title: '导出成功', content: '配置已导出。\n注意：基于安全考虑，未修改的 API Key 不会被导出。' });
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const settings = JSON.parse(content);

                if (settings.apiBaseUrl) setApiBaseUrl(settings.apiBaseUrl);
                if (settings.llmModel) setLlmModel(settings.llmModel);
                if (settings.visionModel) setVisionModel(settings.visionModel);
                if (settings.apiKey) setApiKey(settings.apiKey);

                showAlert({ title: '导入成功', content: '配置已导入，请点击保存以应用更改。' });
            } catch (error) {
                console.error('Import error:', error);
                showAlert({ title: '导入失败', content: '文件格式不正确' });
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Build request body, exclude placeholder API key
            const payload: {
                apiBaseUrl: string;
                llmModel: string;
                visionModel: string;
                apiKey?: string;
            } = {
                apiBaseUrl,
                llmModel,
                visionModel
            };

            // Only include API key if it's been changed (not placeholder)
            if (apiKey && apiKey !== MASKED_API_KEY) {
                payload.apiKey = apiKey;
            }

            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await updateSession(); // Refresh session to get new values
                navigate(-1);
            } else {
                showAlert({ title: '保存失败', content: '无法保存设置，请重试' });
            }
        } catch (error) {
            console.error('Failed to save API settings', error);
            showAlert({ title: '保存出错', content: '发生未知错误' });
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
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".json"
                style={{ display: 'none' }}
            />

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                        API 设置
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleImportClick}
                        style={{
                            color: 'var(--text-primary)',
                            background: 'none',
                            border: 'none',
                            padding: '8px',
                            fontSize: '16px',
                            cursor: 'pointer'
                        }}
                        title="导入配置"
                    >
                        <FontAwesomeIcon icon={faFileImport} />
                    </button>

                    <button
                        onClick={handleExport}
                        style={{
                            color: 'var(--text-primary)',
                            background: 'none',
                            border: 'none',
                            padding: '8px',
                            fontSize: '16px',
                            cursor: 'pointer'
                        }}
                        title="导出配置"
                    >
                        <FontAwesomeIcon icon={faFileExport} />
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            background: '#07c160',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            opacity: loading ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                        <span>保存</span>
                    </button>
                </div>
            </div>

            {/* Form */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }} className="hide-scrollbar">
                <div style={{
                    background: 'var(--bg-white)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>API Base URL</label>
                        <input
                            type="text"
                            value={apiBaseUrl}
                            onChange={(e) => setApiBaseUrl(e.target.value)}
                            placeholder="https://api.openai.com/v1"
                            style={inputStyle}
                        />
                        <div style={hintStyle}>兼容 OpenAI 接口格式的地址</div>
                    </div>

                    <div style={formGroupStyle}>
                        <label style={labelStyle}>API Key</label>
                        <input
                            type={apiKey === MASKED_API_KEY ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={apiKey === MASKED_API_KEY ? "" : "sk-..."}
                            style={inputStyle}
                        />
                        <div style={hintStyle}>
                            {apiKey === MASKED_API_KEY ? '已保存 (输入新值以更新)' : '您的 API 密钥'}
                        </div>
                    </div>

                    <div style={formGroupStyle}>
                        <label style={labelStyle}>LLM 模型名称</label>
                        <input
                            type="text"
                            value={llmModel}
                            onChange={(e) => setLlmModel(e.target.value)}
                            placeholder="gpt-4o-mini"
                            style={inputStyle}
                        />
                        <div style={hintStyle}>用于对话的语言模型</div>
                    </div>

                    <div style={formGroupStyle}>
                        <label style={labelStyle}>视觉模型名称</label>
                        <input
                            type="text"
                            value={visionModel}
                            onChange={(e) => setVisionModel(e.target.value)}
                            placeholder="gpt-4-vision-preview"
                            style={inputStyle}
                        />
                        <div style={hintStyle}>用于图片识别的模型</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const formGroupStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
};

const labelStyle = {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)'
};

const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '16px',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    background: 'var(--bg-warm)',
    outline: 'none',
    color: 'var(--text-primary)'
};

const hintStyle = {
    fontSize: '12px',
    color: 'var(--text-tertiary)'
};

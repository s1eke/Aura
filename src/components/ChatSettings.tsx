'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { showError } from '@/lib/modal';

interface ChatSettingsProps {
    sessionId: string;
    currentSettings: {
        isPinned: boolean;
        isBlacklisted: boolean;
        bgImage: string | null;
        contextSize: number;
        memoryEnabled: boolean;
    };
    onClose: () => void;
    onUpdate: (settings: Partial<ChatSettingsProps['currentSettings']>) => void;
}

export default function ChatSettings({
    sessionId,
    currentSettings,
    onClose,
    onUpdate,
}: ChatSettingsProps) {
    const [isPinned, setIsPinned] = useState(currentSettings.isPinned);
    const [isBlacklisted, setIsBlacklisted] = useState(currentSettings.isBlacklisted);
    const [contextSize, setContextSize] = useState(currentSettings.contextSize);
    const [memoryEnabled, setMemoryEnabled] = useState(currentSettings.memoryEnabled);
    const [isUploading, setIsUploading] = useState(false);

    const handleSave = async () => {
        try {
            const response = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isPinned,
                    isBlacklisted,
                    contextSize,
                    memoryEnabled,
                }),
            });

            if (!response.ok) throw new Error('更新设置失败');

            onUpdate({ isPinned, isBlacklisted, contextSize, memoryEnabled });
            onClose();
        } catch (error) {
            console.error('Save settings error:', error);
            showError({
                title: '保存失败',
                content: '保存设置失败，请重试'
            });
        }
    };

    const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`/api/sessions/${sessionId}/background`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('上传背景失败');

            const { bgImage } = await response.json();
            onUpdate({ bgImage });
        } catch (error) {
            console.error('Background upload error:', error);
            showError({
                title: '上传失败',
                content: '上传背景失败，请重试'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveBackground = async () => {
        try {
            const response = await fetch(`/api/sessions/${sessionId}/background`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('移除背景失败');

            onUpdate({ bgImage: null });
        } catch (error) {
            console.error('Remove background error:', error);
            showError({
                title: '移除失败',
                content: '移除背景失败，请重试'
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={24} />
                </button>

                <h2 className="text-xl font-bold mb-6">聊天设置</h2>

                <div className="space-y-6">
                    {/* Pin Toggle */}
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">置顶聊天</label>
                        <button
                            onClick={() => setIsPinned(!isPinned)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPinned ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPinned ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Blacklist Toggle */}
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">黑名单</label>
                        <button
                            onClick={() => setIsBlacklisted(!isBlacklisted)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isBlacklisted ? 'bg-red-600' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isBlacklisted ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Background Upload */}
                    <div>
                        <label className="text-sm font-medium block mb-2">聊天背景</label>
                        {currentSettings.bgImage ? (
                            <div className="space-y-2">
                                <div className="relative w-full h-32 rounded overflow-hidden">
                                    <Image
                                        src={currentSettings.bgImage}
                                        alt="Chat background"
                                        fill
                                        sizes="(max-width: 28rem) 100vw, 28rem"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <button
                                    onClick={handleRemoveBackground}
                                    className="text-sm text-red-600 hover:text-red-700"
                                >
                                    移除背景
                                </button>
                            </div>
                        ) : (
                            <label className="block">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleBackgroundUpload}
                                    disabled={isUploading}
                                    className="hidden"
                                />
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500">
                                    <p className="text-sm text-gray-600">
                                        {isUploading ? '上传中...' : '点击上传背景图片'}
                                    </p>
                                </div>
                            </label>
                        )}
                    </div>

                    {/* Context Size */}
                    <div>
                        <label className="text-sm font-medium block mb-2">
                            上下文消息数量: {contextSize}
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="20"
                            value={contextSize}
                            onChange={(e) => setContextSize(parseInt(e.target.value))}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>10条</span>
                            <span>20条</span>
                        </div>
                    </div>

                    {/* Memory Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium block">记忆增强</label>
                            <p className="text-xs text-gray-500">自动总结每30条消息</p>
                        </div>
                        <button
                            onClick={() => setMemoryEnabled(!memoryEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${memoryEnabled ? 'bg-green-600' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${memoryEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Save Button */}
                <div className="mt-8 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        保存
                    </button>
                </div>
            </div>
        </div>
    );
}

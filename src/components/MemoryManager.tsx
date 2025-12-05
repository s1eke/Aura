'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Edit2, Save, X } from 'lucide-react';
import { showError } from '@/lib/modal';

interface Memory {
    id: string;
    content: string;
    messageCount: number;
    createdAt: string;
}

interface MemoryManagerProps {
    sessionId: string;
    onClose: () => void;
}

export default function MemoryManager({ sessionId, onClose }: MemoryManagerProps) {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchMemories = useCallback(async () => {
        try {
            const response = await fetch(`/api/sessions/${sessionId}/memories`);
            if (!response.ok) throw new Error('获取记忆失败');

            const data = await response.json();
            setMemories(data.memories);
        } catch (error) {
            console.error('Fetch memories error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchMemories();
    }, [fetchMemories]);

    const handleEdit = (memory: Memory) => {
        setEditingId(memory.id);
        setEditContent(memory.content);
    };

    const handleSave = async (memoryId: string) => {
        try {
            const response = await fetch(`/api/sessions/${sessionId}/memories/${memoryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editContent }),
            });

            if (!response.ok) throw new Error('更新记忆失败');

            const { memory } = await response.json();
            setMemories(prev => prev.map(m => m.id === memoryId ? memory : m));
            setEditingId(null);
        } catch (error) {
            console.error('Save memory error:', error);
            showError({
                title: '保存失败',
                content: '无法保存记忆内容，请重试'
            });
        }
    };

    const handleDelete = async (memoryId: string) => {
        if (!confirm('确定要删除这条记忆吗？')) return;

        try {
            const response = await fetch(`/api/sessions/${sessionId}/memories/${memoryId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('删除记忆失败');

            setMemories(prev => prev.filter(m => m.id !== memoryId));
        } catch (error) {
            console.error('Delete memory error:', error);
            showError({
                title: '删除失败',
                content: '无法删除记忆，请重试'
            });
        }
    };

    const handleManualSummarize = async () => {
        try {
            const response = await fetch(`/api/sessions/${sessionId}/memories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageCount: 30 }),
            });

            if (!response.ok) throw new Error('总结失败');

            await fetchMemories();
        } catch (error) {
            console.error('Manual summarize error:', error);
            showError({
                title: '总结失败',
                content: '无法生成记忆总结，请重试'
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col relative">
                <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-xl font-bold">记忆管理</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="text-center py-8 text-gray-500">加载中...</div>
                    ) : memories.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            暂无记忆
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {memories.map((memory) => (
                                <div
                                    key={memory.id}
                                    className="border rounded-lg p-4 hover:bg-gray-50"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="text-xs text-gray-500">
                                            {new Date(memory.createdAt).toLocaleString('zh-CN')} ·
                                            总结了{memory.messageCount}条消息
                                        </div>
                                        <div className="flex gap-2">
                                            {editingId === memory.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleSave(memory.id)}
                                                        className="text-green-600 hover:text-green-700"
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(memory)}
                                                        className="text-blue-600 hover:text-blue-700"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(memory.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {editingId === memory.id ? (
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows={4}
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {memory.content}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t">
                    <button
                        onClick={handleManualSummarize}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        立即触发记忆总结
                    </button>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                        将会把新产生的对话与现有记忆合并，并覆盖旧记忆。
                    </p>
                </div>
            </div>
        </div>
    );
}

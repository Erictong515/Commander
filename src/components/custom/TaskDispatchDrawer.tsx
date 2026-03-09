// src/components/custom/TaskDispatchDrawer.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Zap, Search } from 'lucide-react';

interface RecommendedAgent {
    agentId: string;
    score: number;
    reasons: string[];
}

interface TaskDispatchDrawerProps {
    open: boolean;
    onClose: () => void;
}

const TASK_TYPES = ['inference', 'code-gen', 'analysis', 'orchestration'];
const PRIORITIES = ['critical', 'high', 'normal', 'low'];
const CAPABILITIES = ['code', 'vision', 'reasoning'];

export function TaskDispatchDrawer({ open, onClose }: TaskDispatchDrawerProps) {
    const [prompt, setPrompt] = useState('');
    const [taskType, setTaskType] = useState('inference');
    const [priority, setPriority] = useState('normal');
    const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
    const [recommendations, setRecommendations] = useState<RecommendedAgent[]>([]);
    const [loading, setLoading] = useState(false);
    const [dispatching, setDispatching] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    function toggleCap(cap: string) {
        setSelectedCaps(prev =>
            prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
        );
    }

    async function handlePreview() {
        if (!prompt.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const createRes = await fetch('http://localhost:3001/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    type: taskType,
                    priority,
                    requirements: { capabilities: selectedCaps },
                }),
            });
            const { task } = await createRes.json();

            const recRes = await fetch('http://localhost:3001/api/scheduler/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: task.id }),
            });
            const data = await recRes.json();
            setRecommendations(data.recommendations?.slice(0, 3) ?? []);
        } catch {
            setResult('预览失败，请确认 daemon 正在运行');
        } finally {
            setLoading(false);
        }
    }

    async function handleDispatch() {
        if (!prompt.trim()) return;
        setDispatching(true);
        setResult(null);
        try {
            const res = await fetch('http://localhost:3001/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    type: taskType,
                    priority,
                    requirements: { capabilities: selectedCaps },
                }),
            });
            if (res.ok) {
                const { task } = await res.json();
                setResult(`✓ 任务已入队: ${task.id.slice(0, 8)}...`);
                setPrompt('');
                setRecommendations([]);
            } else {
                setResult('派发失败');
            }
        } catch {
            setResult('派发失败，请确认 daemon 正在运行');
        } finally {
            setDispatching(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Drawer */}
            <div className="relative w-[480px] h-full bg-[#0d0d0d] border-l border-white/10 flex flex-col overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-red-500" />
                        派发任务
                    </h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-5 flex-1">
                    {/* Prompt */}
                    <div>
                        <label className="block text-sm text-white/50 mb-1.5">任务指令 *</label>
                        <textarea
                            rows={4}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none"
                            placeholder="描述需要执行的任务..."
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                        />
                    </div>

                    {/* Type + Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-white/50 mb-1.5">任务类型</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                                value={taskType}
                                onChange={e => setTaskType(e.target.value)}
                            >
                                {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-white/50 mb-1.5">优先级</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                                value={priority}
                                onChange={e => setPriority(e.target.value)}
                            >
                                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Capabilities */}
                    <div>
                        <label className="block text-sm text-white/50 mb-2">能力要求（可选）</label>
                        <div className="flex gap-2 flex-wrap">
                            {CAPABILITIES.map(cap => (
                                <button
                                    key={cap}
                                    onClick={() => toggleCap(cap)}
                                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                        selectedCaps.includes(cap)
                                            ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                            : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'
                                    }`}
                                >
                                    {cap}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview button */}
                    <Button
                        variant="outline"
                        className="w-full border-white/10 text-white/60 hover:text-white gap-2"
                        onClick={handlePreview}
                        disabled={!prompt.trim() || loading}
                    >
                        <Search className="w-4 h-4" />
                        {loading ? '预览中...' : '预览分配 (推荐 Agent)'}
                    </Button>

                    {/* Recommendations */}
                    {recommendations.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-white/40 uppercase tracking-wider">推荐 Agent</p>
                            {recommendations.map((rec, i) => (
                                <div key={rec.agentId} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white text-sm font-medium">
                                            #{i + 1} {rec.agentId.slice(0, 16)}...
                                        </span>
                                        <span className="text-green-400 text-sm font-mono">score: {rec.score}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {rec.reasons.map((r, j) => (
                                            <p key={j} className="text-xs text-white/40 font-mono">{r}</p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Result message */}
                    {result && (
                        <p className={`text-sm ${result.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                            {result}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/5">
                    <Button
                        className="w-full bg-red-500 hover:bg-red-600 text-white gap-2"
                        onClick={handleDispatch}
                        disabled={!prompt.trim() || dispatching}
                    >
                        <Zap className="w-4 h-4" />
                        {dispatching ? '派发中...' : '确认派发'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Activity,
    Bug,
    Cpu,
    HardDrive,
    AlertTriangle,
    CheckCircle2,
    Hexagon,
    Server,
    X,
    StopCircle,
    Search,
    Filter,
    LayoutList,
    LayoutGrid,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { GroupedAgentView } from './GroupedAgentView';

interface ClaudeTask {
    taskId: string;
    subject: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'deleted';
    owner?: string;
    activeForm?: string;
}

interface LocalAgent {
    id: string;
    name: string;
    type: 'CLI' | 'Local-LLM';
    status: 'active' | 'processing' | 'idle' | 'error';
    cpu: number;
    memory: number;
    pid?: number;
    environment: string;
    currentTask?: string;
    sessionId?: string;
    project?: string;
    tasks?: ClaudeTask[];
}

export function SwarmPage() {
    const [agents, setAgents] = useState<LocalAgent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<LocalAgent | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped'); // 新增：视图模式

    useEffect(() => {
        let ws: WebSocket;
        let retryTimeout: ReturnType<typeof setTimeout>;

        function connect() {
            ws = new WebSocket('ws://localhost:3001');
            ws.onopen = () => setIsConnected(true);
            ws.onclose = () => {
                setIsConnected(false);
                retryTimeout = setTimeout(connect, 3000);
            };
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'AGENTS_UPDATE') {
                        // Tasks are now included in the WebSocket message
                        setAgents(message.data);
                    }
                } catch (e) {
                    console.error('WebSocket parse error', e);
                }
            };
        }

        connect();
        return () => {
            ws?.close();
            clearTimeout(retryTimeout);
        };
    }, []);

    const filteredAgents = agents.filter((a) => {
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.environment.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || a.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const activeAgents = agents.filter((a) => a.status === 'active');
    const processingAgents = agents.filter((a) => a.status === 'processing');
    const totalCpu = agents.reduce((sum, a) => sum + a.cpu, 0);
    const totalMemory = agents.reduce((sum, a) => sum + a.memory, 0);

    async function handleKillAgent(pid: number) {
        try {
            await fetch(`http://localhost:3001/api/agents/${pid}/kill`, { method: 'POST' });
            setSelectedAgent(null);
        } catch (e) {
            console.error('Failed to kill agent', e);
        }
    }

    return (
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Hexagon className="w-7 h-7 text-red-500" />
                        蜂群总览
                    </h1>
                    <p className="text-white/40 text-sm mt-1">全局 Agent 运行情况实时监控</p>
                </div>
                <Badge
                    variant="outline"
                    className={
                        isConnected
                            ? 'text-green-400 border-green-400/30 bg-green-500/5'
                            : 'text-yellow-400 border-yellow-400/30 bg-yellow-500/5'
                    }
                >
                    <span
                        className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                            }`}
                    />
                    {isConnected ? '守护进程已连接' : '连接中...'}
                </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="在线 Agents"
                    value={agents.length}
                    icon={<Bug className="w-5 h-5 text-red-500" />}
                    color="red"
                />
                <StatCard
                    title="活跃"
                    value={activeAgents.length}
                    icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
                    color="green"
                />
                <StatCard
                    title="处理中"
                    value={processingAgents.length}
                    icon={<Activity className="w-5 h-5 text-amber-500" />}
                    color="amber"
                />
                <StatCard
                    title="总 CPU"
                    value={`${totalCpu.toFixed(1)}%`}
                    icon={<Cpu className="w-5 h-5 text-blue-400" />}
                    color="blue"
                />
                <StatCard
                    title="总内存"
                    value={`${totalMemory.toFixed(0)} MB`}
                    icon={<HardDrive className="w-5 h-5 text-purple-400" />}
                    color="purple"
                />
            </div>

            {/* Systems Quick View */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <Server className="w-5 h-5 text-white/40" />
                <div className="flex-1">
                    <span className="text-sm text-white/60">接入系统:</span>
                    <span className="ml-2 text-sm text-white font-medium">本地系统 (当前机器)</span>
                </div>
                <Link
                    to="/dashboard/systems"
                    className="text-sm text-red-500 hover:text-red-400 transition-colors"
                >
                    管理系统 →
                </Link>
            </div>

            {/* Agent Table */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Agent 列表</h2>
                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1.5 border border-white/10 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grouped')}
                                className={`p-1.5 rounded transition-all ${
                                    viewMode === 'grouped'
                                        ? 'bg-red-500/10 text-red-400'
                                        : 'text-white/40 hover:text-white/60'
                                }`}
                                title="分组视图"
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-red-500/10 text-red-400'
                                        : 'text-white/40 hover:text-white/60'
                                }`}
                                title="表格视图"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Type Filter */}
                        <div className="flex items-center gap-1.5">
                            <Filter className="w-4 h-4 text-white/30" />
                            {['all', 'CLI', 'Local-LLM'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTypeFilter(t)}
                                    className={`px-2.5 py-1 rounded-md text-xs transition-all ${typeFilter === t
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        : 'text-white/40 hover:text-white/60 border border-transparent'
                                        }`}
                                >
                                    {t === 'all' ? '全部' : t}
                                </button>
                            ))}
                        </div>
                        {/* Search */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/30 w-48"
                                placeholder="搜索 Agent..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                {filteredAgents.length === 0 ? (
                    <div className="text-center py-16 bg-white/[0.02] border border-white/5 border-dashed rounded-xl">
                        <AlertTriangle className="w-10 h-10 text-white/20 mx-auto mb-3" />
                        <p className="text-white/40">
                            {isConnected
                                ? agents.length === 0
                                    ? '暂未检测到活跃的 Agent。请尝试运行 Ollama、Claude CLI 等。'
                                    : '没有匹配的 Agent。'
                                : '正在连接本地守护进程...'}
                        </p>
                    </div>
                ) : viewMode === 'grouped' ? (
                    // 分组视图
                    <GroupedAgentView
                        agents={filteredAgents}
                        onAgentClick={setSelectedAgent}
                        selectedAgent={selectedAgent}
                    />
                ) : (
                    // 表格视图（原有的）
                    <div className="rounded-xl border border-white/5 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/[0.03] text-white/50 text-sm">
                                    <th className="text-left py-3 px-4 font-medium">名称</th>
                                    <th className="text-left py-3 px-4 font-medium">类型</th>
                                    <th className="text-left py-3 px-4 font-medium">状态</th>
                                    <th className="text-left py-3 px-4 font-medium">当前任务</th>
                                    <th className="text-left py-3 px-4 font-medium">环境</th>
                                    <th className="text-right py-3 px-4 font-medium">CPU</th>
                                    <th className="text-right py-3 px-4 font-medium">内存</th>
                                    <th className="text-right py-3 px-4 font-medium">PID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredAgents.map((agent) => (
                                    <tr
                                        key={agent.id}
                                        className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${selectedAgent?.id === agent.id ? 'bg-red-500/5' : ''
                                            }`}
                                        onClick={() => setSelectedAgent(agent)}
                                    >
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`w-2 h-2 rounded-full shrink-0 ${agent.status === 'processing'
                                                        ? 'bg-red-500 animate-pulse'
                                                        : agent.status === 'active'
                                                            ? 'bg-green-500'
                                                            : 'bg-gray-500'
                                                        }`}
                                                />
                                                <span className="text-white font-medium text-sm">
                                                    {agent.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    agent.type === 'Local-LLM'
                                                        ? 'text-purple-400 border-purple-400/30 text-xs'
                                                        : 'text-blue-400 border-blue-400/30 text-xs'
                                                }
                                            >
                                                {agent.type}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge
                                                className={`text-xs ${agent.status === 'processing'
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    : agent.status === 'active'
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                    }`}
                                                variant="outline"
                                            >
                                                {agent.status}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 max-w-xs">
                                            <div className="text-sm text-white/60 truncate" title={agent.currentTask || '—'}>
                                                {agent.currentTask || '—'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-white/50">{agent.environment}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-sm text-white/70 font-mono">{agent.cpu}%</span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-sm text-white/70 font-mono">
                                                {agent.memory} MB
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-sm text-white/40 font-mono">
                                                {agent.pid ?? '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Agent Detail Panel (Slide-over) */}
            {selectedAgent && (
                <div className="fixed inset-y-0 right-0 w-[400px] bg-[#0d0d0d] border-l border-white/5 z-50 shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-white/5">
                        <h3 className="text-lg font-semibold text-white">Agent 详情</h3>
                        <button
                            onClick={() => setSelectedAgent(null)}
                            className="text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        {/* Name & Status */}
                        <div className="flex items-center gap-3">
                            <span
                                className={`w-3 h-3 rounded-full ${selectedAgent.status === 'processing'
                                    ? 'bg-red-500 animate-pulse'
                                    : selectedAgent.status === 'active'
                                        ? 'bg-green-500'
                                        : 'bg-gray-500'
                                    }`}
                            />
                            <span className="text-xl font-bold text-white">{selectedAgent.name}</span>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <InfoCell label="类型" value={selectedAgent.type} />
                            <InfoCell label="状态" value={selectedAgent.status} />
                            <InfoCell label="环境" value={selectedAgent.environment} />
                            <InfoCell label="PID" value={String(selectedAgent.pid ?? '—')} />
                            <InfoCell label="CPU" value={`${selectedAgent.cpu}%`} />
                            <InfoCell label="内存" value={`${selectedAgent.memory} MB`} />
                        </div>

                        {/* Claude CLI Task Details */}
                        {selectedAgent.currentTask && (
                            <div className="space-y-3">
                                <div className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                                    任务信息
                                </div>

                                {/* Current Task */}
                                <div className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
                                    <div className="text-[11px] text-white/30 mb-1.5">当前任务</div>
                                    <div className="text-sm text-white leading-relaxed">
                                        {selectedAgent.currentTask}
                                    </div>
                                </div>

                                {/* Project Path */}
                                {selectedAgent.project && (
                                    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
                                        <div className="text-[11px] text-white/30 mb-1.5">工作目录</div>
                                        <div className="text-xs text-white/70 font-mono break-all">
                                            {selectedAgent.project}
                                        </div>
                                    </div>
                                )}

                                {/* Session ID */}
                                {selectedAgent.sessionId && (
                                    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
                                        <div className="text-[11px] text-white/30 mb-1.5">会话 ID</div>
                                        <div className="text-xs text-white/40 font-mono break-all">
                                            {selectedAgent.sessionId}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Task List */}
                        {selectedAgent.tasks && selectedAgent.tasks.length > 0 && (
                            <div className="space-y-3">
                                {/* Task Statistics */}
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                                        任务列表 ({selectedAgent.tasks.length})
                                    </div>
                                    <div className="flex gap-2">
                                        {(() => {
                                            const pending = selectedAgent.tasks.filter(t => t.status === 'pending').length;
                                            const inProgress = selectedAgent.tasks.filter(t => t.status === 'in_progress').length;
                                            const completed = selectedAgent.tasks.filter(t => t.status === 'completed').length;
                                            return (
                                                <>
                                                    {completed > 0 && (
                                                        <span className="text-[10px] text-green-400">
                                                            ✓ {completed}
                                                        </span>
                                                    )}
                                                    {inProgress > 0 && (
                                                        <span className="text-[10px] text-blue-400">
                                                            ⟳ {inProgress}
                                                        </span>
                                                    )}
                                                    {pending > 0 && (
                                                        <span className="text-[10px] text-white/40">
                                                            ○ {pending}
                                                        </span>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    {selectedAgent.tasks.map((task) => {
                                        const isExpanded = expandedTaskId === task.taskId;
                                        return (
                                            <div
                                                key={task.taskId}
                                                className="bg-white/[0.02] rounded-lg border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                                                onClick={() => setExpandedTaskId(isExpanded ? null : task.taskId)}
                                            >
                                                <div className="p-3">
                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                        <div className="text-sm text-white font-medium flex-1">
                                                            {task.subject}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] shrink-0 ${
                                                                task.status === 'completed'
                                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                                    : task.status === 'in_progress'
                                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                    : 'bg-white/5 text-white/40 border-white/10'
                                                            }`}
                                                        >
                                                            {task.status === 'completed'
                                                                ? '✓ 完成'
                                                                : task.status === 'in_progress'
                                                                ? '⟳ 进行中'
                                                                : '○ 待处理'}
                                                        </Badge>
                                                    </div>

                                                    {task.description && (
                                                        <div className={`text-xs text-white/50 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                            {task.description}
                                                        </div>
                                                    )}

                                                    {task.activeForm && task.status === 'in_progress' && (
                                                        <div className="text-xs text-blue-400/70 mt-1.5 italic flex items-center gap-1">
                                                            <span className="inline-block w-1 h-1 rounded-full bg-blue-400 animate-pulse"></span>
                                                            {task.activeForm}
                                                        </div>
                                                    )}

                                                    {/* Expand indicator */}
                                                    {task.description && (
                                                        <div className="text-[10px] text-white/30 mt-2 flex items-center gap-1">
                                                            <span>{isExpanded ? '收起' : '展开详情'}</span>
                                                            <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                                ▼
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* CPU Bar */}
                        <div>
                            <div className="flex justify-between text-xs text-white/40 mb-1">
                                <span>CPU 使用率</span>
                                <span>{selectedAgent.cpu}%</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(selectedAgent.cpu, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Memory Bar */}
                        <div>
                            <div className="flex justify-between text-xs text-white/40 mb-1">
                                <span>内存占用</span>
                                <span>{selectedAgent.memory} MB</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(selectedAgent.memory / 20, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    {selectedAgent.pid && (
                        <div className="p-5 border-t border-white/5">
                            <Button
                                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 gap-2"
                                variant="outline"
                                onClick={() => handleKillAgent(selectedAgent.pid!)}
                            >
                                <StopCircle className="w-4 h-4" />
                                停止此 Agent
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
    color,
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
}) {
    const bgColors: Record<string, string> = {
        red: 'from-red-500/10 to-transparent border-red-500/10',
        green: 'from-green-500/10 to-transparent border-green-500/10',
        amber: 'from-amber-500/10 to-transparent border-amber-500/10',
        blue: 'from-blue-500/10 to-transparent border-blue-500/10',
        purple: 'from-purple-500/10 to-transparent border-purple-500/10',
    };

    return (
        <div
            className={`rounded-xl bg-gradient-to-br ${bgColors[color]} border p-4 transition-all hover:-translate-y-0.5`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40">{title}</span>
                {icon}
            </div>
            <div className="text-2xl font-bold text-white font-mono">{value}</div>
        </div>
    );
}

function InfoCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
            <div className="text-[11px] text-white/30 mb-1">{label}</div>
            <div className="text-sm text-white font-medium font-mono">{value}</div>
        </div>
    );
}


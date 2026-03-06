import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, AlertTriangle, Activity, CheckCircle2 } from 'lucide-react';

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

interface GroupedAgentViewProps {
    agents: LocalAgent[];
    onAgentClick: (agent: LocalAgent) => void;
    selectedAgent: LocalAgent | null;
}

type AgentGroup = {
    title: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    agents: LocalAgent[];
    defaultExpanded: boolean;
};

export function GroupedAgentView({ agents, onAgentClick, selectedAgent }: GroupedAgentViewProps) {
    // Group agents by status with priority
    const errorAgents = agents.filter(a => a.status === 'error');
    const processingAgents = agents.filter(a => a.status === 'processing');
    const activeAgents = agents.filter(a => a.status === 'active' && a.currentTask);
    const idleAgents = agents.filter(a => a.status === 'active' && !a.currentTask);

    const groups: AgentGroup[] = [
        {
            title: '有问题',
            icon: <AlertTriangle className="w-4 h-4" />,
            color: 'text-red-400',
            bgColor: 'bg-red-500/10',
            agents: errorAgents,
            defaultExpanded: true,
        },
        {
            title: '处理中',
            icon: <Activity className="w-4 h-4" />,
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
            agents: processingAgents,
            defaultExpanded: true,
        },
        {
            title: '活跃',
            icon: <CheckCircle2 className="w-4 h-4" />,
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            agents: activeAgents,
            defaultExpanded: true,
        },
        {
            title: '空闲',
            icon: <CheckCircle2 className="w-4 h-4" />,
            color: 'text-gray-400',
            bgColor: 'bg-gray-500/10',
            agents: idleAgents,
            defaultExpanded: false, // 默认折叠空闲的
        },
    ];

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(groups.filter(g => g.defaultExpanded).map(g => g.title))
    );

    const toggleGroup = (groupTitle: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupTitle)) {
                newSet.delete(groupTitle);
            } else {
                newSet.add(groupTitle);
            }
            return newSet;
        });
    };

    return (
        <div className="space-y-3">
            {groups.map(group => {
                if (group.agents.length === 0) return null;

                const isExpanded = expandedGroups.has(group.title);

                return (
                    <div
                        key={group.title}
                        className="rounded-xl border border-white/5 overflow-hidden"
                    >
                        {/* Group Header */}
                        <div
                            className={`flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors ${group.bgColor}`}
                            onClick={() => toggleGroup(group.title)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={group.color}>
                                    {isExpanded ? (
                                        <ChevronDown className="w-5 h-5" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5" />
                                    )}
                                </div>
                                <div className={`flex items-center gap-2 ${group.color}`}>
                                    {group.icon}
                                    <span className="font-semibold text-white">
                                        {group.title}
                                    </span>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={`${group.color} border-current/30`}
                                >
                                    {group.agents.length}
                                </Badge>
                            </div>

                            {/* Group Stats */}
                            <div className="flex items-center gap-4 text-sm text-white/50">
                                <span>
                                    CPU: {group.agents.reduce((sum, a) => sum + a.cpu, 0).toFixed(1)}%
                                </span>
                                <span>
                                    内存: {group.agents.reduce((sum, a) => sum + a.memory, 0).toFixed(0)} MB
                                </span>
                            </div>
                        </div>

                        {/* Group Content */}
                        {isExpanded && (
                            <div className="divide-y divide-white/5">
                                {group.agents.map(agent => (
                                    <div
                                        key={agent.id}
                                        className={`p-4 hover:bg-white/[0.02] transition-colors cursor-pointer ${
                                            selectedAgent?.id === agent.id ? 'bg-red-500/5' : ''
                                        }`}
                                        onClick={() => onAgentClick(agent)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            {/* Agent Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span
                                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                                            agent.status === 'processing'
                                                                ? 'bg-orange-500 animate-pulse'
                                                                : agent.status === 'active'
                                                                ? 'bg-green-500'
                                                                : agent.status === 'error'
                                                                ? 'bg-red-500'
                                                                : 'bg-gray-500'
                                                        }`}
                                                    />
                                                    <span className="text-white font-medium">
                                                        {agent.name}
                                                    </span>
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
                                                    {agent.pid && (
                                                        <span className="text-xs text-white/30 font-mono">
                                                            PID: {agent.pid}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Current Task */}
                                                {agent.currentTask && (
                                                    <div className="text-sm text-white/60 truncate mb-1">
                                                        📋 {agent.currentTask}
                                                    </div>
                                                )}

                                                {/* Project Path */}
                                                {agent.project && (
                                                    <div className="text-xs text-white/40 font-mono truncate">
                                                        📁 {agent.project}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Metrics */}
                                            <div className="flex items-center gap-4 text-sm shrink-0">
                                                <div className="text-right">
                                                    <div className="text-white/40 text-xs mb-1">CPU</div>
                                                    <div className="text-white font-mono">{agent.cpu}%</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-white/40 text-xs mb-1">内存</div>
                                                    <div className="text-white font-mono">
                                                        {agent.memory} MB
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-white/40 text-xs mb-1">环境</div>
                                                    <div className="text-white/60 text-xs">
                                                        {agent.environment}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Task Summary */}
                                        {agent.tasks && agent.tasks.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                <div className="flex items-center gap-4 text-xs">
                                                    <span className="text-white/40">
                                                        任务统计:
                                                    </span>
                                                    {agent.tasks.filter(t => t.status === 'completed').length > 0 && (
                                                        <span className="text-green-400">
                                                            ✓ {agent.tasks.filter(t => t.status === 'completed').length}
                                                        </span>
                                                    )}
                                                    {agent.tasks.filter(t => t.status === 'in_progress').length > 0 && (
                                                        <span className="text-blue-400">
                                                            ⟳ {agent.tasks.filter(t => t.status === 'in_progress').length}
                                                        </span>
                                                    )}
                                                    {agent.tasks.filter(t => t.status === 'pending').length > 0 && (
                                                        <span className="text-white/40">
                                                            ○ {agent.tasks.filter(t => t.status === 'pending').length}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

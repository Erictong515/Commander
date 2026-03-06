import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Cpu, HardDrive } from 'lucide-react';

interface LocalAgent {
    id: string;
    name: string;
    type: 'CLI' | 'Local-LLM';
    status: 'active' | 'processing' | 'idle';
    cpu: number;
    memory: number;
    environment: string;
}

export function LocalAgentsDashboard() {
    const [agents, setAgents] = useState<LocalAgent[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:3001');

        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'AGENTS_UPDATE') {
                    setAgents(message.data);
                }
            } catch (e) {
                console.error('Failed to parse websocket message', e);
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    if (!isConnected && agents.length === 0) {
        return null;
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-8 relative z-20">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Activity className="text-red-500" />
                    运行中的本地 Agents
                </h2>
                <Badge variant="outline" className={isConnected ? "text-green-400 border-green-400/30" : "text-yellow-400 border-yellow-400/30"}>
                    {isConnected ? '已连接本地守护进程' : '守护进程断开'}
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                    <Card key={agent.id} className="bg-white/5 border-white/10 hover:border-red-500/30 transition-all">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg text-white font-medium">{agent.name}</CardTitle>
                                <Badge
                                    className={
                                        agent.status === 'processing' ? 'bg-red-500 hover:bg-red-600 animate-pulse' :
                                            agent.status === 'active' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500'
                                    }
                                >
                                    {agent.status}
                                </Badge>
                            </div>
                            <div className="text-sm text-white/50">{agent.environment} • {agent.type}</div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 mt-2">
                                <div className="flex items-center gap-1.5 text-white/70 bg-black/40 px-2.5 py-1 rounded-md text-sm">
                                    <Cpu className="w-4 h-4 text-red-400" />
                                    <span>{agent.cpu}%</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-white/70 bg-black/40 px-2.5 py-1 rounded-md text-sm">
                                    <HardDrive className="w-4 h-4 text-blue-400" />
                                    <span>{agent.memory} MB</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {agents.length === 0 && isConnected && (
                    <div className="col-span-full py-12 text-center text-white/50 bg-white/5 rounded-xl border border-white/5 border-dashed">
                        没有检测到活跃的本地 Agent。请尝试运行 Ollama 或 Claude CLI。
                    </div>
                )}
            </div>
        </div>
    );
}

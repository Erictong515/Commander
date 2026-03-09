// src/pages/dashboard/TopologyPage.tsx
import { useEffect, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    MarkerType,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';

interface LocalAgent {
    id: string;
    name: string;
    status: 'active' | 'processing' | 'idle' | 'error';
    cpu: number;
    memory: number;
    pid?: number;
    currentTask?: string;
}

const STATUS_COLORS: Record<string, string> = {
    processing: '#f97316',
    active: '#22c55e',
    idle: '#6b7280',
    error: '#ef4444',
};

const COMMANDER_NODE_ID = 'commander-hub';

function buildLayout(agents: LocalAgent[], handoffEdges: Edge[]) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 });

    g.setNode(COMMANDER_NODE_ID, { width: 160, height: 60 });

    for (const agent of agents) {
        g.setNode(agent.id, { width: 160, height: 60 });
        g.setEdge(agent.id, COMMANDER_NODE_ID);
    }

    for (const edge of handoffEdges) {
        if (edge.source !== COMMANDER_NODE_ID && edge.target !== COMMANDER_NODE_ID) {
            g.setEdge(edge.source, edge.target);
        }
    }

    dagre.layout(g);

    const nodes: Node[] = [
        {
            id: COMMANDER_NODE_ID,
            position: { x: g.node(COMMANDER_NODE_ID).x - 80, y: g.node(COMMANDER_NODE_ID).y - 30 },
            data: { label: '⬡ Commander Hub' },
            style: {
                background: '#1a1a1a',
                border: '2px solid #ef4444',
                borderRadius: 12,
                color: '#fff',
                fontWeight: 700,
                width: 160,
                textAlign: 'center' as const,
            },
        },
        ...agents.map(agent => ({
            id: agent.id,
            position: { x: g.node(agent.id).x - 80, y: g.node(agent.id).y - 30 },
            data: {
                label: `${agent.name}\nCPU ${agent.cpu}% · ${agent.memory}MB`,
            },
            style: {
                background: '#111',
                border: `2px solid ${STATUS_COLORS[agent.status] ?? '#6b7280'}`,
                borderRadius: 8,
                color: '#fff',
                width: 160,
                fontSize: 12,
                whiteSpace: 'pre-line' as const,
                boxShadow: agent.status === 'processing' ? `0 0 12px ${STATUS_COLORS.processing}60` : undefined,
            },
        })),
    ];

    const edges: Edge[] = [
        ...agents.map(agent => ({
            id: `e-${agent.id}-hub`,
            source: agent.id,
            target: COMMANDER_NODE_ID,
            style: { stroke: '#ffffff15' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff20' },
        })),
        ...handoffEdges,
    ];

    return { nodes, edges };
}

export function TopologyPage() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [agents, setAgents] = useState<LocalAgent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [handoffEdges, setHandoffEdges] = useState<Edge[]>([]);

    useEffect(() => {
        fetch('http://localhost:3001/api/handoffs?limit=20')
            .then(r => r.json())
            .then(data => {
                const hEdges: Edge[] = ((data.handoffs ?? []) as Array<{ id: string; fromAgentId: string; toAgentId: string; reason?: string }>).map(h => ({
                    id: `handoff-${h.id}`,
                    source: h.fromAgentId,
                    target: h.toAgentId,
                    animated: true,
                    style: { stroke: '#f97316', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' },
                    label: h.reason ?? 'handoff',
                }));
                setHandoffEdges(hEdges);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        let ws: WebSocket;
        let retry: ReturnType<typeof setTimeout>;

        function connect() {
            ws = new WebSocket('ws://localhost:3001');
            ws.onopen = () => setIsConnected(true);
            ws.onclose = () => {
                setIsConnected(false);
                retry = setTimeout(connect, 3000);
            };
            ws.onmessage = e => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.type === 'AGENTS_UPDATE') setAgents(msg.data);
                } catch { /* ignore */ }
            };
        }
        connect();
        return () => { ws?.close(); clearTimeout(retry); };
    }, []);

    useEffect(() => {
        if (agents.length === 0) return;
        const { nodes: n, edges: e } = buildLayout(agents, handoffEdges);
        setNodes(n);
        setEdges(e);
    }, [agents, handoffEdges]);

    return (
        <div className="h-screen w-full bg-[#0a0a0a] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white">蜂群拓扑图</h1>
                    <p className="text-white/40 text-sm mt-0.5">{agents.length} 个 Agent 在线</p>
                </div>
                <div className={`flex items-center gap-2 text-sm ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                    {isConnected ? '实时连接' : '重连中...'}
                </div>
            </div>

            <div className="flex items-center gap-6 px-6 py-2 border-b border-white/5 shrink-0">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <div key={status} className="flex items-center gap-1.5 text-xs text-white/50">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        {status === 'processing' ? '处理中' : status === 'active' ? '活跃' : status === 'idle' ? '空闲' : '异常'}
                    </div>
                ))}
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                    <span className="w-4 h-0.5 bg-orange-500" />
                    任务交接
                </div>
            </div>

            <div className="flex-1">
                {agents.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-white/30">等待 Agent 连接...</p>
                    </div>
                ) : (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        colorMode="dark"
                    >
                        <Background color="#ffffff08" gap={24} />
                        <Controls />
                        <MiniMap
                            nodeColor={node => {
                                if (node.id === COMMANDER_NODE_ID) return '#ef4444';
                                const agent = agents.find(a => a.id === node.id);
                                return STATUS_COLORS[agent?.status ?? 'idle'] ?? '#6b7280';
                            }}
                            style={{ background: '#0d0d0d', border: '1px solid #ffffff10' }}
                        />
                    </ReactFlow>
                )}
            </div>
        </div>
    );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Server,
    Monitor,
    Plus,
    Trash2,
    CheckCircle2,
    XCircle,
    Wifi,
    Globe,
    HardDrive,
} from 'lucide-react';

interface SystemSource {
    id: string;
    name: string;
    type: 'local' | 'lan' | 'remote' | 'cloud';
    host: string;
    status: 'online' | 'offline' | 'warning';
    agentCount: number;
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    local: { label: '本地系统', icon: <Monitor className="w-4 h-4" />, color: 'text-green-400 border-green-400/30' },
    lan: { label: '局域网', icon: <Wifi className="w-4 h-4" />, color: 'text-blue-400 border-blue-400/30' },
    remote: { label: '远程服务器', icon: <Server className="w-4 h-4" />, color: 'text-purple-400 border-purple-400/30' },
    cloud: { label: '云端 API', icon: <Globe className="w-4 h-4" />, color: 'text-amber-400 border-amber-400/30' },
};

export function SystemsPage() {
    const [systems, setSystems] = useState<SystemSource[]>([
        {
            id: 'local-1',
            name: '当前机器',
            type: 'local',
            host: 'localhost',
            status: 'online',
            agentCount: 0,
        },
    ]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSystem, setNewSystem] = useState({
        name: '',
        type: 'lan' as 'lan' | 'remote' | 'cloud',
        host: '',
    });

    function handleAddSystem() {
        if (!newSystem.name || !newSystem.host) return;
        setSystems((prev) => [
            ...prev,
            {
                id: `sys-${Date.now()}`,
                name: newSystem.name,
                type: newSystem.type,
                host: newSystem.host,
                status: 'offline',
                agentCount: 0,
            },
        ]);
        setNewSystem({ name: '', type: 'lan', host: '' });
        setShowAddForm(false);
    }

    function handleRemoveSystem(id: string) {
        setSystems((prev) => prev.filter((s) => s.id !== id));
    }

    return (
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Server className="w-7 h-7 text-red-500" />
                        系统管理
                    </h1>
                    <p className="text-white/40 text-sm mt-1">管理已接入的系统和运行环境</p>
                </div>
                <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-red-500 hover:bg-red-600 text-white gap-2"
                >
                    <Plus className="w-4 h-4" />
                    接入新系统
                </Button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <Card className="bg-white/[0.03] border-red-500/20">
                    <CardHeader>
                        <CardTitle className="text-white text-base">接入新系统</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-white/50 mb-1.5">系统名称</label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50 transition-colors"
                                    placeholder="例如: 开发服务器"
                                    value={newSystem.name}
                                    onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/50 mb-1.5">类型</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
                                    value={newSystem.type}
                                    onChange={(e) =>
                                        setNewSystem({
                                            ...newSystem,
                                            type: e.target.value as 'lan' | 'remote' | 'cloud',
                                        })
                                    }
                                >
                                    <option value="lan">局域网设备</option>
                                    <option value="remote">远程服务器</option>
                                    <option value="cloud">云端 API</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-white/50 mb-1.5">地址</label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50 transition-colors"
                                    placeholder="例如: 192.168.1.50"
                                    value={newSystem.host}
                                    onChange={(e) => setNewSystem({ ...newSystem, host: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                className="border-white/10 text-white/60 hover:text-white"
                                onClick={() => setShowAddForm(false)}
                            >
                                取消
                            </Button>
                            <Button
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={handleAddSystem}
                            >
                                添加系统
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Systems Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systems.map((system) => {
                    const meta = TYPE_LABELS[system.type];
                    return (
                        <Card
                            key={system.id}
                            className={`bg-white/[0.02] border-white/5 hover:border-white/10 transition-all group ${system.status === 'online' ? 'hover:border-green-500/30' : ''
                                }`}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${system.status === 'online' ? 'bg-green-500/10' : 'bg-white/5'
                                                }`}
                                        >
                                            <HardDrive
                                                className={`w-5 h-5 ${system.status === 'online' ? 'text-green-500' : 'text-white/30'
                                                    }`}
                                            />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white text-base">{system.name}</CardTitle>
                                            <p className="text-xs text-white/40 font-mono mt-0.5">{system.host}</p>
                                        </div>
                                    </div>
                                    {system.type !== 'local' && (
                                        <button
                                            onClick={() => handleRemoveSystem(system.id)}
                                            className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className={`text-xs ${meta.color}`}>
                                        <span className="mr-1">{meta.icon}</span>
                                        {meta.label}
                                    </Badge>
                                    <div className="flex items-center gap-1.5 text-sm">
                                        {system.status === 'online' ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-white/30" />
                                        )}
                                        <span
                                            className={
                                                system.status === 'online' ? 'text-green-400' : 'text-white/30'
                                            }
                                        >
                                            {system.status === 'online' ? '在线' : '离线'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

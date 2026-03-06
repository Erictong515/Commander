import { useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsPage() {
    const [processWhitelist, setProcessWhitelist] = useState(
        'claude, codex, gcloud, google, ollama'
    );
    const [pollInterval, setPollInterval] = useState('2000');
    const [saved, setSaved] = useState(false);

    function handleSave() {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    return (
        <div className="p-6 lg:p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Settings className="w-7 h-7 text-red-500" />
                    设置
                </h1>
                <p className="text-white/40 text-sm mt-1">配置 Agent 监控策略与守护进程参数</p>
            </div>

            <Card className="bg-white/[0.02] border-white/5">
                <CardHeader>
                    <CardTitle className="text-white text-base">Agent 白名单</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-white/40">
                        定义需要监控的进程名称（逗号分隔）。守护进程会在系统进程表中匹配这些名称。
                    </p>
                    <input
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-red-500/50 transition-colors"
                        value={processWhitelist}
                        onChange={(e) => setProcessWhitelist(e.target.value)}
                    />
                </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/5">
                <CardHeader>
                    <CardTitle className="text-white text-base">轮询间隔</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-white/40">
                        守护进程扫描本地进程的间隔时间（毫秒）。更低的值带来更快的响应速度，但会消耗更多 CPU。
                    </p>
                    <input
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-red-500/50 transition-colors max-w-xs"
                        type="number"
                        value={pollInterval}
                        onChange={(e) => setPollInterval(e.target.value)}
                    />
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    className="bg-red-500 hover:bg-red-600 text-white gap-2"
                    onClick={handleSave}
                >
                    <Save className="w-4 h-4" />
                    {saved ? '已保存 ✓' : '保存设置'}
                </Button>
            </div>
        </div>
    );
}

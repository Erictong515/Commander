import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Hexagon, Lock, AlertCircle } from 'lucide-react';

export function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        setTimeout(() => {
            const success = login(username, password);
            setIsLoading(false);
            if (success) {
                navigate('/dashboard', { replace: true });
            } else {
                setError('用户名或密码错误');
            }
        }, 500);
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[200px]" />
            <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-red-500/3 rounded-full blur-[150px]" />

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <Hexagon className="w-10 h-10 text-red-500" />
                        <span className="text-2xl font-bold text-white">
                            Agents<span className="text-red-500">Commander</span>
                        </span>
                    </div>
                    <p className="text-white/40 text-sm">登录指挥中枢</p>
                </div>

                {/* Login Card */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm text-white/50 mb-1.5">用户名</label>
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/50 transition-colors placeholder:text-white/20"
                                placeholder="admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-white/50 mb-1.5">密码</label>
                            <input
                                type="password"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/50 transition-colors placeholder:text-white/20"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-6 text-sm font-medium transition-all duration-300 hover:shadow-glow-red gap-2"
                        >
                            <Lock className="w-4 h-4" />
                            {isLoading ? '验证中...' : '登录'}
                        </Button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-white/5 text-center">
                        <p className="text-white/30 text-xs">默认账号: admin / admin123</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

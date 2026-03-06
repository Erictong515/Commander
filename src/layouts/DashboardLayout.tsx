import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Server,
    Bug,
    Settings,
    ChevronLeft,
    ChevronRight,
    Hexagon,
    LogOut,
} from 'lucide-react';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: '蜂群总览', end: true },
    { to: '/dashboard/systems', icon: Server, label: '系统管理', end: false },
    { to: '/dashboard/agents', icon: Bug, label: 'Agent 列表', end: false },
    { to: '/dashboard/settings', icon: Settings, label: '设置', end: false },
];

export function DashboardLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`relative flex flex-col border-r border-white/5 bg-[#0d0d0d] transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[240px]'
                    }`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5 shrink-0">
                    <Hexagon className="w-8 h-8 text-red-500 shrink-0" />
                    {!collapsed && (
                        <span className="text-lg font-bold whitespace-nowrap overflow-hidden">
                            Commander
                        </span>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.end
                            ? location.pathname === item.to
                            : location.pathname.startsWith(item.to);

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive
                                    ? 'bg-red-500/10 text-red-500'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon
                                    className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-red-500' : 'text-white/40 group-hover:text-white/70'
                                        }`}
                                />
                                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors z-10"
                >
                    {collapsed ? (
                        <ChevronRight className="w-3 h-3 text-white/60" />
                    ) : (
                        <ChevronLeft className="w-3 h-3 text-white/60" />
                    )}
                </button>

                {/* Footer */}
                <div className="px-3 py-3 border-t border-white/5 shrink-0 space-y-2">
                    {!collapsed && (
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-white/40 truncate">👤 {user}</span>
                            <span className="text-[10px] text-white/20">v0.1</span>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all"
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {!collapsed && <span>退出登录</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}

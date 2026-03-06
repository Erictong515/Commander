import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
    isAuthenticated: boolean;
    user: string | null;
    login: (username: string, password: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('commander_auth') === 'true';
    });
    const [user, setUser] = useState<string | null>(() => {
        return localStorage.getItem('commander_user');
    });

    function login(username: string, password: string): boolean {
        if (username === 'admin' && password === 'admin123') {
            setIsAuthenticated(true);
            setUser(username);
            localStorage.setItem('commander_auth', 'true');
            localStorage.setItem('commander_user', username);
            return true;
        }
        return false;
    }

    function logout() {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('commander_auth');
        localStorage.removeItem('commander_user');
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

export function RequireAuth({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) return null;
    return <>{children}</>;
}

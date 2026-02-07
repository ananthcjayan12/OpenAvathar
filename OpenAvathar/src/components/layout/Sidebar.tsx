import { NavLink } from 'react-router-dom';
import {
    Settings,
    Rocket,
    Wand2,
    ChevronRight,
    Github,
    LogOut,
    X
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { podId, clearAuth } = useAppStore();

    const navItems = [
        { path: '/setup', label: 'Setup', icon: <Settings size={18} /> },
        { path: '/deploy', label: 'GPU Pod', icon: <Rocket size={18} /> },
        {
            path: '/generate',
            label: 'Generator',
            icon: <Wand2 size={18} />,
            disabled: !podId
        },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`mobile-overlay ${isOpen ? 'active' : ''}`}
                onClick={onClose}
            />

            <aside className={`layout-sidebar ${isOpen ? 'mobile-open' : ''}`}>
                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    className="btn-icon mobile-only"
                    style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 101 }}
                >
                    <X size={20} />
                </button>

                {/* Logo */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '40px',
                    padding: '0 8px',
                    marginTop: '8px'
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 15px var(--accent-glow)'
                    }}>
                        <Wand2 size={20} color="white" />
                    </div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'white' }}>
                        Open<span className="text-gradient">Avathar</span>
                    </h2>
                </div>

                {/* Navigation */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.disabled ? '#' : item.path}
                            onClick={(e) => {
                                if (item.disabled) e.preventDefault();
                                else onClose?.();
                            }}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                                background: isActive && !item.disabled ? 'var(--accent)' : 'transparent',
                                color: isActive && !item.disabled ? 'white' : 'var(--text-secondary)',
                                fontWeight: isActive && !item.disabled ? 600 : 400,
                                cursor: item.disabled ? 'not-allowed' : 'pointer',
                                opacity: item.disabled ? 0.4 : 1,
                                boxShadow: isActive && !item.disabled ? '0 4px 12px var(--accent-glow)' : 'none',
                                border: isActive && !item.disabled ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
                            })}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {item.icon}
                                <span>{item.label}</span>
                            </div>
                            {!item.disabled && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom Section */}
                <div style={{
                    marginTop: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--border)'
                }}>
                    <a
                        href="https://github.com/OpenAvathar"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            borderRadius: '8px',
                            transition: 'background 0.2s'
                        }}
                        className="hover-bg"
                    >
                        <Github size={18} />
                        <span>Documentation</span>
                    </a>

                    <button
                        onClick={() => {
                            if (window.confirm('Sign out and clear session?')) {
                                clearAuth();
                                window.location.href = '/';
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--error)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            width: '100%',
                            textAlign: 'left',
                            transition: 'background 0.2s'
                        }}
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

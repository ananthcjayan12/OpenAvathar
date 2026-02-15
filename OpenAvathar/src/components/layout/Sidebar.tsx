import type { CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Settings,
    Rocket,
    Wand2,
    ChevronRight,
    LogOut,
    X,
    Film,
    BookOpen
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useJobQueue } from '@/stores/jobQueue';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { clearAuth, apiKey } = useAppStore();
    const pendingJobs = useJobQueue((state) =>
        Object.values(state.jobs).filter(
            (job) => job.status === 'queued' || job.status === 'uploading' || job.status === 'generating'
        ).length
    );

    const navItems = [
        { path: '/studio', label: 'Studio', icon: <Wand2 size={18} />, badge: pendingJobs > 0 ? pendingJobs : null },
        { path: '/videos', label: 'Videos', icon: <Film size={18} /> },
        { path: '/pods', label: 'Pods', icon: <Rocket size={18} /> },
    ];

    const getMainNavStyle = (isActive: boolean): CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        borderRadius: '10px',
        textDecoration: 'none',
        transition: 'all 0.2s',
        background: isActive ? 'var(--accent)' : 'transparent',
        color: isActive ? 'white' : 'var(--text-secondary)',
        fontWeight: isActive ? 600 : 500,
        cursor: 'pointer',
        boxShadow: isActive ? '0 4px 12px var(--accent-glow)' : 'none',
        border: isActive ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid transparent'
    });

    const getSubNavStyle = (isActive: boolean): CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        color: isActive ? 'white' : 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '0.9rem',
        borderRadius: '8px',
        transition: 'background 0.2s',
        background: isActive ? 'var(--accent)' : 'transparent'
    });

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
                    <img
                        src="/logo.png"
                        alt="Logo"
                        style={{
                            width: '32px',
                            height: '32px',
                            objectFit: 'contain'
                        }}
                    />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                        Open<span className="text-gradient">Avathar</span>
                    </h2>
                </div>

                {/* Navigation */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => onClose?.()}
                            style={({ isActive }) => getMainNavStyle(isActive)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {item.icon}
                                <span>{item.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {item.badge ? (
                                    <span
                                        style={{
                                            minWidth: '20px',
                                            height: '20px',
                                            padding: '0 6px',
                                            borderRadius: '999px',
                                            background: 'rgba(79, 70, 229, 0.12)',
                                            border: '1px solid rgba(79, 70, 229, 0.3)',
                                            color: '#4338ca',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        aria-label={`${item.badge} jobs queued or running`}
                                    >
                                        {item.badge}
                                    </span>
                                ) : null}
                                <ChevronRight size={14} style={{ opacity: 0.5 }} />
                            </div>
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
                    {!apiKey && (
                        <div
                            style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                background: 'rgba(245, 158, 11, 0.08)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.82rem',
                                lineHeight: 1.4
                            }}
                        >
                            RunPod API key missing. Add it when you click Generate in Studio.
                        </div>
                    )}

                    <NavLink
                        to="/settings"
                        onClick={() => onClose?.()}
                        style={({ isActive }) => getSubNavStyle(isActive)}
                        className="hover-bg"
                    >
                        <Settings size={18} />
                        <span>Settings</span>
                    </NavLink>

                    <NavLink
                        to="/docs"
                        onClick={() => onClose?.()}
                        style={({ isActive }) => getSubNavStyle(isActive)}
                        className="hover-bg"
                    >
                        <BookOpen size={18} />
                        <span>Docs</span>
                    </NavLink>

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

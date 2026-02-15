import { useState, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

interface MainLayoutProps {
    children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="layout-wrapper">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Mobile Header */}
            <div className="mobile-header">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="btn-icon"
                >
                    <Menu size={24} color="var(--text-primary)" />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/logo.png" alt="" style={{ width: '24px', height: '24px' }} />
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>OpenAvathar</span>
                </div>
                <div style={{ width: '24px' }}></div> {/* Spacer for centering */}
            </div>

            <main className="layout-main">
                {children}
            </main>
        </div>
    );
}

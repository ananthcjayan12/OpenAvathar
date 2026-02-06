import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface MainLayoutProps {
    children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <Sidebar />
            <main style={{
                flexGrow: 1,
                marginLeft: '260px',
                padding: '0',
                height: '100vh',
                overflowY: 'auto',
                position: 'relative'
            }}>
                {children}
            </main>
        </div>
    );
}

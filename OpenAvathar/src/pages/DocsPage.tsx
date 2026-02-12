import { ChevronRight, Rocket, Shield, Wand2, HelpCircle, AlertTriangle, BookOpen } from 'lucide-react';

export default function DocsPage() {
    const faqs = [
        {
            q: "How many pods can I run at once?",
            a: "This depends on your RunPod account balance and limits. OpenAvathar allows you to manage as many as you've deployed, but we recommend one 'Wan 2.2' and one 'InfiniteTalk' pod for optimal use."
        },
        {
            q: "Why is my video generation failing?",
            a: "The most common reason is the ComfyUI server still starting up. Check the Pod Dashboard to ensure your pod's status is 'running'. If it persists, check the 'Logs' on the pod detail page for specific error messages."
        },
        {
            q: "How much does it cost?",
            a: "OpenAvathar itself is free. You only pay for the GPU compute directly on RunPod. Typically, an RTX 3090 or RTX 4090 costs $0.35 - $0.75 per hour."
        },
        {
            q: "What is 'InfiniteTalk' mode?",
            a: "InfiniteTalk is a specialized workflow that synchronizes an image with an audio file to create a realistic talking head video. It's perfect for presentations and avatars."
        }
    ];

    const guides = [
        {
            title: "Setting Up Your API Key",
            description: "To get started, you need a RunPod API key. You can find this in your RunPod Settings -> API Keys.",
            icon: <Shield size={20} color="var(--accent)" />
        },
        {
            title: "Deploying Your First Pod",
            description: "Go to 'New Pod', select your preferred GPU and purpose, and click Deploy. Wait for the status to turn green.",
            icon: <Rocket size={20} color="var(--accent)" />
        },
        {
            title: "Generating Videos",
            description: "Upload an image, optionally add a prompt, and hit Generate. Videos typically take 2-5 minutes depending on the length.",
            icon: <Wand2 size={20} color="var(--accent)" />
        }
    ];

    return (
        <div className="container app-page" style={{ maxWidth: '1000px' }}>
            <header style={{ marginBottom: '60px' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '12px' }}>
                    OpenAvathar <span className="text-gradient">Documentation</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Everything you need to know about scaling your AI video production.
                </p>
            </header>

            <section style={{ marginBottom: '80px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BookOpen size={24} color="var(--accent)" /> Quick Start Guides
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    {guides.map((guide, i) => (
                        <div key={i} className="card glass" style={{ padding: '24px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                {guide.icon}
                            </div>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>{guide.title}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{guide.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ marginBottom: '80px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <HelpCircle size={24} color="var(--accent)" /> Frequently Asked Questions
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {faqs.map((faq, i) => (
                        <details key={i} className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                            <summary style={{
                                padding: '20px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                listStyle: 'none',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>{faq.q}</span>
                                <ChevronRight size={18} className="summary-icon" />
                            </summary>
                            <div style={{ padding: '0 20px 20px', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                {faq.a}
                            </div>
                        </details>
                    ))}
                </div>
                <style>{`
                    details[open] .summary-icon { transform: rotate(90deg); }
                    .summary-icon { transition: transform 0.2s; }
                    summary::-webkit-details-marker { display: none; }
                `}</style>
            </section>

            <div className="card glass" style={{ padding: '30px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px' }}>
                    <AlertTriangle size={24} color="#ef4444" />
                </div>
                <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#ef4444' }}>Important Billing Notice</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        Remember to <strong>terminate</strong> your pods in the Dashboard when you are done. Deleting them from the OpenAvathar dashboard will terminate them on RunPod, but we always recommend double-checking your RunPod console to avoid unexpected charges.
                    </p>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Key,
    ArrowRight,
    Check,
    ExternalLink,
    AlertTriangle,
    Play,
    Zap,
    Shield,
    Cpu,
    Sparkles,
    Video,
    CreditCard,
    Power
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

// --- Components ---

function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={scrolled ? 'glass' : ''}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                transition: 'all 0.3s ease',
                padding: scrolled ? '12px 0' : '24px 0',
                background: scrolled ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent'
            }}
        >
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'var(--gradient-primary)',
                        borderRadius: '8px',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'white'
                    }}>
                        <Sparkles size={18} fill="currentColor" />
                    </div>
                    OpenAvathar
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="hide-mobile">
                    <a href="#workflow" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>How it Works</a>
                    <a href="#features" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>Features</a>
                    <a href="#pricing" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>Pricing</a>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <a href="/studio" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem', textDecoration: 'none' }}>
                        Start Studio
                    </a>
                </div>
            </div>
        </motion.nav>
    );
}

function Hero() {
    return (
        <section style={{
            paddingTop: 'clamp(120px, 15vh, 160px)',
            paddingBottom: '80px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background blurred orbs */}
            <div style={{ position: 'absolute', top: '20%', left: '10%', width: '300px', height: '300px', background: 'var(--accent-start)', opacity: 0.1, filter: 'blur(80px)', borderRadius: '50%', zIndex: -1 }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'var(--accent-end)', opacity: 0.1, filter: 'blur(100px)', borderRadius: '50%', zIndex: -1 }} />

            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 16px',
                        background: 'rgba(79, 70, 229, 0.1)',
                        border: '1px solid rgba(79, 70, 229, 0.2)',
                        borderRadius: '999px',
                        color: 'var(--accent)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        marginBottom: '24px'
                    }}>
                        <Sparkles size={14} />
                        <span>The AI Avatar Studio for Professionals</span>
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        color: 'var(--text-primary)',
                        maxWidth: '900px',
                        margin: '0 auto 24px',
                        letterSpacing: '-0.03em'
                    }}>
                        Generate <span className="text-gradient">Human-Like</span> Talking Videos Without the Monthly Fees.
                    </h1>

                    <p style={{
                        fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                        color: 'var(--text-secondary)',
                        maxWidth: '680px',
                        margin: '0 auto 40px',
                        lineHeight: 1.6
                    }}>
                        Stop paying per minute. Use your own GPU infrastructure to generate unlimited studio-quality avatar videos. Secure, private, and 10x cheaper.
                    </p>

                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="/studio" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: '999px', textDecoration: 'none' }}>
                            Start Creating Now <ArrowRight size={20} />
                        </a>
                        <a href="#workflow" className="btn btn-secondary" style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: '999px', textDecoration: 'none' }}>
                            <Play size={20} style={{ marginRight: '8px' }} /> How it Works
                        </a>
                    </div>
                </motion.div>

                {/* Hero Visual */}
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    style={{ marginTop: '60px', position: 'relative' }}
                >
                    <div className="glass" style={{
                        borderRadius: '24px',
                        padding: '12px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                        maxWidth: '1000px',
                        margin: '0 auto'
                    }}>
                        <div style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: '16px',
                            aspectRatio: '16/9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                <Video size={64} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                                <div style={{ fontWeight: 600 }}>Interactive Studio Interface</div>
                            </div>

                            {/* Floating UI elements */}
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                style={{ position: 'absolute', top: '15%', left: '5%', padding: '10px 16px', background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Render Complete</span>
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, 10, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                style={{ position: 'absolute', bottom: '15%', right: '5%', padding: '10px 16px', background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Zap size={14} fill="#f59e0b" color="#f59e0b" />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>RTX 4090 Active</span>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

function Workflow() {
    const steps = [
        {
            icon: CreditCard,
            title: "Get API Key",
            desc: "Sign up at RunPod.io. Pay them directly for compute (approx $0.40/hr).",
            color: "#4f46e5",
            tag: "Step 1",
            offset: -40
        },
        {
            icon: Key,
            title: "Connect Studio",
            desc: "Paste your API key here. It stays secure in your browser. No middleman.",
            color: "#10b981",
            tag: "Step 2",
            offset: 40
        },
        {
            icon: Video,
            title: "Generate Unlimited",
            desc: "Create studio-quality videos. We charge $0 markup on your generation time.",
            color: "#f59e0b",
            tag: "Step 3",
            offset: -40
        },
        {
            icon: Power,
            title: "Terminate & Save",
            desc: "Turn off your pod when done to stop the billing. Only pay for active compute.",
            color: "#ef4444",
            tag: "Step 4",
            offset: 40
        }
    ];

    return (
        <section id="workflow" style={{
            padding: '140px 0',
            background: 'var(--bg-secondary)',
            overflow: 'hidden',
            position: 'relative',
            backgroundSize: '20px 20px',
            backgroundImage: 'radial-gradient(var(--border) 1px, transparent 0)',
        }}>
            {/* Decorative background element */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120%',
                height: '400px',
                background: 'radial-gradient(circle at center, rgba(79, 70, 229, 0.03) 0%, transparent 70%)',
                zIndex: 0
            }} />

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <header style={{ textAlign: 'center', marginBottom: '100px' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, marginBottom: '20px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                            Your Path to <span className="text-gradient">Freedom</span>
                        </h2>
                        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                            A simplified, high-performance workflow designed for maximum efficiency.
                        </p>
                    </motion.div>
                </header>

                <div style={{
                    position: 'relative',
                    padding: '60px 0',
                    maxWidth: '1100px',
                    margin: '0 auto'
                }}>
                    {/* The Horizontal Zigzag SVG Line (Desktop Only) */}
                    <svg
                        className="hide-mobile"
                        viewBox="0 0 1100 200"
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            width: '100%',
                            height: '200px',
                            transform: 'translateY(-50%)',
                            zIndex: 0,
                            pointerEvents: 'none'
                        }}
                    >
                        <motion.path
                            d="M 50 140 L 383 60 L 716 140 L 1050 60"
                            fill="none"
                            stroke="var(--border)"
                            strokeWidth="3"
                            strokeDasharray="12 8"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                        />
                        <motion.path
                            d="M 50 140 L 383 60 L 716 140 L 1050 60"
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="3"
                            initial={{ pathLength: 0, opacity: 0 }}
                            whileInView={{ pathLength: 1, opacity: 0.4 }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, ease: "easeInOut", delay: 0.5 }}
                        />
                    </svg>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '24px',
                        position: 'relative',
                        zIndex: 2
                    }} className="workflow-grid">
                        {steps.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: i % 2 === 0 ? 40 : -40 }}
                                whileInView={{ opacity: 1, y: step.offset }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.8, delay: i * 0.2, type: "spring", stiffness: 100 }}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                }}
                            >
                                {/* Node with Icon */}
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '24px',
                                        background: 'white',
                                        boxShadow: 'var(--shadow-lg)',
                                        border: '1px solid var(--border)',
                                        display: 'grid',
                                        placeItems: 'center',
                                        position: 'relative',
                                        marginBottom: '32px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '16px',
                                        background: `linear-gradient(135deg, ${step.color}22, ${step.color}44)`,
                                        display: 'grid',
                                        placeItems: 'center',
                                        color: step.color
                                    }}>
                                        <step.icon size={26} strokeWidth={2.5} />
                                    </div>

                                    {/* Small Number Badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '-10px',
                                        right: '-10px',
                                        width: '28px',
                                        height: '28px',
                                        background: 'var(--text-primary)',
                                        color: 'white',
                                        borderRadius: '50%',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        display: 'grid',
                                        placeItems: 'center',
                                        border: '4px solid var(--bg-secondary)'
                                    }}>
                                        {i + 1}
                                    </div>
                                </motion.div>

                                {/* Content Card */}
                                <div className="glass" style={{
                                    padding: '24px',
                                    borderRadius: '20px',
                                    textAlign: 'center',
                                    width: '100%',
                                    maxWidth: '300px',
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                                    transform: 'perspective(1000px) rotateX(2deg)',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        background: `${step.color}11`,
                                        color: step.color,
                                        borderRadius: '99px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '12px'
                                    }}>
                                        {step.tag}
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>{step.title}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .workflow-grid {
                        flex-direction: column !important;
                        gap: 60px !important;
                    }
                    .workflow-grid > div {
                        transform: none !important;
                        opacity: 1 !important;
                    }
                    #workflow {
                        padding: 80px 0 !important;
                    }
                }
            `}</style>
        </section>
    );
}

function Features() {
    const features = [
        {
            title: "Bring Your Own GPU",
            desc: "Connect your RunPod account. Pay standard cloud rates instead of premium SaaS markups.",
            icon: Cpu,
            bg: "linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)"
        },
        {
            title: "Privacy First",
            desc: "Your data never leaves your infrastructure. Enterprise-grade security by default.",
            icon: Shield,
            bg: "var(--bg-secondary)"
        },
        {
            title: "Instant Launch",
            desc: "Deploy a full avatar studio in less than 5 minutes. No complex devops required.",
            icon: Zap,
            bg: "var(--bg-secondary)"
        },
        {
            title: "Unlimited Generations",
            desc: "No credit packs. No limits. Create as much as your hardware can handle.",
            icon: Sparkles,
            bg: "var(--bg-secondary)"
        }
    ];

    return (
        <section id="features" style={{ padding: '80px 0', background: 'var(--bg-primary)' }}>
            <div className="container">
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>Why creators switch to OpenAvathar</h2>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Everything you need to scale video production, without the scaling costs.</p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '24px',
                    maxWidth: '1000px',
                    margin: '0 auto'
                }}>
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="card"
                            style={{
                                padding: '32px',
                                background: f.bg,
                                gridColumn: window.innerWidth > 768 && (i === 0 || i === 3) ? 'span 2' : 'span 1',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'white',
                                borderRadius: '12px',
                                display: 'grid',
                                placeItems: 'center',
                                marginBottom: '20px',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <f.icon size={24} color="var(--accent)" />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>{f.title}</h3>
                            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Pricing() {
    const gumroadUrl = import.meta.env.VITE_GUMROAD_URL;

    return (
        <section id="pricing" style={{ padding: '100px 0', background: 'white' }}>
            <div className="container">
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>
                        Fair pricing for <span className="text-gradient">everyone</span>
                    </h2>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>One-time payment. Lifetime access. No monthly subscriptions.</p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '24px',
                    maxWidth: '900px',
                    margin: '0 auto'
                }}>
                    {/* Free Plan */}
                    <div className="card" style={{ padding: '40px', background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Starter</h3>
                        <div style={{ margin: '20px 0' }}>
                            <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>$0</span>
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}> / forever</span>
                        </div>
                        <p style={{ marginBottom: '32px', color: 'var(--text-secondary)' }}>Perfect for testing the technology and generating your first videos.</p>

                        <div style={{ display: 'grid', gap: '16px', marginBottom: '40px' }}>
                            <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)' }}><Check size={20} color="#10b981" /> 1 Video per day</div>
                            <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)' }}><Check size={20} color="#10b981" /> Standard Quality</div>
                            <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)' }}><Check size={20} color="#10b981" /> Community Support</div>
                        </div>

                        <a href="#get-started" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>Start for Free</a>
                    </div>

                    {/* Pro Plan */}
                    <div className="card" style={{ padding: '40px', background: '#0f172a', color: 'white', position: 'relative', border: '1px solid #1e293b' }}>
                        <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--accent)', color: 'white', fontSize: '0.8rem', fontWeight: 700, padding: '4px 12px', borderRadius: '999px' }}>
                            POPULAR
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#94a3b8' }}>Pro License</h3>
                        <div style={{ margin: '20px 0' }}>
                            <span style={{ fontSize: '3.5rem', fontWeight: 800 }}>$89</span>
                            <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}> / lifetime</span>
                        </div>
                        <p style={{ marginBottom: '32px', color: '#cbd5e1' }}>Unlock the full power of your hardware with specialized tools.</p>

                        <div style={{ display: 'grid', gap: '16px', marginBottom: '40px' }}>
                            <div style={{ display: 'flex', gap: '12px', color: '#cbd5e1' }}><Check size={20} color="var(--accent)" /> <strong>Unlimited Generations</strong></div>
                            <div style={{ display: 'flex', gap: '12px', color: '#cbd5e1' }}><Check size={20} color="var(--accent)" /> Priority Queuing</div>
                            <div style={{ display: 'flex', gap: '12px', color: '#cbd5e1' }}><Check size={20} color="var(--accent)" /> Use on 3 Devices</div>
                            <div style={{ display: 'flex', gap: '12px', color: '#cbd5e1' }}><Check size={20} color="var(--accent)" /> Early Access to New Models</div>
                        </div>

                        <a
                            href={gumroadUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', background: 'var(--accent)', border: 'none', textDecoration: 'none' }}
                        >
                            Get Lifetime Access
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

function AccessPortal() {
    const navigate = useNavigate();
    const apiKey = useAppStore((state) => state.apiKey);
    const isValidated = useAppStore((state) => state.isValidated);
    const gumroadUrl = import.meta.env.VITE_GUMROAD_URL;
    const hasBrowserSession = Boolean(apiKey && isValidated);

    return (
        <section id="get-started" style={{ padding: '80px 0 120px', background: 'var(--bg-primary)' }}>
            <div className="container">
                <div className="glass-panel" style={{
                    maxWidth: '560px',
                    margin: '0 auto',
                    borderRadius: '24px',
                    padding: '48px 32px',
                    boxShadow: 'var(--shadow-lg)',
                    background: 'white'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <Key size={28} color="var(--accent)" />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Open Studio</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            We only check saved browser memory from previous sessions.
                        </p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '0.92rem',
                                borderRadius: '12px',
                                padding: '12px 14px',
                                background: hasBrowserSession ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                border: hasBrowserSession ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.25)',
                                color: hasBrowserSession ? 'var(--text-primary)' : 'var(--text-secondary)'
                            }}
                        >
                            {hasBrowserSession ? <Check size={16} color="#10b981" /> : <AlertTriangle size={16} color="#f59e0b" />}
                            {hasBrowserSession
                                ? 'Saved API key found in this browser.'
                                : 'No saved API key found. You can still open Studio and add it when generating.'}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/studio')}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '16px', fontSize: '1rem' }}
                    >
                        {hasBrowserSession ? 'Enter Studio' : 'Continue to Studio'}
                    </button>

                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <a href="https://www.runpod.io/console/user/settings" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ExternalLink size={14} /> Get your key from RunPod
                        </a>
                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                            Keys are stored locally in your browser.
                        </div>
                    </div>

                    {gumroadUrl && (
                        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Already purchased Pro?</p>
                            <button
                                type="button"
                                onClick={() => navigate('/studio')}
                                className="btn btn-secondary"
                                style={{ width: '100%', fontSize: '0.9rem' }}
                            >
                                Activate License
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

// --- Main Page Component ---

export default function LandingPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <Navbar />
            <main>
                <Hero />
                <Workflow />
                <Features />
                <Pricing />
                <AccessPortal />
            </main>

            <footer style={{ background: 'white', padding: '60px 0', borderTop: '1px solid var(--border)' }}>
                <div className="container" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <Sparkles size={20} color="var(--accent)" /> OpenAvathar
                    </div>
                    <p style={{ marginBottom: '20px' }}>&copy; {new Date().getFullYear()} OpenAvathar. Open source and privacy first.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>GitHub</a>
                        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Twitter</a>
                        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Docs</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

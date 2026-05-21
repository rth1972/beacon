'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/* ── Themes ── */
type Theme = {
  bg: string; gray: string; card: string;
  gold: string; goldLight: string; goldDark: string; orange: string;
  text: string; textMuted: string; border: string; track: string;
  grad1: string; grad2: string; heading: string;
  heroBg: string; heroOverlay: string; demoAnim: string;
}

const darkTheme: Theme = {
  bg: '#19171c', gray: '#353535', card: '#242424',
  gold: '#f3ba40', goldLight: '#f9c25b', goldDark: '#d49e1a', orange: '#fe6f41',
  text: '#cccccc', textMuted: '#bebebe', border: '#505050', track: '#5e5e5e',
  grad1: '#f4d157', grad2: '#ea9322', heading: '#ffffff',
  heroBg: 'url(/hero-bg.svg)',
  heroOverlay: [
    `linear-gradient(#19171cD0, #19171c)`,
    `radial-gradient(ellipse at 50% 0%, #f3ba4015 0%, transparent 0%)`,
    `radial-gradient(ellipse at 20% 80%, #ea93220C 0%, transparent 0%)`,
    `radial-gradient(ellipse at 80% 60%, #f4d1570A 0%, transparent 0%)`,
  ].join(', '),
  demoAnim: '/demo-anim.svg',
}

const lightTheme: Theme = {
  bg: '#f5f5f0', gray: '#e8e8e3', card: '#ffffff',
  gold: '#c9950e', goldLight: '#b8860b', goldDark: '#8b6914', orange: '#d4511a',
  text: '#2a2a2a', textMuted: '#777777', border: '#d4d4cc', track: '#e0e0d8',
  grad1: '#d49e1a', grad2: '#b8860b', heading: '#1a1a1a',
  heroBg: 'url(/hero-bg-light.svg)',
  heroOverlay: [
    `linear-gradient(#f5f5f0E0, #f5f5f0)`,
    `radial-gradient(ellipse at 50% 0%, #c9950e10 0%, transparent 0%)`,
    `radial-gradient(ellipse at 20% 80%, #b8860b08 0%, transparent 0%)`,
    `radial-gradient(ellipse at 80% 60%, #d49e1a08 0%, transparent 0%)`,
  ].join(', '),
  demoAnim: '/demo-anim-light.svg',
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [showTopBtn, setShowTopBtn] = useState(false)
  const [lightMode, setLightMode] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const C: Theme = lightMode ? lightTheme : darkTheme
  const s = buildStyles(C)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 50)
      setShowTopBtn(y > 300)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleTheme = () => setLightMode(p => !p)

  return (
    <div style={{ ...s.page, background: C.bg, color: C.text }}>

      <style>{`
        @media (max-width: 768px) {
          [data-bn-desktop] { display: none !important; }
          [data-bn-hamburger] { display: flex !important; }
          [data-bn-inner] { padding: 0 16px !important; }
        }
        @media (min-width: 769px) {
          [data-bn-hamburger] { display: none !important; }
          [data-bn-overlay] { display: none !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ ...s.nav, ...(scrolled ? s.navSolid : s.navTop) }}>
        <div data-bn-inner style={s.navInner}>
          <Link href="/" style={s.navLogo}>
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="2" width="36" height="44" rx="6" stroke={C.gold} strokeWidth="2"/>
              <rect x="10" y="8" width="28" height="34" rx="2" stroke={C.gold} strokeWidth="0.5" opacity="0.35"/>
              <circle cx="24" cy="4" r="1.5" stroke={C.gold} strokeWidth="1"/>
              <rect x="18" y="42" width="12" height="1.5" rx="0.75" stroke={C.gold} strokeWidth="1" opacity="0.6"/>
              <rect x="14" y="16" width="20" height="18" rx="3" fill={C.bg} stroke={C.gold} strokeWidth="0.8"/>
              <rect x="17" y="18" width="5" height="5" rx="1.5" stroke={C.gold} strokeWidth="0.6"/>
              <path d="M19.5,20.5c-0.5,0-1,0.3-1,0.8v0.6l-0.5,0.5c-0.2,0.2-0.1,0.4,0,0.5c0.7,0.3,1.4,0.5,2.2,0.5s1.5-0.2,2.2-0.5c0.2-0.1,0.2-0.3,0-0.5l-0.5-0.5v-0.6c0-0.5-0.5-0.8-1-0.8z" stroke={C.gold} strokeWidth="0.4"/>
              <circle cx="38" cy="12" r="3.5" fill="#cc2200"/>
              <text x="38" y="13.5" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fontWeight="bold" fill="#fff">!</text>
            </svg>
            <span style={{ fontSize: 17, fontWeight: 600, color: C.text, letterSpacing: '-0.3px' }}>Beacon</span>
          </Link>

          {/* Desktop links */}
          <div data-bn-desktop style={s.navLinks}>
            <a href="#features" style={s.navLink}>Features</a>
            <a href="#setup" style={s.navLink}>Setup</a>
            <button onClick={toggleTheme} style={s.themeToggle} aria-label="Toggle theme">
              {lightMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              )}
            </button>
            <Link href="/dashboard" style={s.navCta}>Dashboard</Link>
          </div>

          {/* Hamburger */}
          <button data-bn-hamburger onClick={() => setMenuOpen(true)} style={s.hamburger} aria-label="Open menu">
            <span style={s.hamburgerLine} /><span style={s.hamburgerLine} /><span style={s.hamburgerLine} />
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {menuOpen && (
        <div data-bn-overlay style={s.mobileOverlay} onClick={() => setMenuOpen(false)}>
          <div style={s.mobilePanel} onClick={e => e.stopPropagation()}>
            <div style={s.mobileHeader}>
              <span style={{ fontSize: 17, fontWeight: 600, color: C.heading }}>Beacon</span>
              <button onClick={() => setMenuOpen(false)} style={s.mobileClose} aria-label="Close menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={s.mobileBody}>
              <a href="#features" style={s.mobileLink} onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#setup" style={s.mobileLink} onClick={() => setMenuOpen(false)}>Setup</a>
              <div style={{ height: 1, background: C.border, opacity: 0.3, margin: '12px 0' }} />
              <Link href="/dashboard" style={s.mobileCta} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button onClick={() => { toggleTheme(); setMenuOpen(false) }} style={s.mobileThemeBtn}>
                {lightMode ? (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Dark mode</>
                ) : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Light mode</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section style={{ ...s.hero, backgroundImage: C.heroBg }}>
        <div style={{ ...s.heroOverlay, background: C.heroOverlay }} />
        <div style={s.heroInner}>
          <div style={s.heroBadge}>
            <span style={s.badgeDot} />
            SELF-HOSTED · OPEN SOURCE · ZERO CLOUD
          </div>
          <h1 style={s.heroTitle}>
            PUSH NOTIFICATION<br />
            <span style={s.heroAccent}>SERVER</span>
          </h1>
          <p style={s.heroDesc}>
            Lightweight, self-hosted notifications. Subscribe via SSE, publish with curl.
            No cloud, no dependencies, no complexity.
          </p>

          <div style={s.heroCtas}>
            <Link href="/dashboard" style={s.btnPrimary}>OPEN DASHBOARD →</Link>
            <a href="#setup" style={s.btnSecondary}>npm run dev</a>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={s.section}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>CORE FEATURES</div>
          <h2 style={s.sectionTitle}>
            Main Facts<br />
            <span style={s.titleAccent}>About Beacon</span>
          </h2>
          <div style={s.featureGrid}>
            {[
              { icon: '📡', title: 'REAL-TIME SSE', desc: 'Server-Sent Events deliver messages the moment they arrive. No polling, no WebSocket overhead.' },
              { icon: '🗄️', title: 'PERSISTENT HISTORY', desc: 'SQLite-backed storage means you never miss a message. Reconnect and replay what you missed.' },
              { icon: '🔐', title: 'TOKEN AUTH', desc: 'Secure your server with a single environment variable. Browser login page + Bearer token for scripts.' },
              { icon: '🖥️', title: 'OS NATIVE ALERTS', desc: 'System notifications on macOS, Windows, and Linux. Fires automatically via osascript, PowerShell, notify-send.' },
              { icon: '✈️', title: 'TELEGRAM RELAY', desc: 'Forward every message to a Telegram bot. Get notified anywhere when you are away from your desk.' },
              { icon: '⏱️', title: 'TTL & AUTO-CLEANUP', desc: 'Set an expiry on any message. Expired entries are hidden from queries and purged every 10 minutes.' },
            ].map((f, i) => (
              <div key={i} style={s.featureCard}>
                <div style={{ ...s.featureIcon, background: `${C.gold}15` }}>{f.icon}</div>
                <h3 style={s.featureTitle}>{f.title}</h3>
                <p style={s.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    {/* ── Setup ── */}
      <section id="setup" style={{ ...s.section, background: C.gray }}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>GET STARTED</div>
          <h2 style={s.sectionTitle}>
            Up and Running<br />
            <span style={s.titleAccent}>In Three Steps</span>
          </h2>
          <div style={s.setupGrid}>
            {[
              { num: '01', title: 'Start the server', desc: 'Clone, install, and run. Beacon binds to all interfaces so any device on your network can reach it.', code: 'npm install\nnpm run dev -- --hostname 0.0.0.0' },
              { num: '02', title: 'Subscribe to a topic', desc: 'Open any topic URL in your browser — or subscribe programmatically with EventSource. Topics are created on demand.', code: "new EventSource('/api/my-topic')" },
              { num: '03', title: 'Publish a message', desc: 'POST to any topic from a script, CI pipeline, or cron job. Plain text or JSON — your choice.', code: "curl -d 'Hello' localhost:3000/api/topic" },
            ].map((step, i) => (
              <div key={i} style={s.setupCard}>
                <div style={s.setupNum}>{step.num}</div>
                <h3 style={s.setupTitle}>{step.title}</h3>
                <p style={s.setupDesc}>{step.desc}</p>
                <pre style={s.setupCode}>{step.code}</pre>
              </div>
            ))}
          </div>

          {/* ── Live Demo ── */}
          <div style={s.demoSection}>
            <div style={s.demoContainer}>
              <object data={C.demoAnim} type="image/svg+xml" style={s.demoSvg} aria-label="Demo animation showing Beacon notification flow" />
            </div>
            <div style={s.demoSteps}>
              {[
                { num: 1, title: 'Pick a topic', desc: 'Type any topic name — topics are created on demand, no setup needed.' },
                { num: 2, title: 'Write your message', desc: 'Plain text or JSON. Add a priority level (low, high, urgent) if you want.' },
                { num: 3, title: 'Send it', desc: 'Hit send or POST via curl. The message arrives in under a second.' },
                { num: 4, title: 'Get notified', desc: 'A notification pops on your device. SSE delivers it in real-time.' },
              ].map((step, i) => (
                <div key={i} style={s.demoStep}>
                  <div style={s.demoNum}>{step.num}</div>
                  <div>
                    <div style={s.demoStepTitle}>{step.title}</div>
                    <div style={s.demoStepDesc}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={s.techSection}>
            <div style={s.techLabel}>TECH STACK</div>
            <div style={s.techRow}>
              {['Next.js 16', 'SQLite', 'SSE', 'TypeScript', 'PWA'].map(t => (
                <span key={t} style={s.techBadge}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={s.statsBar}>
        {[
          { val: '0', label: 'External deps' },
          { val: '<1s', label: 'Delivery latency' },
          { val: '∞', label: 'Unlimited topics' },
          { val: '3', label: 'OS platforms' },
          { val: '⚡', label: 'SSE protocol' },
        ].map((s_, i) => (
          <div key={i} style={s.statItem}>
            <div style={s.statVal}>{s_.val}</div>
            <div style={s.statLbl}>{s_.label}</div>
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <section style={s.cta}>
        <h2 style={s.ctaTitle}>PARTICIPATE IN<br /><span style={s.titleAccent}>THE BETA</span></h2>
        <p style={s.ctaDesc}>Beacon is running locally. Open the dashboard and send your first notification right now.</p>
        <Link href="/dashboard" style={s.ctaBtn}>OPEN BEACON →</Link>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.footerTop}>
          <div style={s.footerCol}>
            <h4 style={s.footerTitle}>About Beacon</h4>
            <p style={s.footerP}>Self-hosted push notification server. Your data, your infrastructure, your rules.</p>
          </div>
          <div style={s.footerCol}>
            <h4 style={s.footerTitle}>Quick Links</h4>
            <a href="#features" style={s.footerLink}>Features</a>
            <a href="#setup" style={s.footerLink}>Setup</a>
            <Link href="/dashboard" style={s.footerLink}>Dashboard</Link>
          </div>
          <div style={s.footerCol}>
            <h4 style={s.footerTitle}>Tech</h4>
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8 }}>
              Next.js 16 · SQLite · SSE<br />
              TypeScript
            </div>
          </div>
        </div>
        <div style={s.footerBot}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="2" width="36" height="44" rx="6" stroke={C.gold} strokeWidth="2.5"/>
              <circle cx="24" cy="4" r="1.5" stroke={C.gold} strokeWidth="1"/>
              <rect x="18" y="42" width="12" height="1.5" rx="0.75" stroke={C.gold} strokeWidth="1" opacity="0.6"/>
              <rect x="14" y="16" width="20" height="18" rx="3" stroke={C.gold} strokeWidth="0.8" opacity="0.3"/>
            </svg>
            Beacon v0.1.0
          </div>
          <div style={{ color: C.textMuted }}>Self-hosted. Your data. Your rules.</div>
        </div>
      </footer>

      {/* Scroll to top */}
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ ...s.topBtn, ...(showTopBtn ? s.topBtnVisible : {}) }} aria-label="Scroll to top">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </div>
  )
}

/* ── Styles ── */

function buildStyles(C: Theme): Record<string, React.CSSProperties> {
  return {
  page: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    minHeight: '100vh',
    overflowX: 'hidden',
  },
  nav: {
    position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100,
    transition: 'background 0.25s, border-color 0.25s',
  },
  navTop: { background: 'transparent', borderBottom: '1px solid transparent' },
  navSolid: { background: `${C.bg}E0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}40` },
  navInner: {
    maxWidth: 1100, margin: '0 auto', padding: '0 48px', height: 62,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
  navLinks: { display: 'flex', alignItems: 'center', gap: 28, fontSize: 13 },
  navLink: { color: C.text, textDecoration: 'none', transition: 'color 0.15s', letterSpacing: '0.3px' },
  themeToggle: {
    background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6,
    padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    lineHeight: 0,
  },
  navCta: {
    background: `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
    color: '#fff', padding: '7px 18px', borderRadius: 6,
    fontSize: 12, fontWeight: 600, textDecoration: 'none', letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  hamburger: {
    display: 'none', flexDirection: 'column' as const, gap: 4,
    background: 'transparent', border: 'none', cursor: 'pointer',
    padding: 8,
  },
  hamburgerLine: {
    width: 18, height: 2, borderRadius: 1, background: C.text,
    display: 'block',
  },
  mobileOverlay: {
    position: 'fixed' as const, inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.6)', display: 'flex',
    justifyContent: 'flex-end' as const,
  },
  mobilePanel: {
    width: '75%', maxWidth: 320, height: '100%',
    background: C.card, display: 'flex', flexDirection: 'column' as const,
  },
  mobileHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px', borderBottom: `1px solid ${C.border}40`,
  },
  mobileClose: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    padding: 4, display: 'flex',
  },
  mobileBody: {
    flex: 1, padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 6,
  },
  mobileLink: {
    display: 'block', padding: '12px 14px', borderRadius: 8,
    color: C.text, textDecoration: 'none', fontSize: 15, fontWeight: 500,
    transition: 'background 0.15s',
  },
  mobileCta: {
    display: 'block', textAlign: 'center' as const, padding: '12px 14px',
    borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600,
    background: `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
    letterSpacing: '0.5px',
  },
  mobileThemeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '12px 14px', borderRadius: 8,
    background: 'transparent', border: `1px solid ${C.border}`, color: C.text,
    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
  },
  /* Hero */
  hero: {
    position: 'relative' as const, zIndex: 1, overflow: 'hidden',
    minHeight: '100vh', padding: '100px 24px', textAlign: 'center' as const,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundSize: 'cover', backgroundPosition: 'right',
  },
  heroOverlay: {
    position: 'absolute' as const, inset: 0,
    pointerEvents: 'none',
  },
  heroInner: { maxWidth: 780, margin: '0 auto', position: 'relative' as const, zIndex: 1 },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 11, color: C.goldLight, letterSpacing: 1.5,
    background: `${C.gold}12`, border: `1px solid ${C.gold}30`,
    borderRadius: 20, padding: '5px 16px', marginBottom: 28,
  },
  badgeDot: { width: 6, height: 6, borderRadius: '50%', background: C.goldLight },
  heroTitle: {
    fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 700,
    lineHeight: 1.1, letterSpacing: '2px', marginBottom: 20, color: C.heading,
  },
  heroAccent: {
    background: `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  heroDesc: {
    fontSize: 'clamp(15px, 1.8vw, 18px)', color: C.text,
    maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.7, fontWeight: 300,
  },
  heroCtas: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 48 },
  btnPrimary: {
    display: 'inline-block',
    background: `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
    color: '#fff', padding: '14px 32px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, letterSpacing: '1px', textDecoration: 'none',
  },
  btnSecondary: {
    display: 'inline-block', background: 'transparent', color: C.text,
    padding: '14px 28px', border: `1px solid ${C.border}`, borderRadius: 8,
    fontSize: 13, fontFamily: "'DM Mono', monospace", textDecoration: 'none',
  },
  /* Section */
  section: { padding: '80px 24px', position: 'relative' as const, zIndex: 1 },
  sectionInner: { maxWidth: 1100, margin: '0 auto' },
  sectionLabel: {
    fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.gold,
    letterSpacing: 3, marginBottom: 12, textTransform: 'uppercase' as const,
  },
  sectionTitle: {
    fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 700,
    lineHeight: 1.15, marginBottom: 48, letterSpacing: '1px', color: C.heading,
  },
  titleAccent: {
    background: `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  /* Features */
  featureGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2,
    background: `${C.border}60`, border: `1px solid ${C.border}60`,
    borderRadius: 14, overflow: 'hidden',
  },
  featureCard: { background: C.card, padding: '32px 28px' },
  featureIcon: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 18 },
  featureTitle: { fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '1px', color: C.goldDark },
  featureDesc: { fontSize: 14, color: C.text, lineHeight: 1.65 },
  /* Demo */
  demoSection: {
    display: 'flex', gap: 48, alignItems: 'center', marginBottom: 48,
    flexWrap: 'wrap' as const, justifyContent: 'center',
  },
  demoContainer: { flex: '0 0 320px' },
  demoSvg: { width: 320, height: 'auto', display: 'block' },
  demoSteps: { flex: '1 1 320px', display: 'flex', flexDirection: 'column' as const, gap: 18 },
  demoStep: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  demoNum: {
    width: 28, height: 28, borderRadius: '50%', background: `${C.gold}18`,
    border: `1px solid ${C.gold}30`, color: C.goldLight,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600, flexShrink: 0, fontFamily: "'DM Mono', monospace",
  },
  demoStepTitle: { fontSize: 14, fontWeight: 600, color: C.heading, marginBottom: 3 },
  demoStepDesc: { fontSize: 13, color: C.textMuted, lineHeight: 1.55 },
  /* Setup */
  setupGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 40 },
  setupCard: { background: C.card, border: `1px solid ${C.border}60`, borderRadius: 12, padding: 28 },
  setupNum: { fontSize: 12, color: C.gold, fontWeight: 600, fontFamily: "'DM Mono', monospace", marginBottom: 14, letterSpacing: 1 },
  setupTitle: { fontSize: 16, fontWeight: 500, marginBottom: 10, color: C.goldDark },
  setupDesc: { fontSize: 13, color: C.text, lineHeight: 1.65, marginBottom: 16 },
  setupCode: {
    background: C.bg, border: `1px solid ${C.border}60`, borderRadius: 6,
    padding: 12, fontSize: 11, fontFamily: "'DM Mono', monospace", color: C.textMuted,
    overflowX: 'auto' as const, whiteSpace: 'pre-wrap' as const, margin: 0,
  },
  /* Tech */
  techSection: { textAlign: 'center' as const, paddingTop: 16 },
  techLabel: { fontSize: 11, color: C.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 16 },
  techRow: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' as const },
  techBadge: { background: `${C.gold}10`, border: `1px solid ${C.gold}25`, borderRadius: 20, padding: '5px 16px', fontSize: 12, color: C.goldLight },
  /* Stats */
  statsBar: {
    display: 'flex', justifyContent: 'center', gap: 40, padding: '48px 24px',
    borderTop: `1px solid ${C.border}60`, flexWrap: 'wrap' as const,
    position: 'relative' as const, zIndex: 1,
  },
  statItem: { textAlign: 'center' as const },
  statVal: { fontSize: 30, fontWeight: 700, color: C.gold, marginBottom: 4, letterSpacing: '-1px' },
  statLbl: { fontSize: 12, color: C.textMuted, letterSpacing: '0.5px' },
  /* CTA */
  cta: {
    textAlign: 'center' as const, padding: '80px 24px',
    borderTop: `1px solid ${C.border}60`, position: 'relative' as const, zIndex: 1,
  },
  ctaTitle: { fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, letterSpacing: '2px', marginBottom: 16, color: C.goldDark },
  ctaDesc: { color: C.text, fontSize: 15, marginBottom: 32, lineHeight: 1.6 },
  ctaBtn: {
    display: 'inline-block',
    background: `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
    color: '#fff', padding: '14px 36px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, letterSpacing: '1px', textDecoration: 'none',
  },
  /* Footer */
  footer: { borderTop: `1px solid ${C.border}60`, padding: '48px 24px 28px', position: 'relative' as const, zIndex: 1, background: C.card },
  footerTop: { maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 40, marginBottom: 40 },
  footerCol: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  footerTitle: { fontSize: 13, fontWeight: 600, color: C.heading, marginBottom: 4, letterSpacing: '0.5px' },
  footerP: { fontSize: 13, color: C.textMuted, lineHeight: 1.6 },
  footerLink: { fontSize: 13, color: C.text, textDecoration: 'none', transition: 'color 0.15s' },
  footerBot: {
    maxWidth: 1100, margin: '0 auto', paddingTop: 20,
    borderTop: `1px solid ${C.border}40`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 13, color: C.textMuted,
  },
  topBtn: {
    position: 'fixed' as const, bottom: 28, right: 28, zIndex: 300,
    width: 42, height: 42, borderRadius: '50%',
    background: C.card, border: `1px solid ${C.border}`,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: 0, pointerEvents: 'none' as const,
    transform: 'translateY(12px)',
    transition: 'opacity .25s, transform .25s',
  },
  topBtnVisible: {
    opacity: 1, pointerEvents: 'auto' as const,
    transform: 'translateY(0)',
  },
}}

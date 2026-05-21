'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/* ── RTH Color Palette ── */
const C = {
  dark: '#19171c',
  gray: '#353535',
  card: '#242424',
  gold: '#f3ba40',
  goldLight: '#f9c25b',
  orange: '#fe6f41',
  text: '#cccccc',
  textMuted: '#bebebe',
  border: '#505050',
  track: '#5e5e5e',
  grad1: '#f4d157',
  grad2: '#ea9322',
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ ...s.page, background: C.dark, color: C.text }}>

      {/* Nav */}
      <nav style={{ ...s.nav, ...(scrolled ? s.navSolid : s.navTop) }}>
        <div style={s.navInner}>
          <Link href="/" style={s.navLogo}>
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="2" width="36" height="44" rx="6" stroke={C.gold} strokeWidth="2"/>
              <rect x="10" y="8" width="28" height="34" rx="2" stroke={C.gold} strokeWidth="0.5" opacity="0.35"/>
              <circle cx="24" cy="4" r="1.5" stroke={C.gold} strokeWidth="1"/>
              <rect x="18" y="42" width="12" height="1.5" rx="0.75" stroke={C.gold} strokeWidth="1" opacity="0.6"/>
              <rect x="14" y="16" width="20" height="18" rx="3" fill={C.dark} stroke={C.gold} strokeWidth="0.8"/>
              <rect x="17" y="18" width="5" height="5" rx="1.5" stroke={C.gold} strokeWidth="0.6"/>
              <path d="M19.5,20.5c-0.5,0-1,0.3-1,0.8v0.6l-0.5,0.5c-0.2,0.2-0.1,0.4,0,0.5c0.7,0.3,1.4,0.5,2.2,0.5s1.5-0.2,2.2-0.5c0.2-0.1,0.2-0.3,0-0.5l-0.5-0.5v-0.6c0-0.5-0.5-0.8-1-0.8z" stroke={C.gold} strokeWidth="0.4"/>
              <circle cx="38" cy="12" r="3.5" fill="#cc2200"/>
              <text x="38" y="13.5" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fontWeight="bold" fill="#fff">!</text>
            </svg>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>Beacon</span>
          </Link>
          <div style={s.navLinks}>
            <a href="#features" style={s.navLink}>Features</a>
            <a href="#roadmap" style={s.navLink}>Roadmap</a>
            <a href="#setup" style={s.navLink}>Setup</a>
            <Link href="/dashboard" style={s.navCta}>Dashboard</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroOverlay} />
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
              <object data="/demo-anim.svg" type="image/svg+xml" style={s.demoSvg} aria-label="Demo animation showing Beacon notification flow" />
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
            <a href="#roadmap" style={s.footerLink}>Roadmap</a>
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
    </div>
  )
}

/* ── Styles ── */

const s: Record<string, React.CSSProperties> = {
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
  navSolid: { background: `${C.dark}E0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}40` },
  navInner: {
    maxWidth: 1100, margin: '0 auto', padding: '0 48px', height: 62,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
  navLinks: { display: 'flex', alignItems: 'center', gap: 28, fontSize: 13 },
  navLink: { color: C.text, textDecoration: 'none', transition: 'color 0.15s', letterSpacing: '0.3px' },
  navCta: {
    background: `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
    color: '#fff', padding: '7px 18px', borderRadius: 6,
    fontSize: 12, fontWeight: 600, textDecoration: 'none', letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  /* Hero */
  hero: {
    position: 'relative' as const, zIndex: 1, overflow: 'hidden',
    minHeight: '100vh', padding: '100px 24px', textAlign: 'center' as const,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundImage: 'url(/push_notification_wallpaper_v6.svg)',
    backgroundSize: 'cover', backgroundPosition: 'right',
  },
  heroOverlay: {
    position: 'absolute' as const, inset: 0,
    background: `
      linear-gradient(${C.dark}D0, ${C.dark}),
      radial-gradient(ellipse at 50% 0%, ${C.gold}15 0%, transparent 0%),
      radial-gradient(ellipse at 20% 80%, ${C.grad2}0C 0%, transparent 0%),
      radial-gradient(ellipse at 80% 60%, ${C.grad1}0A 0%, transparent 0%)
    `,
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
    lineHeight: 1.1, letterSpacing: '2px', marginBottom: 20, color: '#fff',
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
    lineHeight: 1.15, marginBottom: 48, letterSpacing: '1px', color: '#fff',
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
  featureTitle: { fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '1px', color: '#fff' },
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
  demoStepTitle: { fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 3 },
  demoStepDesc: { fontSize: 13, color: C.textMuted, lineHeight: 1.55 },
  /* Setup */
  setupGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 },
  setupCard: { background: C.card, border: `1px solid ${C.border}60`, borderRadius: 12, padding: 28 },
  setupNum: { fontSize: 12, color: C.gold, fontWeight: 600, fontFamily: "'DM Mono', monospace", marginBottom: 14, letterSpacing: 1 },
  setupTitle: { fontSize: 16, fontWeight: 500, marginBottom: 10, color: '#fff' },
  setupDesc: { fontSize: 13, color: C.text, lineHeight: 1.65, marginBottom: 16 },
  setupCode: {
    background: C.dark, border: `1px solid ${C.border}60`, borderRadius: 6,
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
  ctaTitle: { fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, letterSpacing: '2px', marginBottom: 16, color: '#fff' },
  ctaDesc: { color: C.text, fontSize: 15, marginBottom: 32, lineHeight: 1.6 },
  ctaBtn: {
    display: 'inline-block',
    background: `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
    color: '#fff', padding: '14px 36px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, letterSpacing: '1px', textDecoration: 'none',
  },
  /* Footer */
  footer: { borderTop: `1px solid ${C.border}60`, padding: '48px 24px 28px', position: 'relative' as const, zIndex: 1, background: '#1c1c1c' },
  footerTop: { maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 40, marginBottom: 40 },
  footerCol: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  footerTitle: { fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4, letterSpacing: '0.5px' },
  footerP: { fontSize: 13, color: C.textMuted, lineHeight: 1.6 },
  footerLink: { fontSize: 13, color: C.text, textDecoration: 'none', transition: 'color 0.15s' },
  footerBot: {
    maxWidth: 1100, margin: '0 auto', paddingTop: 20,
    borderTop: `1px solid ${C.border}40`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 13, color: C.textMuted,
  },
}

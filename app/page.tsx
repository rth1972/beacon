'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const codeTabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  function switchTab(lang: string, el: HTMLElement) {
    codeTabsRef.current?.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'))
    codeTabsRef.current?.querySelectorAll('.code-pane').forEach(p => p.classList.remove('active'))
    el.classList.add('active')
    codeTabsRef.current?.querySelector(`#pane-${lang}`)?.classList.add('active')
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
        :root {
          --bg:#080c14;--bg2:#0d1320;--bg3:#111828;
          --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);
          --accent:#3d6bff;--accent2:#6490ff;
          --text:#e8ecf4;--muted:#7a8299;--faint:#3d4560;
          --success:#2ecc71;--warning:#f5a623;--error:#ff5f5f;--info:#6490ff;
          --mono:'DM Mono',monospace;--serif:'Instrument Serif',Georgia,serif;
          --sans:'DM Sans',system-ui,sans-serif;
        }
        .landing{font-family:var(--sans);background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
        .landing a{color:inherit;text-decoration:none}
        .landing::before{content:'';position:fixed;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px);background-size:32px 32px;pointer-events:none;z-index:0}
        .l-nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:60px;background:rgba(8,12,20,0.88);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
        .l-nav-logo{display:flex;align-items:center;gap:10px;font-weight:500;font-size:17px;letter-spacing:-0.3px}
        .l-nav-links{display:flex;align-items:center;gap:24px;font-size:14px;color:var(--muted)}
        .l-nav-links a:hover{color:var(--text)}
        .l-btn-primary{background:var(--accent);color:#fff;font-weight:500;border-radius:7px;transition:background 0.15s,transform 0.1s}
        .l-btn-primary:hover{background:var(--accent2);transform:translateY(-1px)}
        .l-btn-ghost{color:var(--muted);border:1px solid var(--border2);border-radius:7px;font-family:var(--mono);transition:color 0.15s,border-color 0.15s}
        .l-btn-ghost:hover{color:var(--text);border-color:var(--faint)}
        .l-hero{position:relative;z-index:1;min-height:88vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 24px 60px}
        .l-badge{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;color:var(--accent2);background:rgba(61,107,255,0.1);border:1px solid rgba(61,107,255,0.25);border-radius:20px;padding:4px 14px;margin-bottom:32px;letter-spacing:0.5px;text-transform:uppercase}
        .l-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--success);animation:bpulse 2s infinite}
        @keyframes bpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
        .l-h1{font-family:var(--serif);font-size:clamp(44px,7vw,80px);font-weight:400;line-height:1.05;letter-spacing:-1px;margin-bottom:24px;max-width:800px}
        .l-h1 em{font-style:italic;color:var(--accent2)}
        .l-lead{font-size:clamp(16px,2vw,19px);color:var(--muted);max-width:520px;margin-bottom:44px;font-weight:300;line-height:1.7}
        .l-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:64px}
        .arc{stroke:var(--accent);fill:none;stroke-linecap:round}
        .arc-1{animation:arc-in 0.6s 0.1s both}
        .arc-2{animation:arc-in 0.6s 0.3s both}
        .arc-3{animation:arc-in 0.6s 0.5s both}
        @keyframes arc-in{from{opacity:0;stroke-dashoffset:200}to{opacity:1;stroke-dashoffset:0}}
        .code-strip{width:100%;max-width:680px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden;text-align:left}
        .code-tab-bar{display:flex;align-items:center;gap:6px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg3)}
        .code-dot{width:10px;height:10px;border-radius:50%}
        .code-tabs{display:flex;gap:4px;margin-left:10px}
        .code-tab{font-family:var(--mono);font-size:11px;color:var(--muted);padding:3px 10px;border-radius:4px;cursor:pointer;border:none;background:none;transition:background 0.15s,color 0.15s}
        .code-tab.active{background:rgba(61,107,255,0.15);color:var(--accent2)}
        .code-body{padding:20px;font-family:var(--mono);font-size:13px;line-height:1.7;overflow-x:auto}
        .code-pane{display:none}.code-pane.active{display:block}
        .tok-k{color:#bb86fc}.tok-s{color:#98d4a3}.tok-n{color:#6490ff}.tok-c{color:var(--muted);font-style:italic}.tok-kw{color:#f08fa0}.tok-f{color:#ffca80}
        .l-stats{position:relative;z-index:1;display:flex;justify-content:center;gap:48px;padding:48px 24px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);flex-wrap:wrap}
        .stat-num{font-family:var(--serif);font-size:36px;font-weight:400;letter-spacing:-1px}
        .stat-label{font-size:13px;color:var(--muted);margin-top:2px;text-align:center}
        .l-section{position:relative;z-index:1;max-width:1100px;margin:0 auto;padding:96px 24px}
        .l-section-label{font-family:var(--mono);font-size:11px;color:var(--accent2);text-transform:uppercase;letter-spacing:2px;margin-bottom:16px}
        .l-section-title{font-family:var(--serif);font-size:clamp(30px,4vw,46px);font-weight:400;line-height:1.1;letter-spacing:-0.5px;margin-bottom:56px;max-width:500px}
        .l-section-title em{font-style:italic;color:var(--accent2)}
        .feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px;background:var(--border);border:1px solid var(--border);border-radius:14px;overflow:hidden}
        .feature-card{background:var(--bg);padding:28px;transition:background 0.2s}
        .feature-card:hover{background:var(--bg2)}
        .feature-icon{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:17px}
        .feature-card h3{font-size:15px;font-weight:500;margin-bottom:6px;letter-spacing:-0.2px}
        .feature-card p{font-size:13px;color:var(--muted);line-height:1.65}
        .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:48px}
        .step{padding:28px;background:var(--bg2);border:1px solid var(--border);border-radius:12px}
        .step-num{font-family:var(--mono);font-size:10px;color:var(--faint);margin-bottom:12px;letter-spacing:1px}
        .step h3{font-size:16px;font-weight:500;margin-bottom:8px;letter-spacing:-0.2px}
        .step p{font-size:13px;color:var(--muted);line-height:1.65}
        .step-code{margin-top:14px;background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:10px 12px;font-family:var(--mono);font-size:11px;color:var(--muted);overflow-x:auto}
        .notif-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:48px}
        .notif-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px}
        .notif-card-hdr{font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:14px;letter-spacing:1px;text-transform:uppercase}
        .notif-bubble{display:flex;align-items:flex-start;gap:10px;padding:12px;border-radius:9px;margin-bottom:8px;border-left:3px solid transparent}
        .notif-bubble.success{background:rgba(46,204,113,0.07);border-left-color:var(--success)}
        .notif-bubble.error{background:rgba(255,95,95,0.07);border-left-color:var(--error)}
        .notif-bubble.warning{background:rgba(245,166,35,0.07);border-left-color:var(--warning)}
        .notif-bubble.info{background:rgba(100,144,255,0.07);border-left-color:var(--info)}
        .notif-icon{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
        .notif-icon.success{background:rgba(46,204,113,0.15)}.notif-icon.error{background:rgba(255,95,95,0.15)}
        .notif-icon.warning{background:rgba(245,166,35,0.15)}.notif-icon.info{background:rgba(100,144,255,0.15)}
        .notif-title{font-size:12px;font-weight:500;color:var(--text);margin-bottom:2px}
        .notif-msg{font-size:11px;color:var(--muted)}
        .notif-meta{font-size:10px;color:var(--faint);margin-top:3px;font-family:var(--mono)}
        .notif-url-btn{display:inline-flex;align-items:center;gap:4px;margin-top:5px;font-size:10px;font-weight:500;color:var(--accent2);background:rgba(61,107,255,0.12);border-radius:4px;padding:2px 7px}
        .l-cta{position:relative;z-index:1;text-align:center;padding:96px 24px;border-top:1px solid var(--border)}
        .l-cta h2{font-family:var(--serif);font-size:clamp(32px,5vw,56px);font-weight:400;letter-spacing:-0.5px;margin-bottom:16px;line-height:1.1}
        .l-cta h2 em{font-style:italic;color:var(--accent2)}
        .l-cta p{color:var(--muted);font-size:16px;margin-bottom:36px}
        .l-footer{position:relative;z-index:1;border-top:1px solid var(--border);padding:24px 48px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--faint)}
        .fade-up{opacity:0;transform:translateY(24px);transition:opacity 0.6s ease,transform 0.6s ease}
        .fade-up.visible{opacity:1;transform:none}
        .stagger-1{transition-delay:0.1s}.stagger-2{transition-delay:0.2s}.stagger-3{transition-delay:0.3s}
        @media(max-width:700px){.steps,.notif-grid{grid-template-columns:1fr}.l-nav{padding:0 20px}.l-nav-links{display:none}}
      `}</style>

      <div className="landing">
        {/* Nav */}
        <nav className="l-nav">
          <div className="l-nav-logo">
            <BeaconIcon size={22}/>
            Beacon
          </div>
          <div className="l-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#notifications">Notifications</a>
            <Link href="/docs" style={{ color: 'var(--muted)' }}>API docs</Link>
            <Link href="/dashboard" className="l-btn-primary" style={{ padding: '7px 18px', fontSize: 13 }}>Open app →</Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="l-hero">
          <svg width="88" height="88" viewBox="0 0 96 96" fill="none" style={{ marginBottom: 36 }}>
            <circle cx="48" cy="72" r="44" className="arc arc-1" strokeWidth="2" strokeDasharray="100 999" strokeDashoffset="-38"/>
            <circle cx="48" cy="72" r="30" className="arc arc-2" strokeWidth="2.5" strokeDasharray="68 999" strokeDashoffset="-26"/>
            <circle cx="48" cy="72" r="16" className="arc arc-3" strokeWidth="3" strokeDasharray="36 999" strokeDashoffset="-14"/>
            <rect x="44" y="28" width="8" height="36" rx="3" fill="#3d6bff"/>
            <polygon points="30,64 66,64 58,80 38,80" fill="#3d6bff" opacity="0.6"/>
            <rect x="34" y="79" width="28" height="4" rx="2" fill="#3d6bff" opacity="0.4"/>
            <circle cx="48" cy="24" r="5" fill="#6490ff"/>
            <circle cx="48" cy="24" r="9" stroke="#6490ff" strokeWidth="1.5" opacity="0.4" style={{ animation: 'bpulse 2s infinite' }}/>
          </svg>

          <div className="l-badge">Self-hosted · Zero cloud · Your data</div>
          <h1 className="l-h1">Push notifications,<br/><em>on your terms</em></h1>
          <p className="l-lead">Beacon is a lightweight, self-hosted notification server. Send alerts from scripts, servers, and pipelines — to your browser, phone, desktop, or Telegram.</p>

          <div className="l-actions">
            <Link href="/dashboard" className="l-btn-primary" style={{ padding: '12px 28px', fontSize: 15 }}>Open dashboard →</Link>
            <a href="#how" className="l-btn-ghost" style={{ padding: '12px 24px', fontSize: 13 }}>$ npm run dev</a>
          </div>

          {/* Code strip */}
          <div className="code-strip fade-up" ref={codeTabsRef}>
            <div className="code-tab-bar">
              <div className="code-dot" style={{ background: '#ff5f57' }}/>
              <div className="code-dot" style={{ background: '#ffbd2e' }}/>
              <div className="code-dot" style={{ background: '#28c940' }}/>
              <div className="code-tabs">
                <button className="code-tab active" onClick={e => switchTab('curl', e.currentTarget)}>curl</button>
                <button className="code-tab" onClick={e => switchTab('js', e.currentTarget)}>javascript</button>
                <button className="code-tab" onClick={e => switchTab('python', e.currentTarget)}>python</button>
                <button className="code-tab" onClick={e => switchTab('schedule', e.currentTarget)}>schedule</button>
              </div>
            </div>
            <div className="code-body">
              <div className="code-pane active" id="pane-curl">
                <span className="tok-c"># Publish a notification</span>{'\n'}
                <span className="tok-n">curl</span> <span className="tok-kw">-X POST</span> http://localhost:3000/api/deploy \{'\n'}
                {'  '}<span className="tok-kw">-H</span> <span className="tok-s">"Content-Type: application/json"</span> \{'\n'}
                {'  '}<span className="tok-kw">-d</span> <span className="tok-s">{'\'{"title":"Deploy complete","message":"v2.4.1","type":"success","priority":"high","ttl":3600}\''}</span>
              </div>
              <div className="code-pane" id="pane-js">
                <span className="tok-c">{'// Subscribe to a topic'}</span>{'\n'}
                <span className="tok-kw">const</span> <span className="tok-n">es</span> = <span className="tok-kw">new</span> <span className="tok-f">EventSource</span>(<span className="tok-s">'/api/deploy'</span>){'\n\n'}
                <span className="tok-n">es</span>.<span className="tok-n">onmessage</span> = (<span className="tok-n">e</span>) {'=> {'}{'\n'}
                {'  '}<span className="tok-kw">const</span> <span className="tok-n">msg</span> = <span className="tok-n">JSON</span>.<span className="tok-f">parse</span>(<span className="tok-n">e</span>.<span className="tok-n">data</span>){'\n'}
                {'  '}console.<span className="tok-f">log</span>(<span className="tok-s">{"`[${msg.topic}] ${msg.message}`"}</span>){'\n'}
                {'}'}
              </div>
              <div className="code-pane" id="pane-python">
                <span className="tok-c"># Publish from Python</span>{'\n'}
                <span className="tok-kw">import</span> <span className="tok-n">requests</span>{'\n\n'}
                <span className="tok-n">requests</span>.<span className="tok-f">post</span>(<span className="tok-s">"http://localhost:3000/api/alerts"</span>, <span className="tok-n">json</span>={'={'}{'{'}{'{'}{'\n'}
                {'    '}<span className="tok-s">"message"</span>: <span className="tok-s">"Disk usage at 92%"</span>,{'\n'}
                {'    '}<span className="tok-s">"type"</span>:    <span className="tok-s">"warning"</span>,{'\n'}
                {'    '}<span className="tok-s">"priority"</span>: <span className="tok-s">"urgent"</span>,{'\n'}
                {'    '}<span className="tok-s">"tags"</span>:    [<span className="tok-s">"infra"</span>, <span className="tok-s">"prod"</span>],{'\n'}
                {'}'}{'}'}{'}'}){'\n'}
              </div>
              <div className="code-pane" id="pane-schedule">
                <span className="tok-c"># Schedule a message to send in 30 minutes</span>{'\n'}
                <span className="tok-n">curl</span> <span className="tok-kw">-X POST</span> http://localhost:3000/api/maintenance \{'\n'}
                {'  '}<span className="tok-kw">-H</span> <span className="tok-s">"Content-Type: application/json"</span> \{'\n'}
                {'  '}<span className="tok-kw">-d</span> <span className="tok-s">{'\'{"message":"Maintenance starting","delay":"30m","type":"warning"}\''}</span>{'\n\n'}
                <span className="tok-c"># Check pending scheduled messages</span>{'\n'}
                <span className="tok-n">curl</span> http://localhost:3000/api/scheduled
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="l-stats">
          {[
            { num: '0',    label: 'dependencies for notifications' },
            { num: '3',    label: 'platforms — mac, windows, linux' },
            { num: '<1s',  label: 'message delivery latency' },
            { num: '∞',    label: 'topics, no limits' },
          ].map(({ num, label }, i) => (
            <div key={label} className={`fade-up ${i > 0 ? `stagger-${Math.min(i, 3)}` : ''}`} style={{ textAlign: 'center' }}>
              <div className="stat-num">{num}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <section className="l-section" id="features">
          <div className="l-section-label">Features</div>
          <h2 className="l-section-title">Everything you need,<br/><em>nothing you don't</em></h2>
          <div className="feature-grid">
            {[
              { icon: '📡', bg: 'rgba(61,107,255,0.12)',  title: 'Real-time SSE',             desc: 'Messages delivered instantly. History replayed on reconnect — never miss a notification.' },
              { icon: '🗄️', bg: 'rgba(46,204,113,0.12)',  title: 'Persistent history',        desc: 'SQLite-backed store. Survives restarts. Full-text search across all topics.' },
              { icon: '🔗', bg: 'rgba(100,144,255,0.12)', title: 'Outgoing webhooks',          desc: 'POST to Slack, Discord, or any URL on every message. HMAC signing included.' },
              { icon: '⏰', bg: 'rgba(245,166,35,0.12)',  title: 'Scheduled messages',         desc: 'Delay delivery with "delay=5m". Schedule maintenance windows, reminders, and more.' },
              { icon: '⏱️', bg: 'rgba(46,204,113,0.12)',  title: 'Message expiry',             desc: 'TTL per message. Expired messages are hidden and auto-purged every 10 minutes.' },
              { icon: '🔐', bg: 'rgba(245,166,35,0.12)',  title: 'Token auth',                 desc: 'Single env var protects all endpoints. Browser login page, Authorization header for scripts.' },
              { icon: '🛡️', bg: 'rgba(255,95,95,0.12)',   title: 'Rate limiting',              desc: 'Configurable per-topic message rate. Prevents runaway scripts from flooding your inbox.' },
              { icon: '🖥️', bg: 'rgba(255,95,95,0.12)',   title: 'Native OS notifications',   desc: 'osascript on macOS, PowerShell on Windows, notify-send on Linux. Zero installs.' },
              { icon: '✈️', bg: 'rgba(100,144,255,0.12)', title: 'Telegram relay',             desc: 'Forward every notification to your phone via a Telegram bot. Works from anywhere.' },
              { icon: '📋', bg: 'rgba(61,107,255,0.12)',  title: 'Message templates',          desc: 'Save and reuse common messages. One click to fill the send form from a template.' },
              { icon: '🔍', bg: 'rgba(46,204,113,0.12)',  title: 'Full-text search',           desc: 'Search by keyword, topic, type, or priority. Instant results across your entire history.' },
              { icon: '📌', bg: 'rgba(245,166,35,0.12)',  title: 'Pinned topics + unread',     desc: 'Pin important topics to the top. Unread badges show new messages at a glance.' },
              { icon: '📱', bg: 'rgba(100,144,255,0.12)', title: 'PWA + installable',          desc: 'Install on your phone home screen. Service worker caches the shell for instant loads.' },
              { icon: '🌙', bg: 'rgba(245,166,35,0.12)',  title: 'Dark & light mode',          desc: 'Follows OS preference. Toggle anytime — persists across sessions.' },
              { icon: '🐳', bg: 'rgba(61,107,255,0.12)',  title: 'Docker',                     desc: 'One command to deploy. Data persisted to a named volume. Health check included.' },
            ].map(({ icon, bg, title, desc }, i) => (
              <div key={title} className={`feature-card fade-up ${i % 3 === 1 ? 'stagger-1' : i % 3 === 2 ? 'stagger-2' : ''}`}>
                <div className="feature-icon" style={{ background: bg }}>{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="l-section" id="how" style={{ paddingTop: 0 }}>
          <div className="l-section-label">How it works</div>
          <h2 className="l-section-title">Up and running<br/>in <em>three steps</em></h2>
          <div className="steps">
            {[
              { n: '01', title: 'Start the server', body: 'Install and run. Beacon binds to all interfaces so any device on your network can reach it. Or deploy with Docker in one command.', code: 'npm install && npm run dev -- --hostname 0.0.0.0\n# or\ndocker compose up -d' },
              { n: '02', title: 'Subscribe to a topic', body: 'Open any topic URL in your browser. Topics are created on demand — no setup needed. Subscribe programmatically with EventSource.', code: 'open http://localhost:3000/t/my-topic' },
              { n: '03', title: 'Publish from anywhere', body: 'POST from a script, CI pipeline, cron job, or another service. Plain text, JSON, or ntfy-compatible headers all work.', code: 'curl -d "Hello" localhost:3000/api/my-topic' },
            ].map(({ n, title, body, code }, i) => (
              <div key={n} className={`step fade-up ${i > 0 ? `stagger-${i}` : ''}`}>
                <div className="step-num">{n} —</div>
                <h3>{title}</h3>
                <p>{body}</p>
                <pre className="step-code">{code}</pre>
              </div>
            ))}
          </div>
        </section>

        {/* Notification types */}
        <section className="l-section" id="notifications" style={{ paddingTop: 0 }}>
          <div className="l-section-label">Notification types</div>
          <h2 className="l-section-title">Four types,<br/><em>four priorities</em></h2>
          <div className="notif-grid">
            <div className="notif-card fade-up">
              <div className="notif-card-hdr">Message types</div>
              {[
                { cls: 'success', icon: '✅', title: 'Deploy complete',        msg: 'v2.4.1 is live on production',        meta: 'type: success · #deploy #prod', url: true },
                { cls: 'error',   icon: '❌', title: 'Database connection lost', msg: 'Cannot reach postgres on port 5432',  meta: 'type: error · #infra #db' },
                { cls: 'warning', icon: '⚠️', title: 'Disk usage high',         msg: 'Volume /data is at 91% capacity',     meta: 'type: warning · #infra' },
                { cls: 'info',    icon: 'ℹ️', title: 'Backup started',          msg: 'Nightly snapshot running for db-prod', meta: 'type: info · #backup' },
              ].map(({ cls, icon, title, msg, meta, url }) => (
                <div key={title} className={`notif-bubble ${cls}`}>
                  <div className={`notif-icon ${cls}`}>{icon}</div>
                  <div>
                    <div className="notif-title">{title}</div>
                    <div className="notif-msg">{msg}</div>
                    <div className="notif-meta">{meta}</div>
                    {url && <div className="notif-url-btn">🔗 Open app</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="notif-card fade-up stagger-1">
              <div className="notif-card-hdr">Priority levels</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '🚨', label: 'urgent',  desc: 'Sound · OS notification · Telegram',  color: 'var(--error)',   bg: 'rgba(255,95,95,0.07)',   badge: 'rgba(255,95,95,0.15)' },
                  { icon: '⚠️', label: 'high',    desc: 'OS notification · Telegram alert',     color: 'var(--warning)', bg: 'rgba(245,166,35,0.07)', badge: 'rgba(245,166,35,0.15)' },
                  { icon: '🔔', label: 'default', desc: 'OS notification · Telegram alert',     color: 'var(--info)',    bg: 'rgba(100,144,255,0.07)',badge: 'rgba(100,144,255,0.15)' },
                  { icon: '🔕', label: 'low',     desc: 'Web UI only · silent',                 color: 'var(--faint)',   bg: 'rgba(255,255,255,0.03)',badge: 'rgba(255,255,255,0.06)' },
                ].map(({ icon, label, desc, color, bg, badge }) => (
                  <div key={label} style={{ display:'flex',alignItems:'center',gap:10,padding:10,background:bg,borderRadius:7,borderLeft:`3px solid ${color}` }}>
                    <span style={{ fontSize:16 }}>{icon}</span>
                    <div>
                      <div className="notif-title">{label}</div>
                      <div className="notif-msg" style={{ fontSize:11 }}>{desc}</div>
                    </div>
                    <span style={{ marginLeft:'auto',fontFamily:'var(--mono)',fontSize:10,color,background:badge,padding:'2px 7px',borderRadius:4 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="l-cta">
          <h2>Ready to <em>cut the noise?</em></h2>
          <p>Beacon is running locally. Open the dashboard and send your first notification.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="l-btn-primary" style={{ display: 'inline-block', fontSize: 15, padding: '13px 32px' }}>Open Beacon →</Link>
            <Link href="/docs" className="l-btn-ghost" style={{ display: 'inline-block', fontSize: 13, padding: '13px 24px' }}>API docs</Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="l-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BeaconIcon size={14}/> Beacon</div>
          <div>Self-hosted. Your data. Your rules.</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/dashboard" style={{ color: 'var(--faint)' }}>Dashboard</Link>
            <Link href="/docs"      style={{ color: 'var(--faint)' }}>API docs</Link>
            <Link href="/settings"  style={{ color: 'var(--faint)' }}>Settings</Link>
          </div>
        </footer>
      </div>
    </>
  )
}

function BeaconIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="48" r="20" stroke="#3d6bff" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="55 999" strokeDashoffset="-20" opacity=".4"/>
      <circle cx="24" cy="48" r="13" stroke="#3d6bff" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="36 999" strokeDashoffset="-13" opacity=".65"/>
      <circle cx="24" cy="48" r="6"  stroke="#3d6bff" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="17 999" strokeDashoffset="-6"  opacity=".9"/>
      <rect x="21" y="14" width="6" height="28" rx="2" fill="#3d6bff"/>
      <polygon points="12,42 36,42 31,48 17,48" fill="#3d6bff" opacity=".6"/>
      <circle cx="24" cy="12" r="4" fill="#6490ff"/>
    </svg>
  )
}

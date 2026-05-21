'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          [data-as-main] { margin-left: 0 !important; }
        }
      `}</style>

      {/* Mobile hamburger */}
      <button
        data-as-hamburger
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
        style={{
          position: 'fixed', top: 12, left: 12, zIndex: 90,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          cursor: 'pointer',
          padding: '6px 8px',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main data-as-main style={{ flex: 1, minWidth: 0, marginLeft: 0 }}>
          {children}
        </main>
      </div>
    </>
  )
}

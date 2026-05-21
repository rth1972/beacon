'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Test the token against the API
    const res = await fetch('/api/topics?list=1', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      document.cookie = `ntfy_token=${token}; path=/; max-age=${60 * 60 * 24 * 30}`
      router.push('/')
    } else {
      setError('Invalid token')
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: 12,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 360,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
          Beacon
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
          Enter your access token to continue.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="Access token"
            value={token}
            onChange={e => { setToken(e.target.value); setError('') }}
            autoFocus
            style={{
              background: 'var(--bg-input)',
              border: `1px solid ${error ? '#e74c3c' : 'var(--border-input)'}`,
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: 14,
              padding: '10px 12px',
              outline: 'none',
            }}
          />
          {error && <p style={{ color: '#e74c3c', fontSize: 13 }}>{error}</p>}
          <button
            type="submit"
            disabled={!token.trim()}
            style={{
              background: token.trim() ? 'var(--accent)' : 'var(--bg-btn-off)',
              color: token.trim() ? '#fff' : 'var(--text-faint)',
              border: 'none',
              borderRadius: 6,
              padding: '10px',
              fontSize: 14,
              fontWeight: 600,
              cursor: token.trim() ? 'pointer' : 'default',
            }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}

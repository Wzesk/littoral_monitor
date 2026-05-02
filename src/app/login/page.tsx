'use client'

import { FormEvent, useState } from 'react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setIsSubmitting(false)

    if (!response.ok) {
      setError('Incorrect password.')
      return
    }

    const requestedPath = new URLSearchParams(window.location.search).get('next') || '/'
    const nextPath = requestedPath.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/'
    window.location.assign(nextPath)
  }

  return (
    <main style={{
      display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center',
      background: '#fff', padding: '0 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ borderBottom: '1px solid var(--ca-line)', paddingBottom: 20, marginBottom: 24 }}>
          <img src="/assets/coastal-logo-mark.png" alt="coastal assembly" style={{ width: 32, marginBottom: 12 }}/>
          <div style={{ font: '300 22px/1.2 var(--font-sans)', marginBottom: 6 }}>coastal · monitor</div>
          <div style={{ font: '300 13px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>
            enter the site password to continue.
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', font: '600 10px/1 var(--font-sans)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6 }}>
              password
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="enter password"
              style={{
                width: '100%', height: 38, padding: '0 10px', boxSizing: 'border-box',
                border: '1px solid var(--ca-line)', background: '#fff',
                font: '400 13px/1 var(--font-sans)', color: 'var(--fg)', borderRadius: 0,
              }}
            />
          </div>
          {error && <p style={{ font: '400 12px/1 var(--font-sans)', color: '#ff3b46', margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting || !password}
            style={{
              height: 38, background: '#000', color: '#fff', border: 0,
              font: '400 13px/1 var(--font-sans)', cursor: isSubmitting || !password ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || !password ? 0.5 : 1,
            }}
          >
            {isSubmitting ? 'checking…' : 'continue'}
          </button>
        </form>
      </div>
    </main>
  )
}

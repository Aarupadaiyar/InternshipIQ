'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed')
      }

      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user_email', email)
      
      // Attempt to load profile from backend, or redirect to onboarding
      const userRes = await fetch('http://localhost:8000/auth/me', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      })
      
      if (userRes.ok) {
        const userData = await userRes.json()
        localStorage.setItem('user_name', userData.full_name)
        
        // Fetch dashboard data to see if onboarding is completed
        const dashRes = await fetch('http://localhost:8000/dashboard/profile', {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        })
        
        if (dashRes.ok) {
          const dashData = await dashRes.json()
          if (dashData.profile) {
            localStorage.setItem('iq_user', JSON.stringify({
              profile: dashData.profile,
              prefs: dashData.preferences || { roles: [], domains: [], locations: [], remote: 'any' },
              skills: dashData.profile.skills || []
            }))
            router.push('/dashboard')
            return
          }
        }
      }
      
      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Network connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card fade-up" style={{ width: '100%', maxWidth: 420, padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)' }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 16, letterSpacing: '0.04em' }}>INTERNSHIP<span style={{ color: 'var(--amber)' }}>IQ</span></span>
          </div>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 400, marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Log in to access your dashboard and matched internships</p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--red-dim)', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: 13, marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: 6, textTransform: 'uppercase' }}>Email address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', padding: '10px 14px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: 6, textTransform: 'uppercase' }}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px 14px' }} />
          </div>

          <button type="submit" disabled={loading} className="btn-amber" style={{ width: '100%', padding: '12px', marginTop: 8, fontSize: 15 }}>
            {loading ? 'Logging in...' : 'Log in →'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 500 }}>Sign up</Link>
        </div>
      </div>
    </div>
  )
}

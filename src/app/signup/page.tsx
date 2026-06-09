'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Register
      const registerRes = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      })

      const registerData = await registerRes.json()
      if (!registerRes.ok) {
        throw new Error(registerData.detail || 'Registration failed')
      }

      // 2. Automatically log in after registration
      const loginRes = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const loginData = await loginRes.json()
      if (!loginRes.ok) {
        throw new Error('Registration succeeded but auto-login failed. Please log in manually.')
      }

      localStorage.setItem('token', loginData.access_token)
      localStorage.setItem('refresh_token', loginData.refresh_token)
      localStorage.setItem('user_email', email)
      localStorage.setItem('user_name', fullName)
      localStorage.removeItem('iq_user') // Clear local storage caches for clean onboarding

      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Network connection failed')
    } finally {
      setLoading(false)
    }
  }
  const handleOAuthLogin = (provider: 'google' | 'github') => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'mock';
    const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'mock';
    const redirectUri = `${window.location.origin}/auth/callback/${provider}`;

    if (provider === 'google') {
      if (googleClientId === 'mock' || googleClientId === '') {
        router.push(`/auth/callback/google?code=mock_code_google`);
      } else {
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;
        window.location.href = authUrl;
      }
    } else {
      if (githubClientId === 'mock' || githubClientId === '') {
        router.push(`/auth/callback/github?code=mock_code_github`);
      } else {
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
        window.location.href = authUrl;
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-grid pointer-events-none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />

      <div className="neo-card" style={{ width: '100%', maxWidth: 440, padding: '3rem 2.5rem', background: 'var(--bg-2)', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <div 
                style={{ 
                  border: '3px solid var(--border)',
                  background: 'var(--amber)',
                  color: '#000000',
                  padding: '4px 12px',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 900,
                  fontSize: 14,
                  letterSpacing: '0.08em',
                  boxShadow: '3px 3px 0px var(--shadow)',
                  transform: 'rotate(-1.5deg)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#000000' }} />
                <span>INTERNSHIP<span style={{ color: 'var(--indigo)' }}>IQ</span></span>
              </div>
            </Link>
          </div>
          <h1 className="font-display" style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, textTransform: 'uppercase' }}>Get started</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13, fontWeight: 700 }}>Create an account to build your resume matches</p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--red-dim)', border: '2px solid var(--red)', color: 'var(--text)', fontSize: 13, fontWeight: 900, marginBottom: '1.5rem' }}>
            ✕ {error.toUpperCase()}
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: 6, textTransform: 'uppercase' }}>Full Name</label>
            <input 
              type="text" 
              required 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              placeholder="Aarav Kumar" 
              className="neo-input"
              style={{ width: '100%', height: '48px' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: 6, textTransform: 'uppercase' }}>Email address</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="you@example.com" 
              className="neo-input"
              style={{ width: '100%', height: '48px' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: 6, textTransform: 'uppercase' }}>Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="neo-input"
              style={{ width: '100%', height: '48px' }} 
            />
          </div>

          <button type="submit" disabled={loading} className="neo-btn" style={{ width: '100%', padding: '12px', marginTop: 12, fontSize: 14, background: 'var(--amber)' }}>
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', gap: 10 }}>
          <div style={{ flex: 1, height: '2px', background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 900, textTransform: 'uppercase' }}>or continue with</span>
          <div style={{ flex: 1, height: '2px', background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button 
            type="button" 
            onClick={() => handleOAuthLogin('google')}
            className="neo-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 8, 
              padding: '10px', 
              background: 'var(--bg-2)', 
              fontSize: 13,
              fontWeight: 900
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button 
            type="button" 
            onClick={() => handleOAuthLogin('github')}
            className="neo-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 8, 
              padding: '10px', 
              background: 'var(--bg-2)', 
              fontSize: 13,
              fontWeight: 900
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            GitHub
          </button>
        </div>


        <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: 13, color: 'var(--text-2)', fontWeight: 700 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--indigo)', textDecoration: 'underline', fontWeight: 900 }}>Log in</Link>
        </div>
      </div>
    </div>
  )
}

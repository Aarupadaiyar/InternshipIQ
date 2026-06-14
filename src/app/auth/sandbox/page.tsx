'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SandboxContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Detect provider from URL, default to google
  const initialProvider = searchParams.get('provider') === 'github' ? 'github' : 'google'
  
  const [provider, setProvider] = useState<'google' | 'github'>(initialProvider)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [oauthId, setOauthId] = useState('')
  
  // Standard preset profiles
  const PRESETS = {
    google: [
      { name: 'Aditi Sharma', email: 'aditi.sharma@example.com', id: 'google_mock_aditi_54321' },
      { name: 'Rohan Verma', email: 'rohan.verma@example.com', id: 'google_mock_rohan_98765' }
    ],
    github: [
      { name: 'Karan Patel', email: 'karan.patel@example.com', id: 'github_mock_karan_11223' },
      { name: 'Ananya Rao', email: 'ananya.rao@example.com', id: 'github_mock_ananya_44556' }
    ]
  }

  // Handle URL change or initial render
  useEffect(() => {
    const prov = searchParams.get('provider') === 'github' ? 'github' : 'google'
    setProvider(prov)
    // Select first preset as default
    const firstPreset = PRESETS[prov][0]
    setName(firstPreset.name)
    setEmail(firstPreset.email)
    setOauthId(firstPreset.id)
  }, [searchParams])

  const selectPreset = (preset: { name: string; email: string; id: string }) => {
    setName(preset.name)
    setEmail(preset.email)
    setOauthId(preset.id)
  }

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !oauthId.trim()) {
      alert('All fields are required to mock OAuth authorize flow.')
      return
    }

    // Format: mock_code_google:email:name:oauthId
    // Replace any colon in variables to avoid split bugs on the backend
    const cleanEmail = email.trim().replace(/:/g, '')
    const cleanName = name.trim().replace(/:/g, '')
    const cleanId = oauthId.trim().replace(/:/g, '')
    
    const code = `mock_code_${provider}:${cleanEmail}:${cleanName}:${cleanId}`
    const callbackUrl = `/auth/callback/${provider}?code=${encodeURIComponent(code)}`
    
    router.push(callbackUrl)
  }

  return (
    <div style={{ maxWidth: 520, width: '100%', padding: '2rem' }}>
      
      {/* Neo-brutalist header card */}
      <div 
        className="neo-card" 
        style={{ 
          background: 'var(--amber)', 
          padding: '1rem', 
          marginBottom: '1.5rem', 
          textAlign: 'center',
          transform: 'rotate(-0.8deg)',
          borderWidth: 4,
          boxShadow: '4px 4px 0px var(--shadow)'
        }}
      >
        <span style={{ fontSize: 10, fontFamily: 'Space Grotesk', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#000000' }}>
          ⚠️ LOCAL DEVELOPMENT ENVIRONMENT
        </span>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 900, margin: '4px 0 0', textTransform: 'uppercase', color: '#000000' }}>
          OAuth Sandbox Gateway
        </h1>
      </div>

      <div className="neo-card" style={{ background: 'var(--bg-2)', padding: '2.5rem 2rem', borderWidth: 4, position: 'relative' }}>
        
        {/* Provider Switcher Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '2rem' }}>
          <button
            type="button"
            onClick={() => {
              setProvider('google')
              selectPreset(PRESETS.google[0])
            }}
            className="neo-btn"
            style={{
              padding: '10px',
              fontSize: 13,
              fontWeight: 900,
              background: provider === 'google' ? 'var(--indigo)' : 'var(--bg-3)',
              color: provider === 'google' ? '#000000' : 'var(--text-3)',
              boxShadow: provider === 'google' ? '3px 3px 0px var(--shadow)' : 'none',
              transform: provider === 'google' ? 'translate(-1px, -1px)' : 'none',
            }}
          >
            Google OAuth
          </button>
          <button
            type="button"
            onClick={() => {
              setProvider('github')
              selectPreset(PRESETS.github[0])
            }}
            className="neo-btn"
            style={{
              padding: '10px',
              fontSize: 13,
              fontWeight: 900,
              background: provider === 'github' ? 'var(--indigo)' : 'var(--bg-3)',
              color: provider === 'github' ? '#000000' : 'var(--text-3)',
              boxShadow: provider === 'github' ? '3px 3px 0px var(--shadow)' : 'none',
              transform: provider === 'github' ? 'translate(-1px, -1px)' : 'none',
            }}
          >
            GitHub OAuth
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 700, marginBottom: '1.5rem' }}>
          Production client keys for <strong>{provider.toUpperCase()}</strong> are not configured in your environment. Use this sandbox to mock consent, select mock accounts, and authorize permissions.
        </p>

        {/* Preset profiles picker */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: 8, textTransform: 'uppercase' }}>
            Choose a mock profile preset
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRESETS[provider].map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset(p)}
                className="neo-btn"
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  background: 'var(--bg-3)',
                  borderWidth: 2,
                  boxShadow: email === p.email ? '2px 2px 0px var(--shadow)' : 'none',
                  borderColor: email === p.email ? 'var(--amber)' : 'var(--border)',
                  transform: email === p.email ? 'translate(-1px, -1px)' : 'none',
                }}
              >
                👤 Preset {idx + 1}: {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleAuthorize} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: 6, textTransform: 'uppercase' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="neo-input"
              style={{ width: '100%', height: '42px', fontWeight: 900 }}
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: 6, textTransform: 'uppercase' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="neo-input"
              style={{ width: '100%', height: '42px', fontWeight: 900 }}
              placeholder="e.g. jane@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: 6, textTransform: 'uppercase' }}>
              OAuth Account Sub/ID
            </label>
            <input
              type="text"
              required
              value={oauthId}
              onChange={e => setOauthId(e.target.value)}
              className="neo-input"
              style={{ width: '100%', height: '42px', fontFamily: 'JetBrains Mono', fontSize: 12 }}
              placeholder="e.g. google_id_123"
            />
          </div>

          {/* Scope list section */}
          <div style={{ padding: '1rem', background: 'var(--bg-3)', border: '2px solid var(--border)', marginTop: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: 8, textTransform: 'uppercase' }}>
              REQUESTED PERMISSIONS (SCOPES)
            </div>
            {provider === 'google' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700 }}>
                <div>✓ openid <span style={{ color: 'var(--text-3)' }}>(Unique identifier)</span></div>
                <div>✓ email <span style={{ color: 'var(--text-3)' }}>(View your email address)</span></div>
                <div>✓ profile <span style={{ color: 'var(--text-3)' }}>(View your name and photo)</span></div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700 }}>
                <div>✓ user:email <span style={{ color: 'var(--text-3)' }}>(Read primary email address)</span></div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="neo-btn"
            style={{
              width: '100%',
              padding: '12px',
              marginTop: 16,
              fontSize: 14,
              fontWeight: 900,
              background: 'var(--amber)',
              borderColor: 'var(--border)'
            }}
          >
            GRANT MOCK CONSENT & AUTHORIZE →
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link href="/login" style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 900, textDecoration: 'underline' }}>
            ← Cancel and Return to Login
          </Link>
        </div>

      </div>
    </div>
  )
}

export default function SandboxOAuthPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div className="absolute inset-0 bg-grid pointer-events-none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />
      <Suspense fallback={
        <div className="neo-card" style={{ width: '100%', maxWidth: 440, padding: '3rem 2.5rem', background: 'var(--bg-2)', textAlign: 'center', borderWidth: 4 }}>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 900 }}>LOADING SANDBOX...</h1>
        </div>
      }>
        <SandboxContent />
      </Suspense>
    </div>
  )
}

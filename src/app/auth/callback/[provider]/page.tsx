'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function CallbackContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  const provider = params?.provider as string
  const code = searchParams.get('code')

  useEffect(() => {
    if (!provider || !code) {
      setError('Invalid callback request parameters')
      return
    }

    const completeOAuth = async () => {
      try {
        const endpoint = `http://localhost:8000/auth/${provider}-login`
        const redirectUri = `${window.location.origin}/auth/callback/${provider}`
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirect_uri: redirectUri })
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.detail || `${provider} login failed`)
        }

        // Set storage tokens
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        localStorage.setItem('user_email', data.user.email)
        localStorage.setItem('user_name', data.user.full_name)

        // Clear local cache for clean onboarding onboarding page
        localStorage.removeItem('iq_user')

        // Fetch onboarding / profile state
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

        router.push('/onboarding')
      } catch (err: any) {
        setError(err.message || 'Verification failed')
      }
    }

    completeOAuth()
  }, [provider, code, router])

  return (
    <div className="neo-card" style={{ width: '100%', maxWidth: 440, padding: '3rem 2.5rem', background: 'var(--bg-2)', position: 'relative', zIndex: 1, textAlign: 'center' }}>
      <h1 className="font-display" style={{ fontSize: 24, fontWeight: 900, marginBottom: 16, textTransform: 'uppercase' }}>
        {error ? 'AUTHENTICATION FAILED' : 'AUTHENTICATING...'}
      </h1>

      {error ? (
        <div>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--red-dim)', border: '2px solid var(--red)', color: 'var(--text)', fontSize: 13, fontWeight: 900, marginBottom: '1.5rem' }}>
            ✕ {error.toUpperCase()}
          </div>
          <Link href="/login" className="neo-btn" style={{ display: 'inline-block', textDecoration: 'none', padding: '12px 24px', background: 'var(--amber)', fontSize: 13, fontWeight: 900 }}>
            ← BACK TO LOGIN
          </Link>
        </div>
      ) : (
        <div>
          <p style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 700, marginBottom: 24 }}>
            Verifying credentials with {provider === 'google' ? 'Google' : 'GitHub'}...
          </p>
          <div className="animate-pulse" style={{ display: 'inline-flex', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--indigo)', animation: 'bounce 0.6s infinite alternate' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--amber)', animation: 'bounce 0.6s infinite alternate 0.2s' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--indigo)', animation: 'bounce 0.6s infinite alternate 0.4s' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      <div className="absolute inset-0 bg-grid pointer-events-none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />
      <Suspense fallback={
        <div className="neo-card" style={{ width: '100%', maxWidth: 440, padding: '3rem 2.5rem', background: 'var(--bg-2)', textAlign: 'center' }}>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 900, marginBottom: 16 }}>LOADING...</h1>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  )
}

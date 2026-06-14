'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function NavBar({ name: propName }: { name?: string }) {
  const path = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState(propName || '')
  const [theme, setTheme] = useState('dark')
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    // Read session username
    if (!userName && typeof window !== 'undefined') {
      const storedName = localStorage.getItem('user_name')
      if (storedName) setUserName(storedName)
    }

    // Initialize theme from storage
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') || 'dark'
      setTheme(storedTheme)
      document.documentElement.setAttribute('data-theme', storedTheme)
    }

    // Check Premium Status
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      fetch('http://localhost:8000/payments/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json()
          return { is_premium: false }
        })
        .then(data => {
          setIsPremium(!!data.is_premium)
        })
        .catch(() => {})
    }
  }, [propName, userName])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        await fetch('http://localhost:8000/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        })
      } catch (err) {
        console.error('Failed to notify backend logout:', err)
      }
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_name')
    localStorage.removeItem('iq_user')
    router.push('/')
  }

  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token')

  const links = isLoggedIn
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/jobs', label: 'Jobs' },
        { href: '/gaps', label: 'Skill Gaps' },
        { href: '/about', label: 'About' },
        { href: '/analytics', label: 'Analytics' },
        { href: '/pricing', label: 'Pricing' },
        { href: '/developer', label: 'About Developer' },
        { href: '/profile', label: 'Profile' },
      ]
    : [
        { href: '/about', label: 'About' },
        { href: '/jobs', label: 'Browse Jobs' },
        { href: '/analytics', label: 'Analytics' },
        { href: '/pricing', label: 'Pricing' },
        { href: '/developer', label: 'About Developer' },
      ]

  return (
    <nav style={{ borderBottom: '4px solid var(--border)', padding: '0 2rem', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 100, transition: 'background 0.3s, border-color 0.3s' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        
        {/* Bold Logo Box */}
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

        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          
          {/* Nav Links */}
          {links.map(l => (
            <Link 
              key={l.href} 
              href={l.href}
              className={`nav-link ${path === l.href ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
          
          {/* Neo-brutalist Theme Toggler */}
          <button 
            onClick={toggleTheme} 
            style={{ 
              background: 'var(--bg-2)', 
              border: '3px solid var(--border)', 
              boxShadow: '2px 2px 0px var(--shadow)',
              cursor: 'pointer', 
              fontSize: 15, 
              padding: '6px', 
              borderRadius: '50%',
              display: 'flex', 
              alignItems: 'center', 
              color: 'var(--text)',
              transition: 'transform 0.1s ease',
            }} 
            className="hover:scale-105 active:scale-95"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {isLoggedIn ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {isPremium && (
                <span className="neo-badge" style={{ background: 'var(--amber)', color: '#000000', fontSize: 9, padding: '2px 6px', fontWeight: 900, transform: 'rotate(-2deg)' }}>
                  👑 PREMIUM
                </span>
              )}
              <div 
                style={{ 
                  width: 32, 
                  height: 32, 
                  border: isPremium ? '2.5px solid var(--amber)' : '2px solid var(--border)',
                  boxShadow: '2px 2px 0px var(--shadow)',
                  background: isPremium ? 'var(--amber)' : 'var(--neo-violet)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 13, 
                  color: '#000000', 
                  fontWeight: 900 
                }} 
                title={userName}
              >
                {userName.charAt(0).toUpperCase() || 'U'}
              </div>
              <button 
                onClick={handleLogout} 
                style={{ 
                  background: 'var(--bg-2)', 
                  color: 'var(--text)', 
                  border: '2px solid var(--border)', 
                  fontSize: 12, 
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0px var(--shadow)',
                }}
                className="hover:bg-[var(--indigo)] hover:text-black"
              >
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Link href="/login" className="nav-link">Log in</Link>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button 
                  className="neo-btn" 
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: 13, 
                    border: '3px solid var(--border)',
                    boxShadow: '3px 3px 0px var(--shadow)' 
                  }}
                >
                  Sign up
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

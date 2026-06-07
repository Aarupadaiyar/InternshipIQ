'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function NavBar({ name: propName }: { name?: string }) {
  const path = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState(propName || '')
  const [theme, setTheme] = useState('dark')

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
  }, [propName, userName])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
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
        { href: '/profile', label: 'Profile' },
      ]
    : [
        { href: '/jobs', label: 'Browse Jobs' }
      ]

  return (
    <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 2rem', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 100, transition: 'background 0.3s, border-color 0.3s' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)' }} />
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 14, letterSpacing: '0.04em', color: 'var(--text)' }}>
            INTERNSHIP<span style={{ color: 'var(--amber)' }}>IQ</span>
          </span>
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {links.map(l => (
            <Link key={l.href} href={l.href}
              style={{ fontSize: 14, textDecoration: 'none', color: path === l.href ? 'var(--amber)' : 'var(--text-2)', transition: 'color 0.15s' }}>
              {l.label}
            </Link>
          ))}
          
          {/* Theme Toggler */}
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-2)' }} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {isLoggedIn ? (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--amber)', fontWeight: 600 }} title={userName}>
                {userName.charAt(0).toUpperCase() || 'U'}
              </div>
              <button onClick={handleLogout} className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}>
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Link href="/login" style={{ fontSize: 14, color: 'var(--text-2)', textDecoration: 'none' }}>Log in</Link>
              <Link href="/signup">
                <button className="btn-amber" style={{ padding: '6px 14px', fontSize: 13 }}>Sign up</button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

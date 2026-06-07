'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const ROTATING_ROLES = [
  'Frontend Engineer', 
  'Backend Engineer', 
  'Full Stack Developer', 
  'Product Designer', 
  'Product Manager', 
  'DevOps Engineer', 
  'Data Analyst', 
  'ML Engineer', 
  'AI Researcher', 
  'Cybersecurity Analyst'
]

export default function LandingPage() {
  const [roleIdx, setRoleIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoggedIn(!!localStorage.getItem('token'))
    }

    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => { 
        setRoleIdx(i => (i + 1) % ROTATING_ROLES.length)
        setVisible(true) 
      }, 300)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s' }}>
      <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)' }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 15, letterSpacing: '0.04em' }}>INTERNSHIP<span style={{ color: 'var(--amber)' }}>IQ</span></span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link href="/jobs" className="nav-link">Browse jobs</Link>
            {isLoggedIn ? (
              <Link href="/dashboard">
                <button className="btn-amber" style={{ padding: '8px 20px', fontSize: 14 }}>Dashboard →</button>
              </Link>
            ) : (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <Link href="/login" className="nav-link">Log in</Link>
                <Link href="/signup">
                  <button className="btn-amber" style={{ padding: '8px 20px', fontSize: 14 }}>Get started →</button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '6rem 2rem 4rem' }}>
        <div style={{ maxWidth: 720 }}>
          <div className="tag tag-amber" style={{ marginBottom: '1.5rem' }}>LinkedIn · Internshala · Unstop · Active verified listings</div>
          <h1 className="font-display" style={{ fontSize: 'clamp(42px, 5.5vw, 68px)', lineHeight: 1.15, marginBottom: '1.5rem', fontWeight: 400 }}>
            Find your next internship as a<br />
            <span style={{ color: 'var(--amber)', transition: 'opacity 0.3s', opacity: visible ? 1 : 0, display: 'inline-block', minWidth: 320 }}>
              {ROTATING_ROLES[roleIdx]}
            </span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 560, marginBottom: '2.5rem' }}>
            A personalized portal matching your skills, projects, and location choices against thousands of live internship roles from all major portals.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {isLoggedIn ? (
              <Link href="/dashboard"><button className="btn-amber" style={{ padding: '14px 32px', fontSize: 16 }}>Go to Dashboard →</button></Link>
            ) : (
              <Link href="/signup"><button className="btn-amber" style={{ padding: '14px 32px', fontSize: 16 }}>Analyze my resume →</button></Link>
            )}
            <Link href="/jobs"><button className="btn-ghost" style={{ padding: '14px 24px', fontSize: 15 }}>Browse jobs</button></Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: '5rem' }}>
          {[{ n: '1,000+', label: 'Internships aggregated' }, { n: '12+', label: 'Career Domains' }, { n: 'AI', label: 'Match Intelligence' }, { n: '100%', label: 'Verified Listings' }].map(s => (
            <div key={s.label} className="card" style={{ padding: '1.25rem' }}>
              <div className="font-mono" style={{ fontSize: 28, fontWeight: 600, color: 'var(--amber)', marginBottom: 4 }}>{s.n}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid var(--border)', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p className="font-mono" style={{ fontSize: 12, color: 'var(--amber)', letterSpacing: '0.12em', marginBottom: '1rem' }}>HOW IT WORKS</p>
          <h2 className="font-display" style={{ fontSize: 40, fontWeight: 400, marginBottom: '3rem' }}>From profile to ranked matches <em>in seconds</em></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { n: '01', title: 'Create your account', body: 'Log in and sync your preferences and profile securely in our PostgreSQL database.' },
              { n: '02', title: 'Upload resume & preferences', body: 'Extract skills and target domains including Frontend, Design, Product, QA, SRE, and more.' },
              { n: '03', title: 'Get scored matches', body: 'Scores calculated across five factors. Real links directly to Internshala, Unstop, and LinkedIn.' },
              { n: '04', title: 'Close skill gaps', body: 'View learning roadmaps and tutorials for skills required by your target roles.' },
            ].map(step => (
              <div key={step.n} className="card" style={{ padding: '1.5rem' }}>
                <div className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: '0.75rem' }}>{step.n}</div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{step.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid var(--border)', padding: '4rem 2rem', textAlign: 'center' }}>
        <h2 className="font-display" style={{ fontSize: 48, fontWeight: 400, marginBottom: '1rem' }}>Stop searching.<br /><em style={{ color: 'var(--amber)' }}>Start matching.</em></h2>
        {isLoggedIn ? (
          <Link href="/dashboard"><button className="btn-amber" style={{ padding: '16px 40px', fontSize: 16, marginTop: '1.5rem' }}>Go to your dashboard →</button></Link>
        ) : (
          <Link href="/signup"><button className="btn-amber" style={{ padding: '16px 40px', fontSize: 16, marginTop: '1.5rem' }}>Create account — it&apos;s free →</button></Link>
        )}
      </div>

      <div style={{ borderTop: '0.5px solid var(--border)', padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>INTERNSHIPIQ © 2026</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Powered by PostgreSQL & FastAPI.</span>
        </div>
      </div>
    </div>
  )
}

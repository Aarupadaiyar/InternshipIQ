'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'

const ROTATING_ROLES = [
  'FRONTEND DEV', 
  'BACKEND DEV', 
  'FULLSTACK DEV', 
  'UI/UX DESIGNER', 
  'PRODUCT MGR', 
  'DEVOPS ENGINEER', 
  'DATA ANALYST', 
  'ML ENGINEER', 
  'AI RESEARCHER', 
  'CYBER ANALYST'
]

export default function LandingPage() {
  const [roleIdx, setRoleIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [jobs, setJobs] = useState<any[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)

  // 3D tilt effect state
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const box = card.getBoundingClientRect()
    const x = e.clientX - box.left - (box.width / 2)
    const y = e.clientY - box.top - (box.height / 2)
    
    // Tilt bounds (max 12 degrees)
    const rx = -(y / (box.height / 2)) * 12
    const ry = (x / (box.width / 2)) * 12
    
    setTilt({ x: ry, y: rx })
  }
  
  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

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

    // Fetch latest 6 jobs
    fetch('/api/jobs?limit=6')
      .then(res => {
        if (!res.ok) throw new Error('API failed')
        return res.json()
      })
      .then(data => {
        setJobs(data.jobs || [])
      })
      .catch(err => {
        console.error('Error fetching jobs for landing page:', err)
      })
      .finally(() => setJobsLoading(false))

    return () => clearInterval(interval)
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchVal.trim()) {
      window.location.href = `/jobs?search=${encodeURIComponent(searchVal.trim())}`
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s, color 0.3s' }}>
      
      {/* Shared Unified Header Navigation */}
      <NavBar />

      {/* Hero Container with grid/halftone overlay */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden', borderBottom: '4px solid var(--border)' }}>
        
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-grid pointer-events-none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />
        
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '7rem 2rem 5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'center' }}>
            
            {/* Left side content */}
            <div>
              {/* Bold, thick-bordered badge */}
              <div 
                className="neo-badge"
                style={{ 
                  background: 'var(--neo-violet)', 
                  color: '#000000',
                  padding: '6px 14px', 
                  marginBottom: '1.5rem', 
                  transform: 'rotate(-1deg)'
                }}
              >
                🚀 LINKEDIN · INTERNSHALA · UNSTOP · LIVE MATCHING
              </div>
              
              {/* Display Title */}
              <h1 
                className="font-display" 
                style={{ 
                  fontSize: 'clamp(44px, 6vw, 76px)', 
                  lineHeight: '0.95', 
                  marginBottom: '2rem', 
                  textTransform: 'uppercase',
                  letterSpacing: '-0.03em'
                }}
              >
                FIND YOUR NEXT<br />INTERNSHIP AS A<br />
                <span 
                  style={{ 
                    background: 'var(--amber)', 
                    border: '4px solid var(--border)', 
                    boxShadow: '4px 4px 0px var(--shadow)',
                    padding: '4px 16px',
                    color: '#000000',
                    display: 'inline-block',
                    transform: 'rotate(1deg)',
                    marginTop: '10px',
                    minWidth: 340,
                    textAlign: 'center',
                    transition: 'opacity 0.3s',
                    opacity: visible ? 1 : 0
                  }}
                >
                  {ROTATING_ROLES[roleIdx]}
                </span>
              </h1>
              
              <p style={{ fontSize: 19, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 580, marginBottom: '2.5rem', fontWeight: 700 }}>
                A personalized matching portal scoring your skills, projects, and location choices against thousands of live internship listings.
              </p>
              
              {/* Landing Page Search Box using Neo-Brutalist elements */}
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, maxWidth: 540, marginBottom: '2.5rem' }}>
                <input 
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  placeholder="SEARCH INTERNSHIPS (E.G. REACT, PYTHON)..." 
                  className="neo-input"
                  style={{ 
                    flex: 1, 
                    fontSize: 15, 
                    textTransform: 'uppercase'
                  }}
                />
                <button type="submit" className="neo-btn" style={{ padding: '0 30px', height: '56px', fontSize: 15 }}>Search</button>
              </form>

              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {isLoggedIn ? (
                  <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                    <button className="neo-btn" style={{ padding: '14px 32px', fontSize: 16, background: 'var(--indigo)' }}>Go to Dashboard →</button>
                  </Link>
                ) : (
                  <Link href="/signup" style={{ textDecoration: 'none' }}>
                    <button className="neo-btn" style={{ padding: '14px 32px', fontSize: 16, background: 'var(--indigo)' }}>Analyze my resume →</button>
                  </Link>
                )}
                <Link href="/jobs" style={{ textDecoration: 'none' }}>
                  <button className="neo-btn" style={{ padding: '14px 28px', fontSize: 15, background: 'var(--bg-2)', color: 'var(--text)' }}>Browse jobs</button>
                </Link>
              </div>
            </div>

            {/* Right Column: 3D Character retro window with parallax tilt effect */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', perspective: '1000px' }}>
              <div 
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  border: '4px solid var(--border)',
                  background: 'var(--bg-2)',
                  boxShadow: `${16 - tilt.x * 0.8}px ${16 + tilt.y * 0.8}px 0px var(--shadow)`,
                  transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) rotate(1.5deg) translateZ(10px)`,
                  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  width: '100%',
                  maxWidth: '420px',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Retro Window Title Bar */}
                <div style={{
                  background: 'var(--border)',
                  color: 'var(--bg)',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '4px solid var(--border)',
                  fontWeight: 900,
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  transform: 'translateZ(25px)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', border: '1px solid var(--bg)' }}></div>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFD93D', border: '1px solid var(--bg)' }}></div>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', border: '1px solid var(--bg)' }}></div>
                    <span style={{ marginLeft: 6 }}>IQ_AGENT_V2.EXE</span>
                  </div>
                  <span>[ACTIVE]</span>
                </div>

                {/* Content Frame */}
                <div style={{ 
                  padding: '12px', 
                  background: 'var(--bg-3)', 
                  borderBottom: '4px solid var(--border)',
                  position: 'relative',
                  overflow: 'hidden',
                  transform: 'translateZ(10px)',
                  transformStyle: 'preserve-3d',
                }}>
                  <img 
                    src="/hero-character.jpg" 
                    alt="3D InternshipIQ Agent" 
                    style={{ 
                      width: '100%', 
                      height: 'auto', 
                      border: '3px solid var(--border)',
                      display: 'block' 
                    }} 
                  />
                  {/* Dynamic Sheen overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(${135 + tilt.x * 2.5}deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 60%, rgba(0,0,0,0.15) 100%)`,
                    pointerEvents: 'none',
                    zIndex: 3,
                  }} />
                </div>

                {/* Retro Status Bar */}
                <div style={{
                  padding: '10px 16px',
                  background: 'var(--bg-2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  color: 'var(--text-2)',
                  transform: 'translateZ(20px)',
                }}>
                  <span>SYS: OK</span>
                  <span style={{ color: 'var(--green)' }}>● ONLINE_MATCHING</span>
                </div>

                {/* Floating stickers for parallax depth */}
                <div style={{
                  position: 'absolute',
                  top: '40px',
                  left: '-25px',
                  background: 'var(--indigo)',
                  color: '#000000',
                  padding: '6px 12px',
                  border: '3px solid var(--border)',
                  boxShadow: '4px 4px 0px var(--shadow)',
                  fontSize: '11px',
                  fontWeight: 900,
                  transform: 'translateZ(40px) rotate(-8deg)',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}>
                  🎯 MATCH RATE: 98%
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '-15px',
                  right: '-15px',
                  background: 'var(--amber)',
                  color: '#000000',
                  padding: '8px 16px',
                  border: '3px solid var(--border)',
                  boxShadow: '4px 4px 0px var(--shadow)',
                  fontSize: '12px',
                  fontWeight: 900,
                  transform: 'translateZ(50px) rotate(4deg)',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}>
                  🤖 IQ_AGENT.MSI
                </div>
              </div>
            </div>

          </div>

          {/* Stats grid using Neo-Brutalist cards rotated like stickers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, marginTop: '6rem' }}>
            {[
              { n: '1,000+', label: 'INTERNSHIPS AGGREGATED', rotation: '-1.5deg' }, 
              { n: '12+', label: 'CAREER DOMAINS', rotation: '1deg' }, 
              { n: 'AI', label: 'MATCH INTELLIGENCE', rotation: '-0.5deg' }, 
              { n: '100%', label: 'VERIFIED LISTINGS', rotation: '2deg' }
            ].map(s => (
              <div 
                key={s.label} 
                className="neo-card" 
                style={{ 
                  padding: '1.5rem', 
                  background: 'var(--bg-2)',
                  transform: `rotate(${s.rotation})`
                }}
              >
                <div className="font-mono" style={{ fontSize: 32, fontWeight: 900, color: 'var(--indigo)', marginBottom: 4 }}>{s.n}</div>
                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 900, letterSpacing: '0.04em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured/Latest Job Openings Section */}
      <div style={{ padding: '6rem 2rem', background: 'var(--bg)', position: 'relative', zIndex: 2, borderBottom: '4px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
            <div>
              <p className="font-mono" style={{ fontSize: 12, color: 'var(--indigo)', letterSpacing: '0.12em', marginBottom: '0.5rem', fontWeight: 900 }}>LIVE LISTINGS</p>
              <h2 className="font-display" style={{ fontSize: 40, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Latest Internship Openings</h2>
            </div>
            <Link href="/jobs" style={{ fontSize: 14, color: 'var(--indigo)', textDecoration: 'none', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
              Browse all internships <span style={{ fontSize: 16 }}>→</span>
            </Link>
          </div>

          {jobsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="card shimmer" style={{ height: 180 }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
              {jobs.map((job: any) => (
                <div 
                  key={job.id} 
                  className="neo-card" 
                  style={{ 
                    padding: '1.5rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    height: '100%', 
                    background: 'var(--bg-2)' 
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span className="neo-badge" style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-3)', color: 'var(--text)' }}>{job.source}</span>
                      {job.salary && <span className="neo-badge" style={{ fontSize: 10, padding: '2px 8px', background: 'var(--amber)', color: '#000000' }}>{job.salary}</span>}
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 6, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{job.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '1.25rem', fontWeight: 700 }}>{job.company} · {job.location} ({job.type})</p>
                  </div>
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: '1.25rem' }}>
                      {job.requiredSkills.slice(0, 3).map((s: string) => (
                        <span key={s} className="tag tag-skill">{s}</span>
                      ))}
                      {job.requiredSkills.length > 3 && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>+{job.requiredSkills.length - 3} MORE</span>
                      )}
                    </div>
                    <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <button className="neo-btn" style={{ width: '100%', padding: '9px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text)' }}>Apply on {job.source} →</button>
                    </a>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-3)', border: '4px dashed var(--border)', borderRadius: 0 }}>
                  Unable to load recent internships. Check that backend server is running on port 8000.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* How It Works Section */}
      <div style={{ borderBottom: '4px solid var(--border)', padding: '6rem 2rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p className="font-mono" style={{ fontSize: 12, color: 'var(--indigo)', letterSpacing: '0.12em', marginBottom: '1rem', fontWeight: 900 }}>HOW IT WORKS</p>
          <h2 className="font-display" style={{ fontSize: 40, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '3.5rem' }}>From profile to ranked matches <em>in seconds</em></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {[
              { n: '01', title: 'Create your account', body: 'Log in and sync your preferences and profile securely in our PostgreSQL database.' },
              { n: '02', title: 'Upload resume & preferences', body: 'Extract skills and target domains including Frontend, Design, Product, QA, SRE, and more.' },
              { n: '03', title: 'Get scored matches', body: 'Scores calculated across five factors. Real links directly to Internshala, Unstop, and LinkedIn.' },
              { n: '04', title: 'Close skill gaps', body: 'View learning roadmaps and tutorials for skills required by your target roles.' },
            ].map(step => (
              <div key={step.n} className="neo-card" style={{ padding: '1.75rem', background: 'var(--bg-2)' }}>
                <div className="font-mono" style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '0.75rem', fontWeight: 900 }}>{step.n}</div>
                <div style={{ fontWeight: 900, marginBottom: '0.5rem', fontSize: 17, textTransform: 'uppercase' }}>{step.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 700 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Call to Action */}
      <div style={{ padding: '6rem 2rem', textAlign: 'center', position: 'relative', zIndex: 2, borderBottom: '4px solid var(--border)' }}>
        <h2 className="font-display" style={{ fontSize: 48, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>Stop searching.<br /><em style={{ color: 'var(--amber)' }}>Start matching.</em></h2>
        {isLoggedIn ? (
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className="neo-btn" style={{ padding: '16px 40px', fontSize: 16 }}>Go to your dashboard →</button>
          </Link>
        ) : (
          <Link href="/signup" style={{ textDecoration: 'none' }}>
            <button className="neo-btn" style={{ padding: '16px 40px', fontSize: 16 }}>Create account — it&apos;s free →</button>
          </Link>
        )}
      </div>

      {/* Copyright footer */}
      <div style={{ padding: '2rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 900 }}>INTERNSHIPIQ © 2026</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 900, textTransform: 'uppercase' }}>Powered by PostgreSQL & FastAPI.</span>
        </div>
      </div>
    </div>
  )
}

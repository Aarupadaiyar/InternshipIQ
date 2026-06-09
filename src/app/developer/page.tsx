'use client'
import { useState, useEffect, useRef } from 'react'
import NavBar from '@/components/NavBar'
import { Mail, Briefcase, Cpu, Code2, Database } from 'lucide-react'

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
)

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

export default function DeveloperPage() {
  const photoUrl = '/images/developer/profile.jpg'
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    const box = card.getBoundingClientRect()
    const x = e.clientX - box.left - (box.width / 2)
    const y = e.clientY - box.top - (box.height / 2)
    
    // Max 15 degree rotation
    const rx = -(y / (box.height / 2)) * 15
    const ry = (x / (box.width / 2)) * 15
    
    setTilt({ x: ry, y: rx })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s, color 0.3s', paddingBottom: '5rem' }}>
      <NavBar />
      
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 2rem' }}>
        
        {/* Title Badge */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span className="neo-badge" style={{ background: 'var(--neo-violet)', color: '#000000', fontSize: 13, fontWeight: 900, transform: 'rotate(-1.5deg)' }}>
            MEET THE BUILDER
          </span>
        </div>

        {/* Hero Section */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 48, 
          alignItems: 'center',
          marginBottom: '4rem'
        }}>
          
          {/* Left: 3D Parallax Photo Card */}
          <div style={{ display: 'flex', justifyContent: 'center', perspective: '1000px' }}>
            <div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                width: '100%',
                maxWidth: 320,
                border: '4px solid var(--border)',
                background: 'rgba(17, 24, 39, 0.4)',
                backdropFilter: 'blur(12px)',
                padding: 16,
                transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
                boxShadow: `${16 - tilt.x * 0.8}px ${16 + tilt.y * 0.8}px 0px var(--shadow)`,
                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                position: 'relative',
                transformStyle: 'preserve-3d',
                cursor: 'pointer'
              }}
            >
              {/* Retro title bar */}
              <div style={{
                background: 'var(--border)',
                color: 'var(--bg)',
                padding: '6px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                fontWeight: 900,
                fontFamily: 'monospace',
                borderBottom: '4px solid var(--border)',
                margin: '-16px -16px 16px -16px',
                transform: 'translateZ(15px)'
              }}>
                <span>FOUNDER_PROFILE.RAW</span>
                <span style={{ color: 'var(--indigo)' }}>LIVE</span>
              </div>

              {/* Photo Frame */}
              <div style={{
                border: '4px solid var(--border)',
                overflow: 'hidden',
                background: 'var(--bg-3)',
                height: 280,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transform: 'translateZ(20px)'
              }}>
                <img 
                  src={photoUrl} 
                  alt="Aarupadaiyar KJ" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)',
                  pointerEvents: 'none'
                }} />
              </div>
            </div>
          </div>

          {/* Right: Intro Details */}
          <div>
            <h1 className="font-display" style={{ 
              fontSize: '40px', 
              fontWeight: 900, 
              lineHeight: 1.0, 
              margin: '0 0 12px',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em'
            }}>
              Aarupadaiyar KJ
            </h1>
            <div className="font-mono" style={{ 
              fontSize: 14, 
              color: 'var(--indigo)', 
              fontWeight: 900, 
              textTransform: 'uppercase', 
              marginBottom: 16 
            }}>
              Data Analyst &bull; Software Developer &bull; Builder of InternshipIQ
            </div>
            
            <p style={{ 
              fontSize: 16, 
              color: 'var(--text-2)', 
              lineHeight: 1.6, 
              fontWeight: 700, 
              marginBottom: 20 
            }}>
              Focused on data systems, analytics, automation, and AI-powered products. Currently building InternshipIQ to help students discover better internship opportunities through intelligent matching and job aggregation.
            </p>

            {/* Social Icons Link Grid */}
            <div style={{ display: 'flex', gap: 12 }}>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <button className="neo-btn" style={{ padding: 10, background: 'var(--bg-2)', color: 'var(--text)' }} title="LinkedIn">
                  <LinkedinIcon style={{ display: 'block' }} />
                </button>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <button className="neo-btn" style={{ padding: 10, background: 'var(--bg-2)', color: 'var(--text)' }} title="GitHub">
                  <GithubIcon style={{ display: 'block' }} />
                </button>
              </a>
              <a href="mailto:aarupadaiyar.kj@example.com" style={{ textDecoration: 'none' }}>
                <button className="neo-btn" style={{ padding: 10, background: 'var(--bg-2)', color: 'var(--text)' }} title="Email">
                  <Mail size={18} style={{ color: 'var(--text)' }} />
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* Current Build Section */}
        <div className="neo-card" style={{ padding: '2rem', marginBottom: '3rem', background: 'var(--bg-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
            <span style={{ fontSize: 24 }}>🛠️</span>
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
              Current Build
            </h2>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--amber)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
            InternshipIQ
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: 0, fontWeight: 700 }}>
            AI-powered internship aggregation and matching platform that helps students discover relevant internship opportunities through intelligent search, verification, and matching systems.
          </p>
        </div>

        {/* Experience Highlight */}
        <div className="neo-card" style={{ padding: '2rem', marginBottom: '3rem', background: 'var(--bg-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
            <Briefcase size={22} style={{ color: 'var(--indigo)' }} />
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
              Experience Highlight
            </h2>
          </div>
          
          <div style={{ borderLeft: '4px solid var(--indigo)', paddingLeft: '1.25rem' }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 4px', textTransform: 'uppercase' }}>
              Data & Reporting Intern
            </h3>
            <div className="font-mono" style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 900, marginBottom: '1rem', textTransform: 'uppercase' }}>
              Bitzure
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {[
                "Data Analytics",
                "Dashboard Creation",
                "Reporting Automation",
                "Data Processing",
                "Business Insights",
                "Workflow Optimization"
              ].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', fontWeight: 700 }}>
                  <span style={{ color: 'var(--indigo)', fontWeight: 900 }}>▪</span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skills Cards Grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
            <Cpu size={22} style={{ color: 'var(--amber)' }} />
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
              Core Skills
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {/* Programming */}
            <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)', transition: 'box-shadow 0.2s', border: '3px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--amber)' }}>
                <Code2 size={16} />
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase' }}>Programming</h4>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {["Python", "Java", "SQL"].map(s => (
                  <span key={s} className="tag tag-skill" style={{ fontSize: 10 }}>{s}</span>
                ))}
              </div>
            </div>

            {/* Data */}
            <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)', transition: 'box-shadow 0.2s', border: '3px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--indigo)' }}>
                <Database size={16} />
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase' }}>Data</h4>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {["Pandas", "NumPy", "EDA", "Data Cleaning", "Data Visualization"].map(s => (
                  <span key={s} className="tag tag-skill" style={{ fontSize: 10 }}>{s}</span>
                ))}
              </div>
            </div>

            {/* AI & ML */}
            <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)', transition: 'box-shadow 0.2s', border: '3px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--neo-violet)' }}>
                <Cpu size={16} />
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase' }}>AI & ML</h4>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {["Scikit-learn", "Regression Modeling", "Feature Engineering", "Predictive Analytics"].map(s => (
                  <span key={s} className="tag tag-skill" style={{ fontSize: 10 }}>{s}</span>
                ))}
              </div>
            </div>

            {/* Backend */}
            <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)', transition: 'box-shadow 0.2s', border: '3px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--green)' }}>
                <Database size={16} />
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase' }}>Backend</h4>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {["FastAPI", "REST APIs", "MySQL"].map(s => (
                  <span key={s} className="tag tag-skill" style={{ fontSize: 10 }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

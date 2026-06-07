'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParsedProfile, UserPreferences } from '@/lib/types'

const STEP_LABELS = ['Upload resume', 'Review profile', 'Set preferences']

const ROLE_OPTIONS = ['ML Engineer', 'Data Scientist', 'AI Researcher', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer', 'Data Engineer', 'NLP Engineer', 'DevOps Engineer', 'Product Engineer']
const DOMAIN_OPTIONS = ['AI / ML', 'FinTech', 'HealthTech', 'EdTech', 'Climate', 'Developer Tools', 'Consumer', 'Enterprise SaaS', 'Gaming', 'Infrastructure']

function NavBar() {
  return (
    <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 2rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)' }} />
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 14, letterSpacing: '0.04em', color: 'var(--text)' }}>INTERNSHIP<span style={{ color: 'var(--amber)' }}>IQ</span></span>
        </Link>
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Onboarding</span>
      </div>
    </nav>
  )
}

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: '3rem' }}>
      {STEP_LABELS.map((label, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 2, background: i <= current ? 'var(--amber)' : 'var(--border)', transition: 'background 0.3s' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i < current ? 'var(--amber)' : i === current ? 'var(--amber-dim)' : 'var(--bg-3)',
              color: i < current ? '#0C0E14' : i === current ? 'var(--amber)' : 'var(--text-3)',
              border: i === current ? '1px solid var(--amber-border)' : 'none',
              transition: 'all 0.3s'
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 12, color: i === current ? 'var(--text)' : 'var(--text-3)' }}>{label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [profile, setProfile] = useState<ParsedProfile | null>(null)
  const [rawText, setRawText] = useState('')
  const [prefs, setPrefs] = useState<UserPreferences>({ roles: [], domains: [], locations: [], remote: 'any' })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
      }
    }
  }, [router])

  const extractText = async (file: File): Promise<string> => {
    // For MVP: read as text for .txt, or use FileReader for basic extraction
    // In prod you'd use pdf-parse or mammoth on server side
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return new Promise(resolve => {
        const r = new FileReader()
        r.onload = e => resolve(e.target?.result as string || '')
        r.readAsText(file)
      })
    }
    
    // For PDF/DOCX: send to a text extraction endpoint or use a simpler approach
    // For MVP demo: send raw file and let server handle it, or use FormData
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await fetch('/api/extract-text', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        return data.text || ''
      }
    } catch (e) {
      console.error('Text extraction failed:', e)
    }
    
    // If extraction truly fails, return empty string so the user sees an error
    return ''
  }

  const processFile = useCallback(async (file: File) => {
    if (!file) return
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|txt)$/i)) {
      setParseError('Please upload a PDF, DOCX, or TXT file.')
      return
    }

    setParsing(true)
    setParseError('')

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Please log in first before uploading a resume')
      }

      // 1. Extract and Parse text
      const text = await extractText(file)
      setRawText(text)

      const parseRes = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text })
      })

      const parseData = await parseRes.json()
      if (parseData.error) throw new Error(parseData.error)
      
      const parsedProfile = parseData.profile

      // 2. Upload file to backend /resume/upload
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('http://localhost:8000/resume/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      if (!uploadRes.ok) throw new Error('Failed to upload resume file to server')
      const resumeObj = await uploadRes.json()

      // 3. Save parsed profile to backend /resume/{id}/profile
      const profileRes = await fetch(`http://localhost:8000/resume/${resumeObj.id}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          skills: parsedProfile.skills || [],
          education: parsedProfile.education || [],
          experience: parsedProfile.experience || [],
          projects: parsedProfile.projects || [],
          certifications: parsedProfile.certifications || [],
          links: parsedProfile.links || {}
        })
      })

      if (!profileRes.ok) throw new Error('Failed to save parsed profile on server')

      setProfile(parsedProfile)
      setStep(1)
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse resume. Try again.')
    } finally {
      setParsing(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  const finish = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const prefsRes = await fetch('http://localhost:8000/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roles: prefs.roles,
          domains: prefs.domains,
          locations: prefs.locations,
          remote: prefs.remote,
          salary_min: prefs.salaryMin || 0
        })
      })

      if (!prefsRes.ok) throw new Error('Failed to save preferences')

      const data = { profile, prefs, skills: profile?.skills || [] }
      localStorage.setItem('iq_user', JSON.stringify(data))
      router.push('/dashboard')
    } catch (err: any) {
      alert(err.message || 'Failed to save onboarding preferences')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar />
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '3rem 2rem' }}>
        <StepBar current={step} />

        {/* Step 0: Upload */}
        {step === 0 && (
          <div className="fade-up">
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 400, marginBottom: '0.5rem' }}>Upload your resume</h1>
            <p style={{ color: 'var(--text-2)', marginBottom: '2rem' }}>AI will extract your skills, experience, and projects in seconds.</p>

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `1.5px dashed ${dragOver ? 'var(--amber)' : 'var(--border-hover)'}`,
                borderRadius: 16,
                padding: '4rem 2rem',
                textAlign: 'center',
                background: dragOver ? 'var(--amber-dim)' : 'var(--bg-2)',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {parsing ? (
                <div>
                  <div style={{ fontSize: 32, marginBottom: '1rem' }}>⟳</div>
                  <p style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono', fontSize: 14 }}>Parsing with AI...</p>
                  <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: '0.5rem' }}>Extracting skills, experience, projects</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 40, marginBottom: '1rem' }}>📄</div>
                  <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{dragOver ? 'Drop it here' : 'Drop your resume here'}</p>
                  <p style={{ color: 'var(--text-2)', fontSize: 14 }}>or click to browse — PDF, DOCX, or TXT</p>
                </div>
              )}
            </div>

            <input id="file-input" type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={handleFileInput} />

            {parseError && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--red-dim)', border: '0.5px solid rgba(231,76,60,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: 14 }}>
                {parseError}
              </div>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button className="btn-ghost" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => {
                // Demo mode with sample profile
                setProfile({
                  name: 'Aarav Kumar', email: 'aarav@example.com',
                  skills: ['Python', 'Machine Learning', 'Data Analysis', 'SQL', 'TensorFlow', 'Pandas', 'Scikit-learn', 'FastAPI'],
                  education: [{ degree: 'B.Tech Computer Science', institution: 'Lovely Professional University', year: '2025' }],
                  experience: [{ role: 'Data Automation Intern', company: 'Bitzure', duration: '3 months', bullets: ['Processed 25K+ records', 'Improved efficiency ~60%'] }],
                  projects: [{ name: 'Surge Price Prediction', description: 'LightGBM + ExtraTreesRegressor model', tech: ['Python', 'LightGBM', 'Streamlit'] }],
                  certifications: [],
                  links: { github: 'github.com/aarav', portfolio: 'aarupadaiyar.netlify.app' }
                })
                setStep(1)
              }}>
                Skip — use demo profile instead
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Review profile — fully editable */}
        {step === 1 && profile && (
          <div className="fade-up">
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 400, marginBottom: '0.5rem' }}>Review your profile</h1>
            <p style={{ color: 'var(--text-2)', marginBottom: '2rem' }}>AI extracted this from your resume. <strong style={{color:'var(--amber)'}}>Click any field to edit it.</strong></p>

            {/* Name & Email */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <input
                    value={profile.name || ''}
                    onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)}
                    placeholder="Your full name"
                    style={{ fontWeight: 600, fontSize: 18, width: '100%', marginBottom: 6 }}
                  />
                  <input
                    value={profile.email || ''}
                    onChange={e => setProfile(p => p ? { ...p, email: e.target.value } : p)}
                    placeholder="your@email.com"
                    style={{ fontSize: 14, color: 'var(--text-2)', width: '100%' }}
                  />
                </div>
                <div className="tag tag-match" style={{ flexShrink: 0 }}>AI parsed</div>
              </div>
              {profile.links?.github && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>🔗 {profile.links.github}</div>}
              {profile.links?.portfolio && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>🌐 {profile.links.portfolio}</div>}
            </div>

            {/* Skills — add/remove tags */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '0.75rem' }}>SKILLS DETECTED <span style={{color:'var(--text-3)', fontFamily:'Outfit', fontSize:12}}>(click × to remove · type below to add)</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {profile.skills.map(s => (
                  <span key={s} className="tag tag-match" style={{ display:'flex', alignItems:'center', gap:4, cursor:'default' }}>
                    {s}
                    <button onClick={() => setProfile(p => p ? { ...p, skills: p.skills.filter(x => x !== s) } : p)}
                      style={{ background:'none', border:'none', color:'var(--amber)', cursor:'pointer', padding:'0 2px', fontSize:14, lineHeight:1 }}>×</button>
                  </span>
                ))}
              </div>
              {profile.skills.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 8 }}>No skills detected — add them below.</p>}
              <input
                placeholder="Type a skill and press Enter (e.g. React, Python)"
                style={{ width: '100%', fontSize: 13 }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (val && !profile.skills.includes(val)) {
                      setProfile(p => p ? { ...p, skills: [...p.skills, val] } : p)
                    }
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }}
              />
            </div>

            {/* Education */}
            {profile.education.length > 0 && (
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '0.75rem' }}>EDUCATION</div>
                {profile.education.map((edu, i) => (
                  <div key={i} style={{ marginBottom: '0.75rem' }}>
                    <input
                      value={edu.degree}
                      onChange={e => setProfile(p => p ? { ...p, education: p.education.map((x, j) => j === i ? { ...x, degree: e.target.value } : x) } : p)}
                      style={{ fontWeight: 500, width: '100%', marginBottom: 4 }}
                      placeholder="Degree name"
                    />
                    <div style={{ display:'flex', gap:8 }}>
                      <input
                        value={edu.institution}
                        onChange={e => setProfile(p => p ? { ...p, education: p.education.map((x, j) => j === i ? { ...x, institution: e.target.value } : x) } : p)}
                        style={{ flex:1, fontSize: 13 }}
                        placeholder="Institution"
                      />
                      <input
                        value={edu.year}
                        onChange={e => setProfile(p => p ? { ...p, education: p.education.map((x, j) => j === i ? { ...x, year: e.target.value } : x) } : p)}
                        style={{ width: 80, fontSize: 13 }}
                        placeholder="Year"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Experience */}
            {profile.experience.length > 0 && (
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '0.75rem' }}>EXPERIENCE</div>
                {profile.experience.map((exp, i) => (
                  <div key={i} style={{ marginBottom: '0.75rem' }}>
                    <input
                      value={exp.role}
                      onChange={e => setProfile(p => p ? { ...p, experience: p.experience.map((x, j) => j === i ? { ...x, role: e.target.value } : x) } : p)}
                      style={{ fontWeight: 500, width: '100%', marginBottom: 4 }}
                      placeholder="Job title / Role"
                    />
                    <div style={{ display:'flex', gap:8 }}>
                      <input
                        value={exp.company}
                        onChange={e => setProfile(p => p ? { ...p, experience: p.experience.map((x, j) => j === i ? { ...x, company: e.target.value } : x) } : p)}
                        style={{ flex:1, fontSize: 13 }}
                        placeholder="Company name"
                      />
                      <input
                        value={exp.duration}
                        onChange={e => setProfile(p => p ? { ...p, experience: p.experience.map((x, j) => j === i ? { ...x, duration: e.target.value } : x) } : p)}
                        style={{ width: 120, fontSize: 13 }}
                        placeholder="Duration"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono' }}>PROJECTS</div>
                <button
                  onClick={() => setProfile(p => p ? { ...p, projects: [...p.projects, { name: '', description: '', tech: [] }] } : p)}
                  style={{ fontSize: 12, color: 'var(--amber)', background: 'var(--amber-dim)', border: '0.5px solid var(--amber-border)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                >+ Add project</button>
              </div>
              {profile.projects.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 8 }}>No projects detected — add them above.</p>}
              {profile.projects.map((proj, i) => (
                <div key={i} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: i < profile.projects.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                  <div style={{ display:'flex', gap:8, marginBottom:4 }}>
                    <input
                      value={proj.name}
                      onChange={e => setProfile(p => p ? { ...p, projects: p.projects.map((x, j) => j === i ? { ...x, name: e.target.value } : x) } : p)}
                      style={{ flex:1, fontWeight: 500 }}
                      placeholder="Project name"
                    />
                    <button
                      onClick={() => setProfile(p => p ? { ...p, projects: p.projects.filter((_, j) => j !== i) } : p)}
                      style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:16 }}>×</button>
                  </div>
                  <input
                    value={proj.description}
                    onChange={e => setProfile(p => p ? { ...p, projects: p.projects.map((x, j) => j === i ? { ...x, description: e.target.value } : x) } : p)}
                    style={{ width:'100%', fontSize: 13, marginBottom:6 }}
                    placeholder="What does it do?"
                  />
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:4 }}>
                    {proj.tech.map(t => (
                      <span key={t} className="tag tag-skill" style={{ display:'flex', alignItems:'center', gap:3 }}>
                        {t}
                        <button onClick={() => setProfile(p => p ? { ...p, projects: p.projects.map((x, j) => j === i ? { ...x, tech: x.tech.filter(tt => tt !== t) } : x) } : p)}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:12 }}>×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    placeholder="Add tech (Enter to add)"
                    style={{ fontSize: 12, width:'100%' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim()
                        if (val) setProfile(p => p ? { ...p, projects: p.projects.map((x, j) => j === i ? { ...x, tech: [...x.tech, val] } : x) } : p)
                        ;(e.target as HTMLInputElement).value = ''
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem' }}>
              <button className="btn-ghost" style={{ padding: '12px 20px', fontSize: 14 }} onClick={() => setStep(0)}>← Re-upload</button>
              <button className="btn-amber" style={{ flex: 1, padding: '12px 20px', fontSize: 14 }} onClick={() => setStep(2)}>Looks good → Set preferences</button>
            </div>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <div className="fade-up">
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 400, marginBottom: '0.5rem' }}>Set your preferences</h1>
            <p style={{ color: 'var(--text-2)', marginBottom: '2rem' }}>Personalize your recommendations.</p>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '1rem' }}>TARGET ROLES (pick all that apply)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ROLE_OPTIONS.map(r => (
                  <button key={r} onClick={() => toggleItem(prefs.roles, r, v => setPrefs(p => ({ ...p, roles: v })))}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid', fontFamily: 'Outfit',
                      background: prefs.roles.includes(r) ? 'var(--amber-dim)' : 'var(--bg-3)',
                      borderColor: prefs.roles.includes(r) ? 'var(--amber-border)' : 'var(--border)',
                      color: prefs.roles.includes(r) ? 'var(--amber)' : 'var(--text-2)',
                      transition: 'all 0.15s' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '1rem' }}>DOMAINS OF INTEREST</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DOMAIN_OPTIONS.map(d => (
                  <button key={d} onClick={() => toggleItem(prefs.domains, d, v => setPrefs(p => ({ ...p, domains: v })))}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid', fontFamily: 'Outfit',
                      background: prefs.domains.includes(d) ? 'var(--amber-dim)' : 'var(--bg-3)',
                      borderColor: prefs.domains.includes(d) ? 'var(--amber-border)' : 'var(--border)',
                      color: prefs.domains.includes(d) ? 'var(--amber)' : 'var(--text-2)',
                      transition: 'all 0.15s' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '1rem' }}>WORK STYLE</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['remote', 'hybrid', 'onsite', 'any'] as const).map(opt => (
                  <button key={opt} onClick={() => setPrefs(p => ({ ...p, remote: opt }))}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid', fontFamily: 'Outfit', textTransform: 'capitalize',
                      background: prefs.remote === opt ? 'var(--amber-dim)' : 'var(--bg-3)',
                      borderColor: prefs.remote === opt ? 'var(--amber-border)' : 'var(--border)',
                      color: prefs.remote === opt ? 'var(--amber)' : 'var(--text-2)',
                      transition: 'all 0.15s' }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '1rem' }}>PREFERRED LOCATIONS</div>
              <input
                style={{ width: '100%', padding: '10px 14px' }}
                placeholder="e.g. Bangalore, Remote, Mumbai"
                onChange={e => setPrefs(p => ({ ...p, locations: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" style={{ padding: '12px 20px', fontSize: 14 }} onClick={() => setStep(1)}>← Back</button>
              <button className="btn-amber" style={{ flex: 1, padding: '12px 20px', fontSize: 15 }} onClick={finish}>
                Find my matches →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

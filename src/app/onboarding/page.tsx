'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParsedProfile, UserPreferences } from '@/lib/types'
import NavBar from '@/components/NavBar'

const STEP_LABELS = ['Upload resume', 'Review profile', 'Set preferences']

const ROLE_OPTIONS = ['ML Engineer', 'Data Scientist', 'AI Researcher', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer', 'Data Engineer', 'NLP Engineer', 'DevOps Engineer', 'Product Engineer']
const DOMAIN_OPTIONS = ['AI / ML', 'FinTech', 'HealthTech', 'EdTech', 'Climate', 'Developer Tools', 'Consumer', 'Enterprise SaaS', 'Gaming', 'Infrastructure']
type ParsedProjectDraft = { tech?: string[]; technologies?: string[]; [key: string]: unknown }

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: '3rem' }}>
      {STEP_LABELS.map((label, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ height: 6, border: '2px solid var(--border)', background: i <= current ? 'var(--amber)' : 'var(--bg-3)', transition: 'background 0.3s' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, border: '2px solid var(--border)', fontSize: 11, fontFamily: 'Space Grotesk', fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i < current ? 'var(--green)' : i === current ? 'var(--amber)' : 'var(--bg-2)',
              color: i <= current ? '#000000' : 'var(--text-3)',
              boxShadow: i <= current ? '2px 2px 0px var(--shadow)' : 'none',
              transition: 'all 0.3s'
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 12, color: i === current ? 'var(--text)' : 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, textTransform: 'uppercase' }}>{label}</span>
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
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([])
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
      
      const parsedProfile = {
        ...parseData.profile,
        projects: (parseData.profile.projects || []).map((p: ParsedProjectDraft) => ({
          ...p,
          tech: p.tech || p.technologies || [],
        })),
        confidence: parseData.confidence || parseData.profile.confidence || {},
      }
      setMissingFields(parseData.missingFields || [])
      setLowConfidenceFields(parseData.lowConfidenceFields || [])

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
          achievements: parsedProfile.achievements || [],
          links: parsedProfile.links || {},
          raw_text: text
        })
      })

      if (!profileRes.ok) throw new Error('Failed to save parsed profile on server')

      setProfile(parsedProfile)
      setStep(1)
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse resume. Try again.')
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
          preferred_roles: prefs.roles,
          preferred_domains: prefs.domains,
          preferred_locations: prefs.locations,
          preferred_countries: ['India'],
          work_mode: prefs.remote,
          minimum_stipend: prefs.salaryMin || 0
        })
      })

      if (!prefsRes.ok) throw new Error('Failed to save preferences')

      const data = { profile, prefs, skills: profile?.skills || [] }
      localStorage.setItem('iq_user', JSON.stringify(data))
      router.push('/dashboard')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save onboarding preferences')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s, color 0.3s' }}>
      <NavBar />
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '3rem 2rem' }}>
        <StepBar current={step} />

        {/* Step 0: Upload */}
        {step === 0 && (
          <div className="fade-up">
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Upload your resume</h1>
            <p style={{ color: 'var(--text-2)', fontWeight: 700, marginBottom: '2rem' }}>AI will extract your skills, experience, and projects in seconds.</p>

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `4px dashed var(--border)`,
                borderRadius: '0px !important',
                padding: '4.5rem 2rem',
                textAlign: 'center',
                background: dragOver ? 'var(--amber-dim)' : 'var(--bg-2)',
                boxShadow: dragOver ? '8px 8px 0px var(--shadow)' : 'none',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {parsing ? (
                <div>
                  <div style={{ fontSize: 32, marginBottom: '1.25rem' }}>⟳</div>
                  <p style={{ color: 'var(--amber)', fontFamily: 'Space Grotesk', fontWeight: 900, fontSize: 16 }}>PARSING WITH AI...</p>
                  <p style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 700, marginTop: '0.5rem' }}>Extracting skills, experience, projects</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 48, marginBottom: '1.25rem' }}>📄</div>
                  <p style={{ fontWeight: 900, fontSize: 18, textTransform: 'uppercase', marginBottom: '0.5rem' }}>{dragOver ? 'Drop it here' : 'Drop your resume here'}</p>
                  <p style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 700 }}>or click to browse — PDF, DOCX, or TXT</p>
                </div>
              )}
            </div>

            <input id="file-input" type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={handleFileInput} />

            {parseError && (
              <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', background: 'var(--red-dim)', border: '2px solid var(--red)', color: 'var(--text)', fontSize: 13, fontWeight: 900 }}>
                ✕ {parseError.toUpperCase()}
              </div>
            )}

            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
              <button className="neo-btn" style={{ fontSize: 13, padding: '10px 20px', background: 'var(--bg-2)' }} onClick={() => {
                // Demo mode with sample profile
                setProfile({
                  name: 'Aarav Kumar', email: 'aarav@example.com',
                  skills: ['Python', 'Machine Learning', 'Data Analysis', 'SQL', 'TensorFlow', 'Pandas', 'Scikit-learn', 'FastAPI'],
                  education: [{ degree: 'B.Tech Computer Science', institution: 'Lovely Professional University', year: '2025' }],
                  experience: [{ role: 'Data Automation Intern', company: 'Bitzure', duration: '3 months', bullets: ['Processed 25K+ records', 'Improved efficiency ~60%'] }],
                  projects: [{ name: 'Surge Price Prediction', description: 'LightGBM + ExtraTreesRegressor model', tech: ['Python', 'LightGBM', 'Streamlit'] }],
                  certifications: [],
                  achievements: [],
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
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Review your profile</h1>
            <p style={{ color: 'var(--text-2)', fontWeight: 700, marginBottom: '2rem' }}>AI extracted this from your resume. <strong style={{color:'var(--indigo)'}}>Click any field to edit it.</strong></p>

            {(missingFields.length > 0 || lowConfidenceFields.length > 0) && (
              <div className="neo-card" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'var(--amber-dim)', borderColor: 'var(--amber)' }}>
                <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'Space Grotesk', fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>
                  Review needed
                </div>
                {missingFields.length > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 700, marginBottom: 4 }}>
                    Missing: {missingFields.join(', ')}
                  </div>
                )}
                {lowConfidenceFields.length > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 700 }}>
                    Low confidence: {lowConfidenceFields.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Name & Email */}
            <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <input
                    value={profile.name || ''}
                    onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)}
                    placeholder="YOUR FULL NAME"
                    className="neo-input"
                    style={{ fontWeight: 900, fontSize: 18, width: '100%', marginBottom: 10, height: '44px', textTransform: 'uppercase' }}
                  />
                  <input
                    value={profile.email || ''}
                    onChange={e => setProfile(p => p ? { ...p, email: e.target.value } : p)}
                    placeholder="YOUR@EMAIL.COM"
                    className="neo-input"
                    style={{ fontSize: 14, width: '100%', height: '44px', textTransform: 'uppercase' }}
                  />
                </div>
                <div className="neo-badge" style={{ background: 'var(--amber)', color: '#000000', flexShrink: 0 }}>AI PARSED</div>
              </div>
              {profile.links?.github && <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>🔗 {profile.links.github}</div>}
              {profile.links?.portfolio && <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 700, fontFamily: 'JetBrains Mono', marginTop: 4 }}>🌐 {profile.links.portfolio}</div>}
            </div>

            {/* Skills — add/remove tags */}
            <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '0.75rem' }}>SKILLS DETECTED <span style={{color:'var(--text-3)', fontSize:11}}>(CLICK × TO REMOVE · TYPE BELOW TO ADD)</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {profile.skills.map(s => (
                  <span key={s} className="tag tag-match" style={{ display:'inline-flex', alignItems:'center', gap:6, cursor:'default' }}>
                    {s}
                    <button onClick={() => setProfile(p => p ? { ...p, skills: p.skills.filter(x => x !== s) } : p)}
                      style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', padding:'0 2px', fontSize:14, fontWeight:900, lineHeight:1 }}>✕</button>
                  </span>
                ))}
              </div>
              {profile.skills.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 12, fontWeight: 700 }}>No skills detected — add them below.</p>}
              <input
                placeholder="TYPE A SKILL AND PRESS ENTER (E.G. REACT, PYTHON)..."
                className="neo-input"
                style={{ width: '100%', height: '44px', textTransform: 'uppercase' }}
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
              <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1rem' }}>EDUCATION</div>
                {profile.education.map((edu, i) => (
                  <div key={i} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: i < profile.education.length - 1 ? '2px solid var(--border)' : 'none' }}>
                    <input
                      value={edu.degree}
                      onChange={e => setProfile(p => p ? { ...p, education: p.education.map((x, j) => j === i ? { ...x, degree: e.target.value } : x) } : p)}
                      className="neo-input"
                      style={{ fontWeight: 900, width: '100%', marginBottom: 10, height: '44px', textTransform: 'uppercase' }}
                      placeholder="DEGREE NAME"
                    />
                    <div style={{ display:'flex', gap:10 }}>
                      <input
                        value={edu.institution}
                        onChange={e => setProfile(p => p ? { ...p, education: p.education.map((x, j) => j === i ? { ...x, institution: e.target.value } : x) } : p)}
                        className="neo-input"
                        style={{ flex:1, height: '44px', textTransform: 'uppercase' }}
                        placeholder="INSTITUTION"
                      />
                      <input
                        value={edu.year}
                        onChange={e => setProfile(p => p ? { ...p, education: p.education.map((x, j) => j === i ? { ...x, year: e.target.value } : x) } : p)}
                        className="neo-input"
                        style={{ width: 100, height: '44px', textTransform: 'uppercase' }}
                        placeholder="YEAR"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Experience */}
            {profile.experience.length > 0 && (
              <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1rem' }}>EXPERIENCE</div>
                {profile.experience.map((exp, i) => (
                  <div key={i} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: i < profile.experience.length - 1 ? '2px solid var(--border)' : 'none' }}>
                    <input
                      value={exp.role}
                      onChange={e => setProfile(p => p ? { ...p, experience: p.experience.map((x, j) => j === i ? { ...x, role: e.target.value } : x) } : p)}
                      className="neo-input"
                      style={{ fontWeight: 900, width: '100%', marginBottom: 10, height: '44px', textTransform: 'uppercase' }}
                      placeholder="JOB TITLE / ROLE"
                    />
                    <div style={{ display:'flex', gap:10 }}>
                      <input
                        value={exp.company}
                        onChange={e => setProfile(p => p ? { ...p, experience: p.experience.map((x, j) => j === i ? { ...x, company: e.target.value } : x) } : p)}
                        className="neo-input"
                        style={{ flex:1, height: '44px', textTransform: 'uppercase' }}
                        placeholder="COMPANY NAME"
                      />
                      <input
                        value={exp.duration}
                        onChange={e => setProfile(p => p ? { ...p, experience: p.experience.map((x, j) => j === i ? { ...x, duration: e.target.value } : x) } : p)}
                        className="neo-input"
                        style={{ width: 140, height: '44px', textTransform: 'uppercase' }}
                        placeholder="DURATION"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900 }}>PROJECTS</div>
                <button
                  onClick={() => setProfile(p => p ? { ...p, projects: [...p.projects, { name: '', description: '', tech: [] }] } : p)}
                  className="neo-btn"
                  style={{ fontSize: 11, color: '#000000', background: 'var(--amber)', padding: '4px 10px' }}
                >+ ADD PROJECT</button>
              </div>
              {profile.projects.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 12, fontWeight: 700 }}>No projects detected — add them above.</p>}
              {profile.projects.map((proj, i) => (
                <div key={i} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: i < profile.projects.length - 1 ? '2px solid var(--border)' : 'none' }}>
                  <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                    <input
                      value={proj.name}
                      onChange={e => setProfile(p => p ? { ...p, projects: p.projects.map((x, j) => j === i ? { ...x, name: e.target.value } : x) } : p)}
                      className="neo-input"
                      style={{ flex:1, fontWeight: 900, height: '40px', textTransform: 'uppercase' }}
                      placeholder="PROJECT NAME"
                    />
                    <button
                      onClick={() => setProfile(p => p ? { ...p, projects: p.projects.filter((_, j) => j !== i) } : p)}
                      className="neo-btn"
                      style={{ background:'var(--red)', width: '40px', height: '40px', padding: 0 }}
                      title="Delete Project"
                    >✕</button>
                  </div>
                  <input
                    value={proj.description}
                    onChange={e => setProfile(p => p ? { ...p, projects: p.projects.map((x, j) => j === i ? { ...x, description: e.target.value } : x) } : p)}
                    className="neo-input"
                    style={{ width:'100%', fontSize: 13, marginBottom:10, height: '40px', textTransform: 'uppercase' }}
                    placeholder="WHAT DOES IT DO?"
                  />
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                    {proj.tech.map(t => (
                      <span key={t} className="tag tag-skill" style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                        {t}
                        <button onClick={() => setProfile(p => p ? { ...p, projects: p.projects.map((x, j) => j === i ? { ...x, tech: x.tech.filter(tt => tt !== t) } : x) } : p)}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontSize:12, fontWeight:900 }}>✕</button>
                      </span>
                    ))}
                  </div>
                  <input
                    placeholder="ADD TECH (ENTER TO ADD)"
                    className="neo-input"
                    style={{ fontSize: 12, width:'100%', height: '36px', textTransform: 'uppercase' }}
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

            <div style={{ display: 'flex', gap: 16, marginTop: '2rem' }}>
              <button className="neo-btn" style={{ padding: '12px 24px', fontSize: 14, background: 'var(--bg-2)' }} onClick={() => setStep(0)}>← RE-UPLOAD</button>
              <button className="neo-btn" style={{ flex: 1, padding: '12px 24px', fontSize: 14, background: 'var(--amber)' }} onClick={() => setStep(2)}>LOOKS GOOD → SET PREFERENCES</button>
            </div>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <div className="fade-up">
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Set your preferences</h1>
            <p style={{ color: 'var(--text-2)', fontWeight: 700, marginBottom: '2rem' }}>Personalize your recommendations.</p>

            <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1.25rem' }}>TARGET ROLES (PICK ALL THAT APPLY)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {ROLE_OPTIONS.map(r => (
                  <button key={r} onClick={() => toggleItem(prefs.roles, r, v => setPrefs(p => ({ ...p, roles: v })))}
                    style={{ 
                      padding: '8px 16px', 
                      fontSize: 13, 
                      cursor: 'pointer', 
                      border: '3px solid var(--border)', 
                      fontFamily: 'Space Grotesk', 
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      borderRadius: '0px !important',
                      background: prefs.roles.includes(r) ? 'var(--amber)' : 'var(--bg-2)',
                      color: prefs.roles.includes(r) ? '#000000' : 'var(--text)',
                      boxShadow: prefs.roles.includes(r) ? '3px 3px 0px var(--shadow)' : 'none',
                      transform: prefs.roles.includes(r) ? 'translate(-1px, -1px)' : 'none',
                      transition: 'all 0.15s' 
                    }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1.25rem' }}>DOMAINS OF INTEREST</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {DOMAIN_OPTIONS.map(d => (
                  <button key={d} onClick={() => toggleItem(prefs.domains, d, v => setPrefs(p => ({ ...p, domains: v })))}
                    style={{ 
                      padding: '8px 16px', 
                      fontSize: 13, 
                      cursor: 'pointer', 
                      border: '3px solid var(--border)', 
                      fontFamily: 'Space Grotesk', 
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      borderRadius: '0px !important',
                      background: prefs.domains.includes(d) ? 'var(--amber)' : 'var(--bg-2)',
                      color: prefs.domains.includes(d) ? '#000000' : 'var(--text)',
                      boxShadow: prefs.domains.includes(d) ? '3px 3px 0px var(--shadow)' : 'none',
                      transform: prefs.domains.includes(d) ? 'translate(-1px, -1px)' : 'none',
                      transition: 'all 0.15s' 
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1.25rem' }}>WORK STYLE</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['remote', 'hybrid', 'onsite', 'any'] as const).map(opt => (
                  <button key={opt} onClick={() => setPrefs(p => ({ ...p, remote: opt }))}
                    style={{ 
                      flex: 1, 
                      padding: '10px', 
                      fontSize: 13, 
                      cursor: 'pointer', 
                      border: '3px solid var(--border)', 
                      fontFamily: 'Space Grotesk', 
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      borderRadius: '0px !important',
                      background: prefs.remote === opt ? 'var(--amber)' : 'var(--bg-2)',
                      color: prefs.remote === opt ? '#000000' : 'var(--text)',
                      boxShadow: prefs.remote === opt ? '3px 3px 0px var(--shadow)' : 'none',
                      transform: prefs.remote === opt ? 'translate(-1px, -1px)' : 'none',
                      transition: 'all 0.15s' 
                    }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1rem' }}>PREFERRED LOCATIONS</div>
              <input
                style={{ width: '100%', height: '48px', textTransform: 'uppercase' }}
                placeholder="E.G. BANGALORE, REMOTE, MUMBAI"
                className="neo-input"
                onChange={e => setPrefs(p => ({ ...p, locations: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <button className="neo-btn" style={{ padding: '12px 24px', fontSize: 14, background: 'var(--bg-2)' }} onClick={() => setStep(1)}>← BACK</button>
              <button className="neo-btn" style={{ flex: 1, padding: '12px 24px', fontSize: 14, background: 'var(--amber)' }} onClick={finish}>
                FIND MY MATCHES →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

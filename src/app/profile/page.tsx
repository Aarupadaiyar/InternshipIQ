'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ParsedProfile } from '@/lib/types'

function NavBar({ name }: { name: string }) {
  return (
    <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 2rem', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 100 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)' }} />
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 14, letterSpacing: '0.04em', color: 'var(--text)' }}>INTERNSHIP<span style={{ color: 'var(--amber)' }}>IQ</span></span>
        </Link>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
          <Link href="/jobs" className="nav-link">Jobs</Link>
          <Link href="/profile" className="nav-link active">Profile</Link>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>
            {name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ParsedProfile | null>(null)
  const [resumeId, setResumeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newSkill, setNewSkill] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    fetch('http://localhost:8000/dashboard/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthenticated')
        return res.json()
      })
      .then(dashData => {
        if (!dashData.resume_profile) {
          window.location.href = '/onboarding'
          return
        }

        const p: ParsedProfile = {
          name: dashData.user.full_name,
          email: dashData.user.email,
          skills: dashData.resume_profile.skills || [],
          education: dashData.resume_profile.education || [],
          experience: dashData.resume_profile.experience || [],
          projects: dashData.resume_profile.projects || [],
          certifications: dashData.resume_profile.certifications || [],
          links: dashData.resume_profile.links || {}
        }
        setProfile(p)
        setResumeId(dashData.active_resume.id)
        setLoading(false)

        localStorage.setItem('iq_user', JSON.stringify({
          profile: p,
          prefs: dashData.preferences || { roles: [], domains: [], locations: [], remote: 'any' },
          skills: p.skills
        }))
      })
      .catch(err => {
        console.error(err)
        localStorage.removeItem('token')
        window.location.href = '/login'
      })
  }, [])

  const save = async (updated: ParsedProfile) => {
    if (!resumeId) return
    const token = localStorage.getItem('token')
    if (!token) return

    setProfile(updated)

    try {
      const res = await fetch(`http://localhost:8000/resume/${resumeId}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          skills: updated.skills,
          projects: updated.projects,
          technologies: updated.skills,
          education: updated.education,
          certifications: updated.certifications,
          experience: updated.experience,
          links: updated.links
        })
      })

      if (!res.ok) {
        throw new Error('Failed to save profile changes on server')
      }

      const stored = localStorage.getItem('iq_user')
      if (stored) {
        const data = JSON.parse(stored)
        data.profile = updated
        data.skills = updated.skills
        localStorage.setItem('iq_user', JSON.stringify(data))
      }
    } catch (err) {
      console.error(err)
      alert('Failed to save changes. Please try again.')
    }
  }

  const addSkill = () => {
    if (!newSkill.trim() || !profile) return
    save({ ...profile, skills: [...profile.skills, newSkill.trim()] })
    setNewSkill('')
  }

  const removeSkill = (skill: string) => {
    if (!profile) return
    save({ ...profile, skills: profile.skills.filter(s => s !== skill) })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--bg)' }}>
      <div className="font-mono" style={{ color: 'var(--amber)', fontSize: 14 }}>Loading profile...</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Retrieving your resume information from database</div>
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <NavBar name="" />
      <p style={{ color: 'var(--text-2)' }}>No profile found.</p>
      <Link href="/onboarding"><button className="btn-amber" style={{ padding: '10px 24px' }}>Complete onboarding →</button></Link>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar name={profile.name} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 400 }}>{profile.name || 'Your Profile'}</h1>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{profile.email}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
              {profile.links.github && <a href={`https://${profile.links.github}`} target="_blank" rel="noopener noreferrer" className="tag tag-skill" style={{ textDecoration: 'none' }}>GitHub</a>}
              {profile.links.portfolio && <a href={`https://${profile.links.portfolio}`} target="_blank" rel="noopener noreferrer" className="tag tag-skill" style={{ textDecoration: 'none' }}>Portfolio</a>}
              {profile.links.linkedin && <a href={`https://${profile.links.linkedin}`} target="_blank" rel="noopener noreferrer" className="tag tag-skill" style={{ textDecoration: 'none' }}>LinkedIn</a>}
            </div>
          </div>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--amber-dim)', border: '2px solid var(--amber-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600, color: 'var(--amber)', fontFamily: 'DM Serif Display' }}>
            {profile.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>

        {/* Skills - editable */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono' }}>SKILLS</div>
            <span className="tag tag-amber">{profile.skills.length} detected</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
            {profile.skills.map(s => (
              <span key={s} className="tag tag-match" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => removeSkill(s)}>
                {s} <span style={{ opacity: 0.6, fontSize: 10 }}>✕</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newSkill} onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()}
              placeholder="Add a skill (press Enter)"
              style={{ flex: 1, padding: '8px 12px' }} />
            <button className="btn-amber" style={{ padding: '8px 16px', fontSize: 13 }} onClick={addSkill}>Add</button>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: 12, color: 'var(--text-3)' }}>Click any skill to remove it. Changes update your match scores.</div>
        </div>

        {/* Education */}
        {profile.education.length > 0 && (
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '1rem' }}>EDUCATION</div>
            {profile.education.map((e, i) => (
              <div key={i} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: i < profile.education.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <div style={{ fontWeight: 600 }}>{e.degree}</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{e.institution}</div>
                {e.year && <div className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{e.year}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Experience */}
        {profile.experience.length > 0 && (
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '1rem' }}>EXPERIENCE</div>
            {profile.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: i < profile.experience.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 600 }}>{e.role}</div>
                  {e.duration && <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{e.duration}</span>}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: '0.5rem' }}>{e.company}</div>
                {e.bullets?.map((b, j) => (
                  <div key={j} style={{ fontSize: 13, color: 'var(--text-2)', paddingLeft: '1rem', position: 'relative', marginBottom: 2 }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--amber)' }}>·</span>
                    {b}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        {profile.projects.length > 0 && (
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '1rem' }}>PROJECTS</div>
            {profile.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: i < profile.projects.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '0.5rem' }}>{p.description}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {p.tech.map(t => <span key={t} className="tag tag-skill" style={{ fontSize: 11, padding: '2px 7px' }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: 10 }}>
          <Link href="/onboarding" style={{ flex: 1 }}>
            <button className="btn-ghost" style={{ width: '100%', padding: '11px', fontSize: 14 }}>Re-upload resume</button>
          </Link>
          <Link href="/jobs" style={{ flex: 1 }}>
            <button className="btn-amber" style={{ width: '100%', padding: '11px', fontSize: 14 }}>View matches →</button>
          </Link>
        </div>
      </div>
    </div>
  )
}

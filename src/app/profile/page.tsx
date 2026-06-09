'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ParsedProfile } from '@/lib/types'
import NavBar from '@/components/NavBar'

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg)' }}>
      <div className="font-mono" style={{ color: 'var(--amber)', fontSize: 16, border: '4px solid var(--border)', background: '#000000', padding: '12px 24px', boxShadow: '6px 6px 0px var(--shadow)' }}>LOADING PROFILE...</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 900, fontFamily: 'Space Grotesk' }}>RETRIEVING YOUR RESUME INFORMATION FROM DATABASE</div>
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: 'var(--bg)' }}>
      <NavBar name="" />
      <div className="neo-card" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: 440, background: 'var(--bg-2)' }}>
        <p style={{ color: 'var(--text-2)', fontWeight: 700, marginBottom: '1.5rem' }}>No profile found.</p>
        <Link href="/onboarding">
          <button className="neo-btn" style={{ padding: '12px 24px', background: 'var(--amber)' }}>Complete onboarding →</button>
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s, color 0.3s' }}>
      <NavBar name={profile.name} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 2rem' }}>
        
        {/* Profile header card */}
        <div className="neo-card" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{profile.name || 'YOUR PROFILE'}</h1>
            <p style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono', marginBottom: 12 }}>{profile.email}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {profile.links.github && <a href={`https://${profile.links.github}`} target="_blank" rel="noopener noreferrer" className="tag tag-skill" style={{ textDecoration: 'none' }}>GitHub</a>}
              {profile.links.portfolio && <a href={`https://${profile.links.portfolio}`} target="_blank" rel="noopener noreferrer" className="tag tag-skill" style={{ textDecoration: 'none' }}>Portfolio</a>}
              {profile.links.linkedin && <a href={`https://${profile.links.linkedin}`} target="_blank" rel="noopener noreferrer" className="tag tag-skill" style={{ textDecoration: 'none' }}>LinkedIn</a>}
            </div>
          </div>
          <div style={{ width: 64, height: 64, border: '3px solid var(--border)', boxShadow: '3px 3px 0px var(--shadow)', background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#000000', fontFamily: 'Space Grotesk' }}>
            {profile.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>

        {/* Skills - editable */}
        <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900 }}>SKILLS</div>
            <span className="neo-badge" style={{ background: 'var(--amber)', color: '#000000' }}>{profile.skills.length} DETECTED</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
            {profile.skills.map(s => (
              <span key={s} className="tag tag-match" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => removeSkill(s)}>
                {s} <span style={{ opacity: 0.6, fontSize: 12, fontWeight: 900 }}>✕</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input 
              value={newSkill} 
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()}
              placeholder="ADD A SKILL (ENTER TO SAVE)"
              className="neo-input"
              style={{ flex: 1, height: '44px', textTransform: 'uppercase' }} 
            />
            <button className="neo-btn" style={{ padding: '0 24px', height: '44px', fontSize: 13, background: 'var(--amber)' }} onClick={addSkill}>Add</button>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900 }}>CLICK ANY SKILL TO REMOVE IT. CHANGES INSTANTLY RECALCULATE MATCH SCORES.</div>
        </div>

        {/* Education */}
        {profile.education.length > 0 && (
          <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1.25rem' }}>EDUCATION</div>
            {profile.education.map((e, i) => (
              <div key={i} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: i < profile.education.length - 1 ? '2px solid var(--border)' : 'none' }}>
                <div style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase' }}>{e.degree}</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 700 }}>{e.institution}</div>
                {e.year && <div className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 900, marginTop: 4 }}>CLASS OF {e.year}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Experience */}
        {profile.experience.length > 0 && (
          <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1.25rem' }}>EXPERIENCE</div>
            {profile.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: i < profile.experience.length - 1 ? '2px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase' }}>{e.role}</div>
                  {e.duration && <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 900 }}>{e.duration.toUpperCase()}</span>}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 700, marginBottom: '0.75rem' }}>{e.company}</div>
                {e.bullets?.map((b, j) => (
                  <div key={j} style={{ fontSize: 13, color: 'var(--text-2)', paddingLeft: '1.25rem', position: 'relative', marginBottom: 4, fontWeight: 700 }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--amber)', fontWeight: 900 }}>▪</span>
                    {b}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        {profile.projects.length > 0 && (
          <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1.25rem' }}>PROJECTS</div>
            {profile.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: i < profile.projects.length - 1 ? '2px solid var(--border)' : 'none' }}>
                <div style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase', marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 700, marginBottom: '0.75rem' }}>{p.description}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.tech.map(t => <span key={t} className="tag tag-skill" style={{ fontSize: 11, padding: '2px 7px' }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', gap: 16 }}>
          <Link href="/onboarding" style={{ flex: 1, textDecoration: 'none' }}>
            <button className="neo-btn" style={{ width: '100%', padding: '12px', fontSize: 14, background: 'var(--bg-2)' }}>RE-UPLOAD RESUME</button>
          </Link>
          <Link href="/jobs" style={{ flex: 1, textDecoration: 'none' }}>
            <button className="neo-btn" style={{ width: '100%', padding: '12px', fontSize: 14, background: 'var(--amber)' }}>VIEW MATCHES →</button>
          </Link>
        </div>
      </div>
    </div>
  )
}

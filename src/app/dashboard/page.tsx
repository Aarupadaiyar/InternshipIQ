'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Job, ParsedProfile } from '@/lib/types'
import NavBar from '@/components/NavBar'

function ScoreRing({ score }: { score: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--amber)' : 'var(--red)'

  return (
    <svg width={130} height={130} viewBox="0 0 130 130">
      <circle cx={65} cy={65} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
      <circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 65 65)"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={65} y={60} textAnchor="middle" fill={color} fontFamily="JetBrains Mono" fontWeight="600" fontSize={22}>{score}</text>
      <text x={65} y={78} textAnchor="middle" fill="var(--text-3)" fontFamily="Outfit" fontSize={11}>avg match</text>
    </svg>
  )
}

function SkillGapBar({ skill, count, total }: { skill: string; count: number; total: number }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono' }}>{skill}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{count}/{total} jobs require</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2 }}>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--amber)', width: `${(count / total) * 100}%`, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<ParsedProfile | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [topGaps, setTopGaps] = useState<{ skill: string; count: number }[]>([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }

    // Fetch profile and active resume from PostgreSQL
    fetch('http://localhost:8000/dashboard/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthenticated')
        return res.json()
      })
      .then(dashData => {
        if (!dashData.resume_profile) {
          // If no active resume/profile, redirect to onboarding
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
        localStorage.setItem('iq_user', JSON.stringify({
          profile: p,
          prefs: dashData.preferences || { roles: [], domains: [], locations: [], remote: 'any' },
          skills: p.skills
        }))

        // Fetch matched jobs scoring against user skills
        return fetch(`/api/jobs?skills=${(p.skills || []).join(',')}`)
      })
      .then(r => r ? r.json() : { jobs: [] })
      .then(data => {
        setJobs(data.jobs || [])
        // Compute skill gap frequency
        const gapMap: Record<string, number> = {}
        data.jobs?.forEach((j: Job) => {
          j.skillGaps?.forEach((g: string) => { gapMap[g] = (gapMap[g] || 0) + 1 })
        })
        const sorted = Object.entries(gapMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([skill, count]) => ({ skill, count }))
        setTopGaps(sorted)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        localStorage.removeItem('token')
        window.location.href = '/login'
      })
  }, [])

  const avgScore = jobs.length ? Math.round(jobs.reduce((s, j) => s + (j.matchScore || 0), 0) / jobs.length) : 0
  const topJobs = jobs.slice(0, 3)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--bg)' }}>
        <div className="font-mono" style={{ color: 'var(--amber)', fontSize: 14 }}>Computing matches...</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Scoring internships from database against your profile</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar name={profile?.name || ''} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
        {/* Welcome */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '0.25rem' }}>GOOD MORNING</div>
          <h1 className="font-display" style={{ fontSize: 36, fontWeight: 400 }}>
            {profile?.name ? profile.name.split(' ')[0] : 'Welcome'}&apos;s Career Intelligence
          </h1>
        </div>

        {/* Top row stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
          {[
            { label: 'Jobs matched', value: jobs.length.toString() },
            { label: 'Top match', value: `${jobs[0]?.matchScore || 0}%` },
            { label: 'Skills detected', value: profile?.skills?.length?.toString() || '0' },
            { label: 'Skill gaps found', value: topGaps.length.toString() },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{s.label}</div>
              <div className="font-mono" style={{ fontSize: 26, fontWeight: 600, color: 'var(--amber)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Score overview */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '1rem' }}>AVERAGE MATCH SCORE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <ScoreRing score={avgScore} />
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: '0.5rem' }}>Across {jobs.length} internships</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
                    {avgScore >= 70 ? 'Strong profile. You\'re competitive for most of these roles.' : avgScore >= 45 ? 'Good foundation. Closing a few skill gaps will push scores higher.' : 'Building blocks are there. Focus on high-priority skill gaps first.'}
                  </div>
                  <Link href="/jobs">
                    <button className="btn-amber" style={{ marginTop: '1rem', padding: '8px 16px', fontSize: 13 }}>View all matches →</button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Skill gap analysis */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono' }}>TOP SKILL GAPS</div>
                <span className="tag tag-amber">{topGaps.length} gaps</span>
              </div>
              {topGaps.length > 0 ? topGaps.map(g => (
                <SkillGapBar key={g.skill} skill={g.skill} count={g.count} total={jobs.length} />
              )) : (
                <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No major gaps detected — your profile is strong for these roles.</p>
              )}
              {topGaps.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--amber-dim)', borderRadius: 8, border: '0.5px solid var(--amber-border)' }}>
                  <div style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 500 }}>Priority: {topGaps[0]?.skill || 'N/A'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Required by {topGaps[0]?.count || 0} of your matched jobs</div>
                </div>
              )}
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Today's digest */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono' }}>TODAY&apos;S TOP MATCHES</div>
                <Link href="/jobs" style={{ fontSize: 12, color: 'var(--amber)', textDecoration: 'none' }}>View all →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topJobs.map(job => (
                  <div key={job.id} className="card card-hover" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => window.location.href = '/jobs'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{job.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{job.company} · {job.location}</div>
                      </div>
                      <div className="font-mono" style={{ fontSize: 18, fontWeight: 600, color: (job.matchScore || 0) >= 70 ? 'var(--green)' : 'var(--amber)' }}>
                        {job.matchScore}%
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      <span className="tag" style={{ fontSize: 11, padding: '2px 6px', background: 'var(--bg-3)', color: 'var(--text-3)', border: '0.5px solid var(--border)' }}>{job.source}</span>
                      <span className="tag" style={{ fontSize: 11, padding: '2px 6px', background: 'var(--bg-3)', color: 'var(--text-3)', border: '0.5px solid var(--border)' }}>{job.type}</span>
                      {job.salary && <span className="tag tag-amber" style={{ fontSize: 11, padding: '2px 6px' }}>{job.salary}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills you have */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '1rem' }}>YOUR SKILLS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(profile?.skills || []).map(s => <span key={s} className="tag tag-match">{s}</span>)}
              </div>
              {(profile?.skills?.length || 0) === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Upload your resume to detect skills.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

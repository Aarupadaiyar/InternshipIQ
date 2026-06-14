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
    <svg width={130} height={130} viewBox="0 0 130 130" style={{ filter: 'drop-shadow(4px 4px 0px var(--shadow))' }}>
      <circle cx={65} cy={65} r={r} fill="var(--bg-2)" stroke="var(--border)" strokeWidth={8} />
      <circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="square" transform="rotate(-90 65 65)"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={65} y={62} textAnchor="middle" fill="var(--text)" fontFamily="Space Grotesk" fontWeight="900" fontSize={26}>{score}%</text>
      <text x={65} y={82} textAnchor="middle" fill="var(--text-3)" fontFamily="Space Grotesk" fontWeight="900" fontSize={10} letterSpacing="0.05em">AVG MATCH</text>
    </svg>
  )
}

function SkillGapBar({ skill, count, total }: { skill: string; count: number; total: number }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontFamily: 'Space Grotesk', fontWeight: 900, textTransform: 'uppercase' }}>{skill}</span>
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 900 }}>{count}/{total} JOBS REQUIRE</span>
      </div>
      <div style={{ height: 16, background: 'var(--bg-3)', border: '2px solid var(--border)', borderRadius: 0 }}>
        <div style={{ height: '100%', background: 'var(--amber)', width: `${(count / total) * 100}%`, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

const ROLE_COLORS: Record<string, string> = {
  'AI Engineer': 'var(--neo-violet)',
  'Machine Learning Engineer': 'var(--indigo)',
  'Data Scientist': 'var(--indigo)',
  'Data Analyst': '#00897B',
  'Full Stack Developer': 'var(--amber)',
  'Frontend Developer': 'var(--amber)',
  'Backend Developer': '#E65100',
  'DevOps Engineer': '#546E7A',
  'Product Manager': 'var(--green)',
  'Cybersecurity Analyst': 'var(--red)',
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
          links: dashData.resume_profile.links || {},
          career_recommendations: dashData.resume_profile.career_recommendations || [],
          soft_skills: dashData.resume_profile.soft_skills || [],
          experience_signals: dashData.resume_profile.experience_signals || [],
          achievement_signals: dashData.resume_profile.achievement_signals || [],
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg)' }}>
        <div className="font-mono" style={{ color: 'var(--amber)', fontSize: 16, border: '4px solid var(--border)', background: '#000000', padding: '12px 24px', boxShadow: '6px 6px 0px var(--shadow)' }}>COMPUTING MATCHES...</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 900, fontFamily: 'Space Grotesk' }}>SCORING INTERNSHIPS FROM DATABASE AGAINST YOUR PROFILE</div>
      </div>
    )
  }

  const careerRecs = profile?.career_recommendations || []
  const softSkills = profile?.soft_skills || []
  const expSignals = profile?.experience_signals || []
  const achSignals = profile?.achievement_signals || []
  const allSignals = [...expSignals, ...achSignals]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s, color 0.3s' }}>
      <NavBar name={profile?.name || ''} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Welcome */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '0.1em' }}>WELCOME BACK</div>
          <h1 className="font-display" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            {profile?.name ? profile.name.split(' ')[0] : 'User'}&apos;S CAREER INTELLIGENCE
          </h1>
        </div>

        {/* Top row stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: '2rem' }}>
          {[
            { label: 'JOBS MATCHED', value: jobs.length.toString(), color: 'var(--neo-violet)' },
            { label: 'TOP MATCH', value: `${jobs[0]?.matchScore || 0}%`, color: 'var(--amber)' },
            { label: 'SKILLS DETECTED', value: profile?.skills?.length?.toString() || '0', color: 'var(--indigo)' },
            { label: 'SKILL GAPS FOUND', value: topGaps.length.toString(), color: 'var(--red)' },
          ].map((s, idx) => (
            <div key={s.label} className="neo-card" style={{ padding: '1.25rem', transform: idx % 2 === 0 ? 'rotate(-1deg)' : 'rotate(1deg)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#000000', background: s.color, display: 'inline-block', padding: '2px 10px', border: '2px solid var(--border)', boxShadow: '2px 2px 0px var(--shadow)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Career Intelligence: Recommendations + Signals */}
        {(careerRecs.length > 0 || softSkills.length > 0 || allSignals.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: '2rem' }}>

            {/* Career Recommendations Panel */}
            {careerRecs.length > 0 && (
              <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: 18 }}>🎯</span>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900 }}>AI CAREER RECOMMENDATIONS</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {careerRecs.map((role, idx) => (
                    <div key={role} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px',
                      border: '3px solid var(--border)',
                      background: idx === 0 ? 'var(--amber)' : 'var(--bg)',
                      boxShadow: idx === 0 ? '3px 3px 0px var(--shadow)' : '2px 2px 0px var(--shadow)',
                      transform: idx === 0 ? 'rotate(-0.5deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 20, height: 20,
                          background: ROLE_COLORS[role] || 'var(--indigo)',
                          border: '2px solid var(--border)',
                          borderRadius: 0,
                          display: 'inline-block',
                          flexShrink: 0
                        }} />
                        <span style={{ fontWeight: 900, fontSize: 13, textTransform: 'uppercase', color: idx === 0 ? '#000000' : 'var(--text)' }}>{role}</span>
                      </div>
                      <Link href={`/gaps?role=${encodeURIComponent(role)}`}>
                        <button
                          className="neo-btn"
                          style={{
                            fontSize: 10,
                            padding: '4px 10px',
                            background: idx === 0 ? '#000000' : 'var(--bg-2)',
                            color: idx === 0 ? 'var(--amber)' : 'var(--text)',
                            border: '2px solid var(--border)'
                          }}
                        >
                          ANALYZE →
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '1rem', fontSize: 11, color: 'var(--text-3)', fontWeight: 700, fontFamily: 'Space Grotesk' }}>
                  Based on your detected skill set. Click ANALYZE to see skill gaps for each role.
                </div>
              </div>
            )}

            {/* Soft Skills + Signals Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {softSkills.length > 0 && (
                <div className="neo-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                    <span style={{ fontSize: 16 }}>🤝</span>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900 }}>SOFT SKILLS DETECTED</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {softSkills.map(s => (
                      <span key={s} style={{
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 900,
                        fontFamily: 'Space Grotesk',
                        textTransform: 'uppercase',
                        border: '2px solid var(--border)',
                        background: 'var(--bg-3)',
                        boxShadow: '2px 2px 0px var(--shadow)',
                        color: 'var(--text)',
                      }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {allSignals.length > 0 && (
                <div className="neo-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                    <span style={{ fontSize: 16 }}>🏆</span>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900 }}>ACHIEVEMENT &amp; EXPERIENCE SIGNALS</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {expSignals.map(s => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '2px solid var(--border)', background: 'var(--bg-3)', boxShadow: '2px 2px 0px var(--shadow)' }}>
                        <span style={{ color: 'var(--indigo)', fontWeight: 900, fontSize: 14 }}>⚙</span>
                        <span style={{ fontSize: 12, fontWeight: 900, fontFamily: 'Space Grotesk', color: 'var(--text)', textTransform: 'uppercase' }}>{s}</span>
                      </div>
                    ))}
                    {achSignals.map(s => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '2px solid var(--border)', background: 'var(--amber-dim)', boxShadow: '2px 2px 0px var(--shadow)' }}>
                        <span style={{ color: '#000000', fontWeight: 900, fontSize: 14 }}>★</span>
                        <span style={{ fontSize: 12, fontWeight: 900, fontFamily: 'Space Grotesk', color: 'var(--text)', textTransform: 'uppercase' }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Score overview */}
            <div className="neo-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1.25rem' }}>AVERAGE MATCH SCORE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <ScoreRing score={avgScore} />
                <div>
                  <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Across {jobs.length} internships</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 700 }}>
                    {avgScore >= 70 ? 'Strong profile. You\'re highly competitive for most of these roles.' : avgScore >= 45 ? 'Good foundation. Closing a few skill gaps will push match scores higher.' : 'Building blocks are there. Focus on high-priority skill gaps first.'}
                  </div>
                  <Link href="/jobs">
                    <button className="neo-btn" style={{ background: 'var(--amber)', marginTop: '1.25rem', padding: '8px 16px', fontSize: 13 }}>View all matches →</button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Skill gap analysis */}
            <div className="neo-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900 }}>TOP SKILL GAPS</div>
                <span className="neo-badge" style={{ background: 'var(--amber)', color: '#000000' }}>{topGaps.length} GAPS</span>
              </div>
              {topGaps.length > 0 ? topGaps.map(g => (
                <SkillGapBar key={g.skill} skill={g.skill} count={g.count} total={jobs.length} />
              )) : (
                <p style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 700 }}>No major gaps detected — your profile is strong for these roles.</p>
              )}
              {topGaps.length > 0 && (
                <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--amber-dim)', border: '2px solid var(--border)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 900, textTransform: 'uppercase' }}>PRIORITY: {topGaps[0]?.skill || 'N/A'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, fontWeight: 700 }}>Required by {topGaps[0]?.count || 0} of your matched jobs. Expand on Skill Gaps page to view resources.</div>
                </div>
              )}
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Today's digest */}
            <div className="neo-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900 }}>TODAY&apos;S TOP MATCHES</div>
                <Link href="/jobs" style={{ fontSize: 12, color: 'var(--text-2)', textTransform: 'uppercase', fontWeight: 900, textDecoration: 'underline' }}>View all →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {topJobs.map(job => (
                  <div key={job.id} className="neo-card" style={{ padding: '1.25rem', cursor: 'pointer', background: 'var(--bg)' }} onClick={() => window.location.href = '/jobs'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 15, textTransform: 'uppercase', color: 'var(--text)' }}>{job.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 700 }}>{job.company} · {job.location}</div>
                      </div>
                      <div className="font-mono" style={{ fontSize: 20, fontWeight: 900, color: (job.matchScore || 0) >= 70 ? 'var(--green)' : 'var(--amber)' }}>
                        {job.matchScore}%
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      <span className="neo-badge" style={{ fontSize: 10, padding: '1px 6px', background: 'var(--bg-3)' }}>{job.source}</span>
                      <span className="neo-badge" style={{ fontSize: 10, padding: '1px 6px', background: 'var(--bg-3)' }}>{job.type}</span>
                      {job.salary && <span className="neo-badge" style={{ fontSize: 10, padding: '1px 6px', background: 'var(--amber)', color: '#000000' }}>{job.salary}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills you have */}
            <div className="neo-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1.25rem' }}>YOUR DETECTED SKILLS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(profile?.skills || []).map(s => <span key={s} className="tag tag-match">{s}</span>)}
              </div>
              {(profile?.skills?.length || 0) === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 700 }}>Upload your resume to detect skills.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

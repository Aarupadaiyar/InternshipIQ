'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Job } from '@/lib/types'

interface SkillAnalysis {
  skill: string
  demandCount: number
  totalJobs: number
  demandPct: number
  affectedJobs: string[]
  priority: 'critical' | 'high' | 'medium'
  estimatedHours: number
  resources: { title: string; url: string; type: string }[]
}

const LEARN_RESOURCES: Record<string, { title: string; url: string; type: string }[]> = {
  'PyTorch': [
    { title: 'PyTorch Official Tutorials', url: 'https://pytorch.org/tutorials/', type: 'Docs' },
    { title: 'Deep Learning with PyTorch — fast.ai', url: 'https://course.fast.ai/', type: 'Course' },
  ],
  'Spark': [
    { title: 'Apache Spark Quickstart', url: 'https://spark.apache.org/docs/latest/quick-start.html', type: 'Docs' },
    { title: 'Databricks Learning', url: 'https://www.databricks.com/learn', type: 'Course' },
  ],
  'Kafka': [
    { title: 'Kafka Getting Started', url: 'https://kafka.apache.org/documentation/#gettingStarted', type: 'Docs' },
    { title: 'Confluent Kafka Tutorials', url: 'https://developer.confluent.io/tutorials/', type: 'Course' },
  ],
  'Kubernetes': [
    { title: 'Kubernetes Basics', url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/', type: 'Docs' },
    { title: 'KodeKloud K8s Course', url: 'https://kodekloud.com/courses/kubernetes-for-beginners/', type: 'Course' },
  ],
  'Airflow': [
    { title: 'Apache Airflow Docs', url: 'https://airflow.apache.org/docs/', type: 'Docs' },
    { title: 'Astronomer Airflow Guides', url: 'https://docs.astronomer.io/learn', type: 'Course' },
  ],
  'TypeScript': [
    { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/', type: 'Docs' },
    { title: 'Execute Program TypeScript', url: 'https://www.executeprogram.com/courses/typescript', type: 'Course' },
  ],
  'GraphQL': [
    { title: 'How to GraphQL', url: 'https://www.howtographql.com/', type: 'Tutorial' },
    { title: 'Apollo GraphQL Docs', url: 'https://www.apollographql.com/docs/', type: 'Docs' },
  ],
  'Redis': [
    { title: 'Redis University', url: 'https://university.redis.com/', type: 'Course' },
    { title: 'Redis Docs', url: 'https://redis.io/docs/', type: 'Docs' },
  ],
  'NLP': [
    { title: 'HuggingFace NLP Course', url: 'https://huggingface.co/learn/nlp-course', type: 'Course' },
    { title: 'Stanford CS224N', url: 'https://web.stanford.edu/class/cs224n/', type: 'Course' },
  ],
  'Transformers': [
    { title: 'HuggingFace Transformers Docs', url: 'https://huggingface.co/docs/transformers', type: 'Docs' },
    { title: 'Illustrated Transformer', url: 'https://jalammar.github.io/illustrated-transformer/', type: 'Blog' },
  ],
  'Distributed Systems': [
    { title: 'Designing Data-Intensive Applications', url: 'https://dataintensive.net/', type: 'Book' },
    { title: 'MIT 6.824 Distributed Systems', url: 'https://pdos.csail.mit.edu/6.824/', type: 'Course' },
  ],
  'Research': [
    { title: 'Papers With Code', url: 'https://paperswithcode.com/', type: 'Resource' },
    { title: 'Arxiv CS.LG', url: 'https://arxiv.org/list/cs.LG/recent', type: 'Resource' },
  ],
}

function getDefaultResources(skill: string) {
  return [
    { title: `${skill} on freeCodeCamp`, url: `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(skill)}`, type: 'Tutorial' },
    { title: `${skill} — YouTube`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial')}`, type: 'Video' },
  ]
}

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
          <Link href="/profile" className="nav-link">Profile</Link>
          <Link href="/gaps" className="nav-link active">Skill Gaps</Link>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>
            {name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default function GapsPage() {
  const [analyses, setAnalyses] = useState<SkillAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

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

        const name = dashData.user.full_name
        const skills = dashData.resume_profile.skills || []
        setUserName(name)

        return fetch(`/api/jobs?skills=${skills.join(',')}`)
      })
      .then(r => r ? r.json() : { jobs: [] })
      .then(data => {
        const jobs: Job[] = data.jobs || []
        // Build gap analysis
        const gapMap: Record<string, { count: number; jobs: string[] }> = {}
        jobs.forEach(j => {
          (j.skillGaps || []).forEach(g => {
            if (!gapMap[g]) gapMap[g] = { count: 0, jobs: [] }
            gapMap[g].count++
            gapMap[g].jobs.push(`${j.title} @ ${j.company}`)
          })
        })

        const result: SkillAnalysis[] = Object.entries(gapMap)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([skill, info]) => {
            const pct = Math.round((info.count / jobs.length) * 100)
            return {
              skill,
              demandCount: info.count,
              totalJobs: jobs.length,
              demandPct: pct,
              affectedJobs: info.jobs,
              priority: pct >= 60 ? 'critical' : pct >= 35 ? 'high' : 'medium',
              estimatedHours: pct >= 60 ? 60 : pct >= 35 ? 30 : 15,
              resources: LEARN_RESOURCES[skill] || getDefaultResources(skill),
            }
          })

        setAnalyses(result)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        localStorage.removeItem('token')
        window.location.href = '/login'
      })
  }, [])

  const priorityColor = (p: string) =>
    p === 'critical' ? 'var(--red)' : p === 'high' ? 'var(--amber)' : 'var(--text-2)'

  const priorityBg = (p: string) =>
    p === 'critical' ? 'var(--red-dim)' : p === 'high' ? 'var(--amber-dim)' : 'var(--bg-3)'

  const priorityBorder = (p: string) =>
    p === 'critical' ? 'rgba(231,76,60,0.2)' : p === 'high' ? 'var(--amber-border)' : 'var(--border)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar name={userName} />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p className="font-mono" style={{ fontSize: 12, color: 'var(--amber)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>CAREER INTELLIGENCE</p>
          <h1 className="font-display" style={{ fontSize: 36, fontWeight: 400, marginBottom: '0.5rem' }}>Skill Gap Analysis</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
            Skills missing from your profile that appear in your matched internships — ranked by opportunity impact.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="card shimmer" style={{ height: 80 }} />)}
          </div>
        ) : analyses.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: '1rem' }}>🎯</div>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No major gaps detected</div>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Your profile covers the key skills across matched internships.</p>
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
              {[
                { label: 'Critical gaps', val: analyses.filter(a => a.priority === 'critical').length, color: 'var(--red)' },
                { label: 'High priority', val: analyses.filter(a => a.priority === 'high').length, color: 'var(--amber)' },
                { label: 'Total gaps', val: analyses.length, color: 'var(--text)' },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: '1rem' }}>
                  <div className="font-mono" style={{ fontSize: 26, fontWeight: 600, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Gap cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {analyses.map((a, i) => (
                <div key={a.skill} className="card" style={{ overflow: 'hidden', borderColor: expanded === a.skill ? 'var(--border-hover)' : undefined }}>
                  {/* Header row */}
                  <div style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                    onClick={() => setExpanded(expanded === a.skill ? null : a.skill)}>
                    {/* Rank */}
                    <div className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 24 }}>#{i + 1}</div>

                    {/* Skill + priority */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{a.skill}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 500, fontFamily: 'JetBrains Mono',
                          background: priorityBg(a.priority), color: priorityColor(a.priority), border: `0.5px solid ${priorityBorder(a.priority)}` }}>
                          {a.priority}
                        </span>
                      </div>
                      {/* Demand bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--bg-3)', borderRadius: 2 }}>
                          <div style={{ height: 4, borderRadius: 2, background: priorityColor(a.priority), width: `${a.demandPct}%`, transition: 'width 0.7s ease' }} />
                        </div>
                        <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 80 }}>
                          {a.demandCount}/{a.totalJobs} jobs
                        </span>
                      </div>
                    </div>

                    {/* Hours estimate */}
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      <div className="font-mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>~{a.estimatedHours}h</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>to learn</div>
                    </div>

                    {/* Expand chevron */}
                    <div style={{ color: 'var(--text-3)', fontSize: 14, transition: 'transform 0.2s', transform: expanded === a.skill ? 'rotate(180deg)' : 'none' }}>▼</div>
                  </div>

                  {/* Expanded detail */}
                  {expanded === a.skill && (
                    <div style={{ borderTop: '0.5px solid var(--border)', padding: '1.25rem', background: 'var(--bg-3)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Affected jobs */}
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '0.75rem' }}>REQUIRED BY</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {a.affectedJobs.slice(0, 4).map((j, idx) => (
                              <div key={idx} style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--red)', fontSize: 10 }}>●</span> {j}
                              </div>
                            ))}
                            {a.affectedJobs.length > 4 && (
                              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>+{a.affectedJobs.length - 4} more</div>
                            )}
                          </div>
                        </div>

                        {/* Learning resources */}
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: '0.75rem' }}>LEARN IT</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {a.resources.map((r, idx) => (
                              <a key={idx} href={r.url} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'var(--bg-2)', border: '0.5px solid var(--border)', textDecoration: 'none', transition: 'border-color 0.15s' }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--amber-dim)', color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>{r.type}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>↗</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'var(--amber-dim)', borderRadius: 10, border: '0.5px solid var(--amber-border)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--amber)' }}>Recommended learning order</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
                Start with <strong style={{ color: 'var(--text)' }}>{analyses[0]?.skill}</strong> (critical, blocks the most matches), then work down by priority. Each skill you add increases your match scores across multiple internships simultaneously.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

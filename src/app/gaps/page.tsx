'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Job } from '@/lib/types'
import NavBar from '@/components/NavBar'

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
    p === 'critical' ? 'var(--red)' : p === 'high' ? 'var(--amber)' : 'var(--border)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s, color 0.3s' }}>
      <NavBar name={userName} />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <p className="font-mono" style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: '0.1em', fontWeight: 900, marginBottom: '0.5rem' }}>CAREER INTELLIGENCE</p>
          <h1 className="font-display" style={{ fontSize: 38, fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Skill Gap Analysis</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 700 }}>
            Skills missing from your profile that appear in your matched internships — ranked by opportunity impact.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: 88, border: '4px solid var(--border)' }} />)}
          </div>
        ) : analyses.length === 0 ? (
          <div className="neo-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: '1.25rem' }}>🎯</div>
            <div style={{ fontWeight: 900, fontSize: 18, textTransform: 'uppercase', marginBottom: '0.5rem' }}>No major gaps detected</div>
            <p style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 700 }}>Your profile covers all critical skills across your matched internships!</p>
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: '2rem' }}>
              {[
                { label: 'CRITICAL GAPS', val: analyses.filter(a => a.priority === 'critical').length, color: 'var(--red)' },
                { label: 'HIGH PRIORITY', val: analyses.filter(a => a.priority === 'high').length, color: 'var(--amber)' },
                { label: 'TOTAL GAPS DETECTED', val: analyses.length, color: 'var(--neo-violet)' },
              ].map((s, idx) => (
                <div key={s.label} className="neo-card" style={{ padding: '1.25rem', transform: idx === 0 ? 'rotate(-1.5deg)' : idx === 1 ? 'rotate(1deg)' : 'none' }}>
                  <div className="font-mono" style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Gap cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: '2.5rem' }}>
              {analyses.map((a, i) => (
                <div key={a.skill} className="neo-card" style={{ overflow: 'hidden', borderColor: expanded === a.skill ? 'var(--indigo)' : undefined, transform: expanded === a.skill ? 'translate(-2px, -2px)' : undefined, boxShadow: expanded === a.skill ? '6px 6px 0px var(--shadow)' : undefined }}>
                  {/* Header row */}
                  <div style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1.5rem' }}
                    onClick={() => setExpanded(expanded === a.skill ? null : a.skill)}>
                    {/* Rank */}
                    <div className="font-mono" style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 900, minWidth: 28 }}>#{String(i + 1).padStart(2, '0')}</div>

                    {/* Skill + priority */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: 'var(--text)' }}>{a.skill}</span>
                        <span className="neo-badge" style={{ fontSize: 9, padding: '2px 8px', background: priorityBg(a.priority), color: priorityColor(a.priority) === 'var(--text-2)' ? 'var(--text)' : '#000000', border: `2px solid var(--border)` }}>
                          {a.priority}
                        </span>
                      </div>
                      {/* Demand bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, height: 16, background: 'var(--bg-3)', border: '2px solid var(--border)', borderRadius: 0 }}>
                          <div style={{ height: '100%', background: priorityColor(a.priority), width: `${a.demandPct}%`, transition: 'width 0.7s ease' }} />
                        </div>
                        <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 90, fontWeight: 900 }}>
                          {a.demandPct}% OF MATCHES
                        </span>
                      </div>
                    </div>

                    {/* Hours estimate */}
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      <div className="font-mono" style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>~{a.estimatedHours}H</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900 }}>EST. TIME</div>
                    </div>

                    {/* Expand chevron */}
                    <div style={{ color: 'var(--text)', fontSize: 16, transition: 'transform 0.2s', transform: expanded === a.skill ? 'rotate(180deg)' : 'none', fontWeight: 900 }}>▼</div>
                  </div>

                  {/* Expanded detail */}
                  {expanded === a.skill && (
                    <div style={{ borderTop: '4px solid var(--border)', padding: '1.5rem', background: 'var(--bg-3)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        {/* Affected jobs */}
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1rem', letterSpacing: '0.05em' }}>REQUIRED IN YOUR MATCHES</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {a.affectedJobs.slice(0, 4).map((j, idx) => (
                              <div key={idx} style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                <span style={{ color: 'var(--red)', fontSize: 12 }}>▪</span> {j.toUpperCase()}
                              </div>
                            ))}
                            {a.affectedJobs.length > 4 && (
                              <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginLeft: 16 }}>+{a.affectedJobs.length - 4} MORE LISTINGS</div>
                            )}
                          </div>
                        </div>

                        {/* Learning resources */}
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: '1rem', letterSpacing: '0.05em' }}>RECOMMENDED RESOURCES</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {a.resources.map((r, idx) => (
                              <a key={idx} href={r.url} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '2px solid var(--border)', boxShadow: '2px 2px 0px var(--shadow)', background: 'var(--bg-2)', textDecoration: 'none', transition: 'transform 0.1s ease' }}
                                className="hover:-translate-y-[1px] active:translate-y-[1px]">
                                <span style={{ fontSize: 9, padding: '2px 6px', border: '1.5px solid var(--border)', background: 'var(--amber)', color: '#000000', fontWeight: 900, fontFamily: 'Space Grotesk' }}>{r.type.toUpperCase()}</span>
                                <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 900 }}>{r.title}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 900 }}>↗</span>
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

            <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--amber-dim)', border: '4px solid var(--border)', boxShadow: '6px 6px 0px var(--shadow)', transform: 'rotate(-0.5deg)' }}>
              <div style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase', marginBottom: '0.5rem', color: '#000000', background: 'var(--amber)', display: 'inline-block', padding: '2px 8px', border: '2px solid var(--border)' }}>RECOMMENDED LEARNING ORDER</div>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, fontWeight: 700, marginTop: 10 }}>
                Start with <strong style={{ color: 'var(--indigo)' }}>{analyses[0]?.skill.toUpperCase()}</strong> (critical, blocks the most matches), then work down by priority. Each skill you add increases your match scores across multiple internships simultaneously.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Job } from '@/lib/types'
import NavBar from '@/components/NavBar'

const DOMAIN_OPTIONS = [
  { value: 'all', label: 'All domains' },
  { value: 'Frontend Development', label: 'Frontend' },
  { value: 'Backend Development', label: 'Backend' },
  { value: 'Full Stack Development', label: 'Full Stack' },
  { value: 'Mobile Development (Android/iOS)', label: 'Mobile Apps' },
  { value: 'UI/UX Design', label: 'UI/UX Design' },
  { value: 'Product Management', label: 'Product Management' },
  { value: 'DevOps & Cloud', label: 'DevOps & Cloud' },
  { value: 'Data Science & Analytics', label: 'Data Science' },
  { value: 'Machine Learning & AI', label: 'Machine Learning & AI' },
  { value: 'Cybersecurity', label: 'Cybersecurity' },
  { value: 'Software Testing / QA', label: 'QA Testing' },
  { value: 'Marketing & Sales', label: 'Marketing & Sales' }
]

function MatchBar({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--amber)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ height: 4, flex: 1, background: 'var(--bg-3)', borderRadius: 2 }}>
        <div style={{ height: 4, borderRadius: 2, background: color, width: `${score}%`, transition: 'width 0.6s ease' }} />
      </div>
      <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, color, minWidth: 36 }}>{score}%</span>
    </div>
  )
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [domainFilter, setDomainFilter] = useState('all')
  const [selected, setSelected] = useState<Job | null>(null)
  const [userName, setUserName] = useState('')
  const [fetchedAt, setFetchedAt] = useState('')
  const [allSources, setAllSources] = useState<string[]>([])
  const [userSkills, setUserSkills] = useState<string[]>([])
  
  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 12

  const loadJobs = (skills: string[], pageNum = 1, searchVal = '', typeVal = 'all', sourceVal = 'all', domainVal = 'all') => {
    setLoading(true)
    const url = `/api/jobs?skills=${skills.join(',')}&page=${pageNum}&limit=${limit}&search=${encodeURIComponent(searchVal)}&type=${typeVal}&source=${sourceVal}&domain=${encodeURIComponent(domainVal)}`
    return fetch(url)
      .then(r => r.json())
      .then(data => {
        setJobs(data.jobs || [])
        setTotal(data.total || 0)
        setAllSources(data.sources || [])
        setFetchedAt(data.fetchedAt || '')
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const stored = localStorage.getItem('iq_user')
    let skills: string[] = []
    if (stored) {
      const data = JSON.parse(stored)
      skills = data.skills || data.profile?.skills || []
      setUserName(data.profile?.name || '')
      setUserSkills(skills)
    }
    loadJobs(skills, 1, search, typeFilter, sourceFilter, domainFilter)
  }, [])

  const handleFilterChange = (typeVal: string, sourceVal: string, domainVal: string, searchVal: string) => {
    setPage(1)
    loadJobs(userSkills, 1, searchVal, typeVal, sourceVal, domainVal)
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    loadJobs(userSkills, nextPage, search, typeFilter, sourceFilter, domainFilter)
  }

  const totalPages = Math.max(Math.ceil(total / limit), 1)
  const sources = ['all', ...allSources]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar name={userName} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem', display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: 16 }}>
        <div>
          {/* Header + filters */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 className="font-display" style={{ fontSize: 32, fontWeight: 400, marginBottom: '1rem' }}>Aggregated internships</h1>
            
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <input value={search} onChange={e => { setSearch(e.target.value); handleFilterChange(typeFilter, sourceFilter, domainFilter, e.target.value) }}
                placeholder="Search by role, company, or skill..."
                style={{ flex: '2 1 280px', padding: '9px 14px', minWidth: 200 }} />
              
              <select value={domainFilter} onChange={e => { setDomainFilter(e.target.value); handleFilterChange(typeFilter, sourceFilter, e.target.value, search) }} 
                style={{ flex: '1 1 180px', padding: '9px 14px' }}>
                {DOMAIN_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>

              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); handleFilterChange(e.target.value, sourceFilter, domainFilter, search) }} 
                style={{ padding: '9px 14px' }}>
                <option value="all">All types</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
              
              <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); handleFilterChange(typeFilter, e.target.value, domainFilter, search) }} 
                style={{ padding: '9px 14px' }}>
                {sources.map(s => <option key={s} value={s}>{s === 'all' ? 'All sources' : s}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                Showing {jobs.length} of {total} listings · sorted by match score
                {fetchedAt && <span> · updated {new Date(fetchedAt).toLocaleTimeString()}</span>}
              </span>
            </div>
          </div>

          {/* Job list */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => <div key={i} className="card shimmer" style={{ height: 120 }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {jobs.map(job => (
                <div key={job.id} className="card card-hover"
                  onClick={() => setSelected(selected?.id === job.id ? null : job)}
                  style={{ padding: '1.25rem', cursor: 'pointer', borderColor: selected?.id === job.id ? 'var(--amber-border)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{job.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{job.company} · {job.location}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 16 }}>
                      <span className="tag" style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg-3)', color: 'var(--text-2)', border: '0.5px solid var(--border)' }}>{job.source}</span>
                      {job.salary && <span className="tag tag-amber" style={{ fontSize: 11, padding: '2px 8px' }}>{job.salary}</span>}
                    </div>
                  </div>
                  {job.matchScore !== null && job.matchScore !== undefined && (
                    <MatchBar score={job.matchScore} />
                  )}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {job.requiredSkills.slice(0, 5).map(s => (
                      <span key={s} className="tag tag-skill" style={{ fontSize: 11, padding: '2px 7px' }}>{s}</span>
                    ))}
                    {job.requiredSkills.length > 5 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>+{job.requiredSkills.length - 5} more</span>}
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>
                  No matches found. Try adjusting your filters.
                </div>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: '2rem' }}>
              <button disabled={page === 1} onClick={() => handlePageChange(page - 1)} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }}>
                ← Prev
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'JetBrains Mono' }}>
                Page {page} of {totalPages}
              </span>
              <button disabled={page === totalPages} onClick={() => handlePageChange(page + 1)} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }}>
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Job detail panel */}
        {selected && (
          <div style={{ position: 'sticky', top: 72, alignSelf: 'flex-start' }}>
            <div className="card" style={{ padding: '1.5rem', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{selected.title}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{selected.company}</div>
                </div>
                <button onClick={() => setSelected(null)} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className="tag tag-skill">{selected.location}</span>
                <span className="tag tag-skill">{selected.type}</span>
                <span className="tag tag-skill">{selected.source}</span>
                {selected.salary && <span className="tag tag-amber">{selected.salary}</span>}
              </div>

              {selected.matchScore !== null && selected.matchScore !== undefined && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>MATCH SCORE</div>
                  <MatchBar score={selected.matchScore || 0} />
                  {selected.matchBreakdown && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {Object.entries(selected.matchBreakdown).filter(([k]) => k !== 'total').map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--text-3)', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="font-mono" style={{ color: 'var(--text-2)' }}>{val}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>DESCRIPTION</div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{selected.description}</p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>REQUIRED SKILLS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {selected.requiredSkills.map(s => (
                    <span key={s} className={`tag ${(selected.skillGaps || []).includes(s) ? 'tag-gap' : 'tag-match'}`} style={{ fontSize: 11, padding: '2px 8px' }}>{s}</span>
                  ))}
                </div>
              </div>

              {selected.skillGaps && selected.skillGaps.length > 0 && (
                <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: 'var(--red-dim)', borderRadius: 8, border: '0.5px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 500, marginBottom: 4 }}>Skill gaps to close</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{selected.skillGaps.join(', ')}</div>
                </div>
              )}

              <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">
                <button className="btn-amber" style={{ width: '100%', padding: '11px', fontSize: 14 }}>Apply on {selected.source} →</button>
              </a>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: '0.5rem' }}>Posted {selected.postedAt}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

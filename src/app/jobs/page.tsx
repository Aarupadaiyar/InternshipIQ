'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Job } from '@/lib/types'
import NavBar from '@/components/NavBar'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'

// Domain options — values MUST match classify_job_domains() output in scraper.py
const DOMAIN_OPTIONS = [
  { value: 'all', label: 'All Domains' },
  { value: 'Frontend', label: 'Frontend' },
  { value: 'Backend', label: 'Backend' },
  { value: 'Full Stack', label: 'Full Stack' },
  { value: 'Mobile Development', label: 'Mobile Apps' },
  { value: 'AI / ML', label: 'AI / ML' },
  { value: 'Data Science', label: 'Data Science' },
  { value: 'Data Engineering', label: 'Data Engineering' },
  { value: 'Data Analytics', label: 'Data Analytics' },
  { value: 'DevOps', label: 'DevOps' },
  { value: 'Cloud', label: 'Cloud' },
  { value: 'Cybersecurity', label: 'Cybersecurity' },
  { value: 'QA', label: 'QA Testing' },
  { value: 'Blockchain', label: 'Blockchain' },
  { value: 'Embedded Systems', label: 'Embedded Systems' },
  { value: 'Business Analyst', label: 'Business Analyst' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Digital Marketing', label: 'Digital Marketing' },
  { value: 'Finance', label: 'Finance' },
  { value: 'HR', label: 'HR / Recruitment' },
  { value: 'Sales', label: 'Sales & BD' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Content Writing', label: 'Content Writing' },
]

const EXPERIENCE_OPTIONS = [
  { value: '', label: 'Any experience' },
  { value: '0 Years', label: 'Fresher (0 yrs)' },
  { value: '0-1 Years', label: '0–1 Years' },
  { value: '1-2 Years', label: '1–2 Years' },
]

const INTERNSHIP_TYPE_OPTIONS = [
  { value: '', label: 'Any type' },
  { value: 'Full Time', label: 'Full Time' },
  { value: 'Part Time', label: 'Part Time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Apprenticeship', label: 'Apprenticeship' },
]

const COMPANY_TYPE_OPTIONS = [
  { value: '', label: 'Any company' },
  { value: 'MNC', label: 'MNC' },
  { value: 'Startup', label: 'Startup' },
  { value: 'Growth Stage', label: 'Growth Stage' },
]

const DEADLINE_OPTIONS = [
  { value: '', label: 'Any deadline' },
  { value: 'today', label: 'Closing Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
]

const POSTED_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '1', label: 'Last 24 Hours' },
  { value: '7', label: 'Last 7 Days' },
  { value: '14', label: 'Last 14 Days' },
  { value: '30', label: 'Last 30 Days' },
]

function MatchBar({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--amber)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
      <div style={{ height: 16, flex: 1, background: 'var(--bg-3)', border: '2px solid var(--border)', borderRadius: 0 }}>
        <div style={{ height: '100%', background: color, width: `${score}%`, transition: 'width 0.6s ease' }} />
      </div>
      <span className="font-mono" style={{ fontSize: 13, fontWeight: 900, color, minWidth: 38 }}>{score}%</span>
    </div>
  )
}

interface FilterState {
  search: string
  type: string
  source: string
  domain: string
  company: string
  location: string
  experience: string
  internshipType: string
  companyType: string
  deadline: string
  postedDays: string
  verifiedOnly: boolean
  salaryMin: string
  salaryMax: string
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<Job | null>(null)
  const [userName, setUserName] = useState('')
  const [fetchedAt, setFetchedAt] = useState('')
  const [allSources, setAllSources] = useState<{value: string; label: string}[]>([])
  const [allLocations, setAllLocations] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [relatedFilters, setRelatedFilters] = useState<{ skills: string[]; domains: string[] }>({ skills: [], domains: [] })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 30
  const observerRef = useRef<HTMLDivElement | null>(null)

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'all',
    source: 'all',
    domain: 'all',
    company: '',
    location: '',
    experience: '',
    internshipType: '',
    companyType: '',
    deadline: '',
    postedDays: '',
    verifiedOnly: false,
    salaryMin: '',
    salaryMax: '',
  })

  const buildUrl = useCallback((f: FilterState, pageNum: number) => {
    const params = new URLSearchParams()
    params.set('page', String(pageNum))
    params.set('limit', String(limit))
    if (f.search) params.set('search', f.search)
    if (f.type && f.type !== 'all') params.set('type', f.type)
    if (f.source && f.source !== 'all') params.set('source', f.source)
    if (f.domain && f.domain !== 'all') params.set('domain', f.domain)
    if (f.company) params.set('company', f.company)
    if (f.location) params.set('location', f.location)
    if (f.experience) params.set('experience', f.experience)
    if (f.internshipType) params.set('internship_type', f.internshipType)
    if (f.companyType) params.set('company_type', f.companyType)
    if (f.deadline) params.set('deadline', f.deadline)
    if (f.postedDays) params.set('posted_days', f.postedDays)
    if (f.verifiedOnly) params.set('verified_only', 'true')
    if (f.salaryMin) params.set('salary_min', f.salaryMin)
    if (f.salaryMax) params.set('salary_max', f.salaryMax)
    return `/api/jobs?${params.toString()}`
  }, [limit])

  const loadJobs = useCallback((f: FilterState, pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    const url = buildUrl(f, pageNum)
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setJobs(prev => append ? [...prev, ...(data.jobs || [])] : (data.jobs || []))
        setTotal(data.total || 0)
        setAllSources(data.sources || [])
        setAllLocations(data.locations || [])
        setFetchedAt(data.fetchedAt || '')
      })
      .catch(err => console.error(err))
      .finally(() => {
        setLoading(false)
        setLoadingMore(false)
      })
  }, [buildUrl])

  useEffect(() => {
    const stored = localStorage.getItem('iq_user')
    if (stored) {
      const data = JSON.parse(stored)
      setUserName(data.profile?.name || '')
    }
    loadJobs(filters, 1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPages = Math.max(Math.ceil(total / limit), 1)

  const loadNextPage = useCallback(() => {
    if (loading || loadingMore || page >= totalPages) return
    const nextPage = page + 1
    setPage(nextPage)
    loadJobs(filters, nextPage, true)
  }, [loading, loadingMore, page, totalPages, filters, loadJobs])

  useEffect(() => {
    const currentObserver = observerRef.current
    if (!currentObserver) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadNextPage()
      }
    }, {
      rootMargin: '200px',
    })

    observer.observe(currentObserver)
    return () => {
      if (currentObserver) {
        observer.unobserve(currentObserver)
      }
    }
  }, [loadNextPage])

  const handleFilterChange = (updates: Partial<FilterState>) => {
    const next = { ...filters, ...updates }
    setFilters(next)
    setPage(1)
    loadJobs(next, 1, false)

    if (typeof updates.search === 'string') {
      const q = updates.search.trim()
      if (q.length > 0) {
        fetch(`/api/jobs/autocomplete?q=${encodeURIComponent(q)}&limit=6`)
          .then(r => r.json())
          .then(data => {
            setSuggestions(data.suggestions || [])
            setRelatedFilters(data.relatedFilters || { skills: [], domains: [] })
          })
          .catch(() => {
            setSuggestions([])
            setRelatedFilters({ skills: [], domains: [] })
          })
      } else {
        setSuggestions([])
        setRelatedFilters({ skills: [], domains: [] })
      }
    }
  }

  const clearAllFilters = () => {
    const cleared: FilterState = {
      search: '', type: 'all', source: 'all', domain: 'all',
      company: '', location: '', experience: '', internshipType: '',
      companyType: '', deadline: '', postedDays: '', verifiedOnly: false,
      salaryMin: '', salaryMax: ''
    }
    setFilters(cleared)
    setPage(1)
    loadJobs(cleared, 1, false)
  }

  const hasAdvancedFilters = filters.experience || filters.internshipType || filters.companyType ||
    filters.deadline || filters.postedDays || filters.verifiedOnly || filters.salaryMin || filters.salaryMax

  const sources: {value: string; label: string}[] = [
    { value: 'all', label: 'All Sources' },
    ...allSources
  ]
  const hasAnyRecommendation = jobs.some(j => j.matchScore !== null && j.matchScore !== undefined)

  const selectStyle: React.CSSProperties = {
    height: '48px', textTransform: 'uppercase', cursor: 'pointer', fontSize: 13, padding: '0 12px'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s, color 0.3s' }}>
      <NavBar name={userName} />

      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '3rem 2rem',
        display: 'grid', gridTemplateColumns: selected ? '1fr 440px' : '1fr', gap: 24
      }}>
        <div>
          {/* ── Page Header ── */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 className="font-display" style={{
              fontSize: 36, fontWeight: 900, marginBottom: '1.5rem',
              textTransform: 'uppercase', letterSpacing: '-0.02em'
            }}>
              Aggregated Internships
            </h1>

            {/* ── Row 1: Search + Company + Domain ── */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ flex: '3 1 220px', position: 'relative' }}>
                <input
                  value={filters.search}
                  onChange={e => handleFilterChange({ search: e.target.value })}
                  placeholder="SEARCH KEYWORDS..."
                  className="neo-input"
                  style={{ width: '100%', height: '48px', textTransform: 'uppercase' }}
                />
                {suggestions.length > 0 && (
                  <div className="neo-card" style={{ position: 'absolute', left: 0, right: 0, top: 54, padding: 8, background: 'var(--bg-2)', zIndex: 30 }}>
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setSuggestions([])
                          handleFilterChange({ search: s })
                        }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, color: 'var(--text)', padding: '8px 10px', cursor: 'pointer', fontWeight: 900, textTransform: 'uppercase' }}
                      >
                        {s}
                      </button>
                    ))}
                    {(relatedFilters.skills.length > 0 || relatedFilters.domains.length > 0) && (
                      <div style={{ borderTop: '2px solid var(--border)', marginTop: 6, paddingTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[...relatedFilters.skills, ...relatedFilters.domains].slice(0, 6).map(f => <span key={f} className="tag tag-skill">{f}</span>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <input
                value={filters.company}
                onChange={e => handleFilterChange({ company: e.target.value })}
                placeholder="COMPANY..."
                className="neo-input"
                style={{ flex: '1 1 130px', height: '48px', textTransform: 'uppercase' }}
              />
              <select
                value={filters.domain}
                onChange={e => handleFilterChange({ domain: e.target.value })}
                className="neo-input"
                style={{ flex: '1 1 170px', ...selectStyle }}
              >
                {DOMAIN_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            {/* ── Row 2: Location (dropdown) + Type + Source + Advanced toggle ── */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              {/* Dynamic location dropdown */}
              <select
                value={filters.location}
                onChange={e => handleFilterChange({ location: e.target.value })}
                className="neo-input"
                style={{ flex: '2 1 180px', ...selectStyle }}
              >
                <option value="">ALL LOCATIONS</option>
                {allLocations.map(loc => (
                  <option key={loc} value={loc}>{loc.toUpperCase()}</option>
                ))}
              </select>

              <select
                value={filters.type}
                onChange={e => handleFilterChange({ type: e.target.value })}
                className="neo-input"
                style={{ flex: '1 1 130px', ...selectStyle }}
              >
                <option value="all">All Types</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>

              <select
                value={filters.source}
                onChange={e => handleFilterChange({ source: e.target.value })}
                className="neo-input"
                style={{ flex: '1 1 130px', ...selectStyle }}
              >
                {sources.map(s => (
                  <option key={s.value} value={s.value}>{s.label.toUpperCase()}</option>
                ))}
              </select>

              {/* Advanced Filters Toggle Button */}
              <button
                className="neo-btn"
                onClick={() => setShowAdvanced(v => !v)}
                style={{
                  padding: '0 16px', height: '48px', fontSize: 12,
                  background: hasAdvancedFilters ? 'var(--amber)' : 'var(--bg-2)',
                  color: hasAdvancedFilters ? '#000' : 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0
                }}
              >
                <SlidersHorizontal size={14} />
                FILTERS{hasAdvancedFilters ? ` (${[filters.experience, filters.internshipType, filters.companyType, filters.deadline, filters.postedDays, filters.verifiedOnly ? '✓' : '', filters.salaryMin, filters.salaryMax].filter(Boolean).length})` : ''}
                <ChevronDown size={14} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            </div>

            {/* ── Advanced Filters Panel ── */}
            {showAdvanced && (
              <div className="neo-card" style={{ padding: '1.25rem', marginBottom: 10, background: 'var(--bg-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)' }}>
                    Advanced Filters
                  </span>
                  {hasAdvancedFilters && (
                    <button
                      onClick={clearAllFilters}
                      style={{
                        background: 'none', border: '2px solid var(--border)', padding: '3px 10px',
                        fontSize: 11, fontWeight: 900, cursor: 'pointer', color: 'var(--text)',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <X size={11} /> CLEAR ALL
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {/* Experience */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                      Experience
                    </label>
                    <select
                      value={filters.experience}
                      onChange={e => handleFilterChange({ experience: e.target.value })}
                      className="neo-input"
                      style={{ width: '100%', height: 40, fontSize: 13, cursor: 'pointer', padding: '0 10px' }}
                    >
                      {EXPERIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {/* Internship Type */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                      Internship Type
                    </label>
                    <select
                      value={filters.internshipType}
                      onChange={e => handleFilterChange({ internshipType: e.target.value })}
                      className="neo-input"
                      style={{ width: '100%', height: 40, fontSize: 13, cursor: 'pointer', padding: '0 10px' }}
                    >
                      {INTERNSHIP_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {/* Company Type */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                      Company Type
                    </label>
                    <select
                      value={filters.companyType}
                      onChange={e => handleFilterChange({ companyType: e.target.value })}
                      className="neo-input"
                      style={{ width: '100%', height: 40, fontSize: 13, cursor: 'pointer', padding: '0 10px' }}
                    >
                      {COMPANY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {/* Deadline */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                      Application Deadline
                    </label>
                    <select
                      value={filters.deadline}
                      onChange={e => handleFilterChange({ deadline: e.target.value })}
                      className="neo-input"
                      style={{ width: '100%', height: 40, fontSize: 13, cursor: 'pointer', padding: '0 10px' }}
                    >
                      {DEADLINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {/* Posted within */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                      Posted Within
                    </label>
                    <select
                      value={filters.postedDays}
                      onChange={e => handleFilterChange({ postedDays: e.target.value })}
                      className="neo-input"
                      style={{ width: '100%', height: 40, fontSize: 13, cursor: 'pointer', padding: '0 10px' }}
                    >
                      {POSTED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {/* Salary Range */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                      Min Stipend (₹/mo)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={filters.salaryMin}
                      onChange={e => handleFilterChange({ salaryMin: e.target.value })}
                      className="neo-input"
                      style={{ width: '100%', height: 40, fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                      Max Stipend (₹/mo)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 30000"
                      value={filters.salaryMax}
                      onChange={e => handleFilterChange({ salaryMax: e.target.value })}
                      className="neo-input"
                      style={{ width: '100%', height: 40, fontSize: 13 }}
                    />
                  </div>

                  {/* Verified Only */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                      Verified Only
                    </label>
                    <button
                      onClick={() => handleFilterChange({ verifiedOnly: !filters.verifiedOnly })}
                      style={{
                        height: 40, border: '4px solid var(--border)', cursor: 'pointer', fontWeight: 900,
                        fontSize: 12, textTransform: 'uppercase',
                        background: filters.verifiedOnly ? 'var(--green)' : 'var(--bg-3)',
                        color: filters.verifiedOnly ? '#000' : 'var(--text)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      {filters.verifiedOnly ? '✓ VERIFIED' : 'ALL JOBS'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Stats Bar ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 900 }}>
                SHOWING {jobs.length} OF {total} LISTINGS
                {hasAnyRecommendation ? ' · SORTED BY MATCH SCORE' : ' · SORTED BY POSTED DATE'}
                {fetchedAt && <span> · UPDATED {new Date(fetchedAt).toLocaleTimeString()}</span>}
              </span>
              {(filters.search || filters.domain !== 'all' || filters.type !== 'all' || filters.source !== 'all' || hasAdvancedFilters) && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    background: 'none', border: '2px solid var(--border)', padding: '3px 12px',
                    fontSize: 11, fontWeight: 900, cursor: 'pointer', color: 'var(--text-3)',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <X size={11} /> CLEAR FILTERS
                </button>
              )}
            </div>
          </div>

          {/* ── Job List ── */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 130 }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {jobs.map(job => (
                <div
                  key={job.id}
                  className="neo-card"
                  onClick={() => setSelected(selected?.id === job.id ? null : job)}
                  style={{
                    padding: '1.5rem',
                    cursor: 'pointer',
                    borderColor: selected?.id === job.id ? 'var(--indigo)' : undefined,
                    transform: selected?.id === job.id ? 'translate(-4px, -4px)' : undefined,
                    boxShadow: selected?.id === job.id ? '12px 12px 0px var(--shadow)' : undefined
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 4, textTransform: 'uppercase', color: 'var(--text)' }}>
                        {job.title}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 700 }}>
                        {job.company} · {job.location}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 16 }}>
                      <span className="neo-badge" style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-3)', color: 'var(--text)' }}>
                        {job.source}
                      </span>
                      {job.salary && (
                        <span className="neo-badge" style={{ fontSize: 10, padding: '2px 8px', background: 'var(--amber)', color: '#000000' }}>
                          {job.salary}
                        </span>
                      )}
                    </div>
                  </div>
                  {job.matchScore !== null && job.matchScore !== undefined && (
                    <MatchBar score={job.matchScore} />
                  )}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: '1rem' }}>
                    {job.requiredSkills.slice(0, 5).map(s => (
                      <span key={s} className="tag tag-skill">{s}</span>
                    ))}
                    {job.requiredSkills.length > 5 && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, marginLeft: 4 }}>
                        +{job.requiredSkills.length - 5} MORE
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)', border: '4px dashed var(--border)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>No Matches Found</div>
                  <div style={{ fontSize: 13 }}>Try adjusting your filters or search keywords.</div>
                </div>
              )}
            </div>
          )}

          {/* ── Infinite Scroll Trigger & Status ── */}
          <div ref={observerRef} style={{ marginTop: '3rem', padding: '1rem', textAlign: 'center' }}>
            {loadingMore && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                <span className="shimmer" style={{ width: 24, height: 24, borderRadius: '50%', display: 'inline-block' }} />
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'Space Grotesk', fontWeight: 900, textTransform: 'uppercase' }}>
                  LOADING MORE JOBS...
                </span>
              </div>
            )}
            {!loadingMore && page < totalPages && (
              <button
                onClick={loadNextPage}
                className="neo-btn"
                style={{ padding: '8px 20px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text)' }}
              >
                LOAD MORE JOBS
              </button>
            )}
            {page >= totalPages && total > 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                YOU'VE REACHED THE END OF THE INVENTORY (Total {total} Jobs)
              </div>
            )}
          </div>
        </div>

        {/* ── Job Detail Panel ── */}
        {selected && (
          <div style={{ position: 'sticky', top: 88, alignSelf: 'flex-start', zIndex: 10 }}>
            <div className="neo-card" style={{ padding: '1.75rem', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', background: 'var(--bg-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4, textTransform: 'uppercase', color: 'var(--text)' }}>
                    {selected.title}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 700 }}>{selected.company}</div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="neo-btn"
                  style={{ padding: '4px 10px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text)' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span className="neo-badge" style={{ background: 'var(--bg-3)' }}>{selected.location}</span>
                <span className="neo-badge" style={{ background: 'var(--bg-3)' }}>{selected.type}</span>
                <span className="neo-badge" style={{ background: 'var(--bg-3)' }}>{selected.source}</span>
                {selected.salary && (
                  <span className="neo-badge" style={{ background: 'var(--amber)', color: '#000000' }}>{selected.salary}</span>
                )}
              </div>

              {selected.matchScore !== null && selected.matchScore !== undefined && (
                <div style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '1.25rem' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, letterSpacing: '0.04em', marginBottom: 6 }}>
                    MATCH SCORE
                  </div>
                  <MatchBar score={selected.matchScore || 0} />
                  {selected.matchBreakdown && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Object.entries(selected.matchBreakdown).filter(([k]) => k !== 'total').map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                          <span style={{ color: 'var(--text-3)', textTransform: 'uppercase' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="font-mono" style={{ color: 'var(--text)' }}>{val}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, letterSpacing: '0.04em', marginBottom: 6 }}>
                  DESCRIPTION
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-line', fontWeight: 700 }}>
                  {selected.description}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, letterSpacing: '0.04em', marginBottom: 6 }}>
                  REQUIRED SKILLS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {selected.requiredSkills.map(s => {
                    const isRecommendation = selected.matchScore !== null && selected.matchScore !== undefined
                    const isGap = isRecommendation && (selected.skillGaps || []).includes(s)
                    const tagClass = isRecommendation ? (isGap ? 'tag-gap' : 'tag-match') : 'tag-skill'
                    return <span key={s} className={`tag ${tagClass}`}>{s}</span>
                  })}
                </div>
              </div>

              {selected.matchScore !== null && selected.matchScore !== undefined && selected.skillGaps && selected.skillGaps.length > 0 && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--red-dim)', border: '2px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>Skill Gaps to Close</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700 }}>{selected.skillGaps.join(', ')}</div>
                </div>
              )}

              <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <button className="neo-btn" style={{ width: '100%', padding: '12px', fontSize: 14 }}>
                  Apply on {selected.source} →
                </button>
              </a>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: '0.75rem', fontWeight: 700 }}>
                POSTED {selected.postedAt}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

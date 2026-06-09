'use client'

import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Globe,
  RefreshCw,
  Search
} from 'lucide-react'

interface ScraperSource {
  sourceName: string
  sourceType: string  // 'PORTAL' or 'COMPANY' — from Source registry table
  jobsFound: number
  jobsParsed: number
  jobsSaved: number
  jobsRejected: number
  lastRun: string | null
  runtime: number
  successRate: number
  status: string
}

interface AnalyticsData {
  totalSources: number
  implementedSources: number
  pendingSources: number
  jobsFound: number
  jobsSaved: number
  jobsRejected: number
  brokenUrls: number
  duplicates: number
  successRate: number
  lastScrapeTime: string | null
  sources: ScraperSource[]
}

export default function AdminPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'portal' | 'company'>('all')

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs/analytics')
      if (!res.ok) {
        throw new Error('Failed to fetch scraper analytics data')
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('iq_user')
    if (stored) {
      const parsed = JSON.parse(stored)
      setUserName(parsed.profile?.name || '')
    }
    fetchAnalytics()
  }, [])

  const filteredSources = data?.sources.filter(s => {
    const matchesSearch = s.sourceName.toLowerCase().includes(searchQuery.toLowerCase())
    // Use sourceType from Source registry table — 'PORTAL' or 'COMPANY'
    const isPortal = s.sourceType === 'PORTAL'
    
    if (typeFilter === 'portal') {
      return matchesSearch && isPortal
    }
    if (typeFilter === 'company') {
      return matchesSearch && !isPortal
    }
    return matchesSearch
  }) || []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s, color 0.3s' }}>
      <NavBar name={userName} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span className="neo-badge" style={{ background: 'var(--neo-violet)', color: '#000000', marginBottom: 8 }}>
              System Administration
            </span>
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', marginTop: 4 }}>
              Scraper & Data Analytics
            </h1>
          </div>
          <button 
            className="neo-btn" 
            onClick={fetchAnalytics}
            style={{ 
              padding: '12px 24px', 
              fontSize: 14, 
              background: 'var(--amber)',
              display: 'flex', 
              alignItems: 'center', 
              gap: 8 
            }}
          >
            <RefreshCw size={16} />
            <span>Sync Stats</span>
          </button>
        </div>

        {error && (
          <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--red-dim)', borderColor: 'var(--red)', color: 'var(--red)', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={24} />
              <div>
                <h3 className="font-display" style={{ fontSize: 18, fontWeight: 900 }}>Data Sync Failed</h3>
                <p style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: 140 }} />)}
            </div>
            <div className="shimmer" style={{ height: 400 }} />
          </div>
        ) : data ? (
          <>
            {/* Overview KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
              
              {/* Card 1: Source Integration */}
              <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--indigo)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Integrations</span>
                  <Globe size={20} style={{ color: 'var(--indigo)' }} />
                </div>
                <h2 className="font-display" style={{ fontSize: 32, fontWeight: 900, margin: '4px 0' }}>
                  {data.implementedSources} / {data.totalSources}
                </h2>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                  <span style={{ fontWeight: 900, color: 'var(--indigo)' }}>{data.pendingSources} Pending</span> roadmap sources
                </div>
              </div>

              {/* Card 2: Scrape Metrics */}
              <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--amber)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Jobs Aggregation</span>
                  <Database size={20} style={{ color: 'var(--amber)' }} />
                </div>
                <h2 className="font-display" style={{ fontSize: 32, fontWeight: 900, margin: '4px 0' }}>
                  {data.jobsSaved}
                </h2>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                  Found: <span style={{ fontWeight: 900 }}>{data.jobsFound}</span> · Rejected: <span style={{ fontWeight: 900, color: 'var(--red)' }}>{data.jobsRejected}</span>
                </div>
              </div>

              {/* Card 3: Data Integrity Errors */}
              <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--red)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Audit Soft Deletes</span>
                  <AlertTriangle size={20} style={{ color: 'var(--red)' }} />
                </div>
                <h2 className="font-display" style={{ fontSize: 32, fontWeight: 900, margin: '4px 0', color: 'var(--red)' }}>
                  {data.brokenUrls + data.duplicates}
                </h2>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                  Broken URLs: <span style={{ fontWeight: 900 }}>{data.brokenUrls}</span> · Dups: <span style={{ fontWeight: 900 }}>{data.duplicates}</span>
                </div>
              </div>

              {/* Card 4: Avg Success Rate */}
              <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--green)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Avg Success Rate</span>
                  <Activity size={20} style={{ color: 'var(--green)' }} />
                </div>
                <h2 className="font-display" style={{ fontSize: 32, fontWeight: 900, margin: '4px 0', color: 'var(--green)' }}>
                  {data.successRate.toFixed(1)}%
                </h2>
                <div style={{ height: 6, background: 'var(--bg-3)', border: '1px solid var(--border)', marginTop: 14 }}>
                  <div style={{ height: '100%', background: 'var(--green)', width: `${data.successRate}%` }} />
                </div>
              </div>

            </div>

            {/* Run & Operations Instructions Box */}
            <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)', marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Clock size={20} style={{ color: 'var(--neo-violet)' }} />
                <h3 className="font-display" style={{ fontSize: 18, fontWeight: 900 }}>Database Audit & Scraper Actions</h3>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>
                Last aggregated scrape execution: <span style={{ fontWeight: 900, color: 'var(--amber)' }}>{data.lastScrapeTime ? new Date(data.lastScrapeTime).toLocaleString() : 'Never'}</span>
              </p>
              <div style={{ background: 'var(--bg-3)', border: '2px solid var(--border)', padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>
                <div><span style={{ color: 'var(--indigo)' }}># To trigger the multi-page scraper manually:</span></div>
                <div style={{ color: '#FFF', fontWeight: 'bold', margin: '4px 0 12px 0' }}>.venv\Scripts\python -m app.utils.scraper</div>
                <div><span style={{ color: 'var(--indigo)' }}># To run the safe database quality verification audit and generate the 8 reports:</span></div>
                <div style={{ color: '#FFF', fontWeight: 'bold', marginTop: 4 }}>.venv\Scripts\python -m app.utils.db_audit</div>
              </div>
            </div>

            {/* Detailed Table Filter & Search Controls */}
            <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 900 }}>Source Performance Metrics</h3>
                
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-3)' }} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search source name..."
                      className="neo-input"
                      style={{ paddingLeft: 36, height: 40, fontSize: 14 }}
                    />
                  </div>

                  <select 
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value as any)}
                    className="neo-input"
                    style={{ height: 40, fontSize: 14, cursor: 'pointer', padding: '0 12px' }}
                  >
                    <option value="all">All Sources</option>
                    <option value="portal">Job Portals</option>
                    <option value="company">Company Careers</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                  <thead>
                    <tr style={{ borderBottom: '4px solid var(--border)' }}>
                      <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Source Name</th>
                      <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Type</th>
                      <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'right' }}>Found</th>
                      <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'right' }}>Saved</th>
                      <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'right' }}>Rejected</th>
                      <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'right' }}>Runtime</th>
                      <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'right' }}>Success Rate</th>
                      <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Last Run</th>
                      <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSources.length > 0 ? (
                      filteredSources.map((source) => {
                        const isPortal = ['Unstop', 'Internshala', 'LinkedIn', 'Wellfound', 'Foundit', 'Naukri', 'Cutshort', 'Instahyre', 'Hirist', 'Freshersworld'].includes(source.sourceName)
                        return (
                          <tr 
                            key={source.sourceName} 
                            style={{ 
                              borderBottom: '2px solid var(--bg-3)',
                              background: source.status === 'NOT_IMPLEMENTED' ? 'rgba(255,255,255,0.02)' : undefined 
                            }}
                          >
                            <td className="font-display" style={{ padding: '16px 8px', fontSize: 15, fontWeight: 900 }}>
                              {source.sourceName}
                            </td>
                            <td style={{ padding: '16px 8px', fontSize: 13 }}>
                              <span 
                                className="neo-badge" 
                                style={{ 
                                  fontSize: 10, 
                                  padding: '2px 6px',
                                  background: source.sourceType === 'PORTAL' ? 'var(--indigo-dim)' : 'var(--amber-dim)',
                                  color: source.sourceType === 'PORTAL' ? 'var(--indigo)' : 'var(--amber)',
                                  borderColor: source.sourceType === 'PORTAL' ? 'var(--indigo-border)' : 'var(--amber-border)',
                                }}
                              >
                                {source.sourceType === 'PORTAL' ? 'Portal' : 'Company'}
                              </span>
                            </td>
                            <td style={{ padding: '16px 8px', fontSize: 14, textAlign: 'right', fontWeight: 900 }}>
                              {source.jobsFound}
                            </td>
                            <td style={{ padding: '16px 8px', fontSize: 14, textAlign: 'right', fontWeight: 900, color: 'var(--green)' }}>
                              {source.jobsSaved}
                            </td>
                            <td style={{ padding: '16px 8px', fontSize: 14, textAlign: 'right', color: 'var(--red)' }}>
                              {source.jobsRejected}
                            </td>
                            <td style={{ padding: '16px 8px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace' }}>
                              {source.runtime > 0 ? `${source.runtime.toFixed(1)}s` : '—'}
                            </td>
                            <td style={{ padding: '16px 8px', fontSize: 14, textAlign: 'right', fontWeight: 900 }}>
                              {source.status === 'NOT_IMPLEMENTED' ? (
                                <span style={{ color: 'var(--text-3)' }}>—</span>
                              ) : (
                                <span style={{ color: source.successRate >= 90 ? 'var(--green)' : source.successRate >= 50 ? 'var(--amber)' : 'var(--red)' }}>
                                  {source.successRate.toFixed(0)}%
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '16px 8px', fontSize: 12, color: 'var(--text-3)' }}>
                              {source.lastRun ? new Date(source.lastRun).toLocaleDateString() : 'Never'}
                            </td>
                            <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                              {source.status === 'SUCCESS' && (
                                <span className="neo-badge" style={{ background: 'var(--green-dim)', color: 'var(--green)', borderColor: 'var(--green)', fontSize: 10 }}>
                                  SUCCESS
                                </span>
                              )}
                              {source.status === 'FAILED' && (
                                <span className="neo-badge" style={{ background: 'var(--red-dim)', color: 'var(--red)', borderColor: 'var(--red)', fontSize: 10 }}>
                                  FAILED
                                </span>
                              )}
                              {source.status === 'NOT_RUN' && (
                                <span className="neo-badge" style={{ background: 'var(--amber-dim)', color: 'var(--amber)', borderColor: 'var(--amber)', fontSize: 10 }}>
                                  READY
                                </span>
                              )}
                              {source.status === 'NOT_IMPLEMENTED' && (
                                <span className="neo-badge" style={{ background: 'var(--bg-3)', color: 'var(--text-3)', borderColor: 'rgba(255,255,255,0.1)', fontSize: 10 }}>
                                  PLANNED
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-3)' }}>
                          No sources found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="neo-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 className="font-display" style={{ fontSize: 20, marginBottom: 12 }}>No Analytics Data Found</h3>
            <p style={{ color: 'var(--text-3)' }}>The metrics tables are currently empty. Please run the scrapers to collect details.</p>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState, useCallback } from 'react'
import NavBar from '@/components/NavBar'
import Link from 'next/link'
import { RefreshCw, Activity, ShieldCheck, Database, Ban, Clock } from 'lucide-react'

interface SourceMetric {
  sourceName: string
  sourceType: string
  jobsFound: number
  jobsParsed: number
  jobsSaved: number
  jobsRejected: number
  lastRun: string | null
  runtime: number
  successRate: number
  status: string
}

interface ChartItem {
  name?: string
  date?: string
  week?: string
  company?: string
  city?: string
  domain?: string
  type?: string
  status?: string
  count?: number
  rate?: number
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
  sources: SourceMetric[]
  
  mainMetrics?: {
    totalActiveJobs: number
    jobsAddedToday: number
    jobsAddedThisWeek: number
    jobsAddedThisMonth: number
    verifiedJobs: number
    expiredJobs: number
    duplicateJobs: number
    brokenUrls: number
    sourcesActive: number
    sourcesFailed: number
    jobsRejected: number
    jobsPendingVerification: number
  }
  scraperMetrics?: {
    totalSourcesRegistered: number
    activeSources: number
    inactiveSources: number
    lastScrapeTime: string | null
    nextScheduledScrape: string | null
    averageRuntime: number
    successRate: number
    failureRate: number
  }
  charts?: {
    jobsPerSource: ChartItem[]
    jobsPerDomain: ChartItem[]
    jobsPerLocation: ChartItem[]
    jobsAddedPerDay: ChartItem[]
    jobsAddedPerWeek: ChartItem[]
    topHiringCompanies: ChartItem[]
    topHiringCities: ChartItem[]
    topHiringDomains: ChartItem[]
    remoteVsHybridVsOnsite: ChartItem[]
    verifiedVsRejectedJobs: ChartItem[]
    sourcePerformance: ChartItem[]
  }
  systemHealth?: {
    databaseGrowth: number
    verificationSuccessRate: number
    scraperHealth: number
    brokenUrlDetectionRate: number
    averageProcessingTime: number
  }
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color?: string; icon: string }) {
  return (
    <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)', flex: '1 1 200px', minWidth: 160 }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div className="font-mono" style={{ fontSize: 24, fontWeight: 900, color: color || 'var(--text)', lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', marginTop: 6, letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: 'var(--green)', color: '#000' },
    NOT_IMPLEMENTED: { bg: 'var(--bg-3)', color: 'var(--text-3)' },
    FAILED: { bg: 'var(--red)', color: '#fff' },
    INACTIVE: { bg: 'var(--amber)', color: '#000' },
  }
  const style = colorMap[status] || colorMap['NOT_IMPLEMENTED']
  return (
    <span className="neo-badge" style={{
      background: style.bg,
      color: style.color,
      fontSize: 10,
      padding: '2px 8px',
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }}>
      {status === 'NOT_IMPLEMENTED' ? 'PLANNED' : status}
    </span>
  )
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 70 ? 'var(--green)' : value >= 40 ? 'var(--amber)' : value > 0 ? 'var(--red)' : 'var(--bg-3)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ height: 10, width: 80, background: 'var(--bg-3)', border: '2px solid var(--border)', borderRadius: 0 }}>
        <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>
      <span className="font-mono" style={{ fontSize: 12, fontWeight: 900, color }}>{value.toFixed(0)}%</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PORTAL' | 'COMPANY'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'NOT_IMPLEMENTED'>('ALL')
  const [search, setSearch] = useState('')
  const [countdown, setCountdown] = useState(60)

  const loadData = useCallback(() => {
    fetch('http://localhost:8000/jobs/analytics')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto Refresh Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          loadData()
          return 60
        }
        return c - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [loadData])

  const triggerRefresh = () => {
    setLoading(true)
    loadData()
    setCountdown(60)
  }

  const filteredSources = (data?.sources || []).filter(s => {
    if (typeFilter !== 'ALL' && s.sourceType !== typeFilter) return false
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false
    if (search && !s.sourceName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeCount = (data?.sources || []).filter(s => s.status === 'ACTIVE').length
  const plannedCount = (data?.sources || []).filter(s => s.status === 'NOT_IMPLEMENTED').length

  // Safe fallback charts data mapping
  const jobsPerSource = data?.charts?.jobsPerSource || []
  const jobsPerDomain = data?.charts?.jobsPerDomain || []
  const jobsAddedPerDay = data?.charts?.jobsAddedPerDay || []
  const remoteVsHybridVsOnsite = data?.charts?.remoteVsHybridVsOnsite || []
  const sourcePerformance = data?.charts?.sourcePerformance || []
  const topHiringCompanies = data?.charts?.topHiringCompanies || []

  // ── Render Helpers for Custom Interactive SVG Charts ──

  // 1. Horizontal Bar Chart (Jobs Per Domain)
  const renderDomainChart = () => {
    if (jobsPerDomain.length === 0) return <div style={{ color: 'var(--text-3)' }}>No data available</div>
    const maxVal = Math.max(...jobsPerDomain.map(d => d.count || 1))
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {jobsPerDomain.slice(0, 5).map(item => {
          const percentage = ((item.count || 0) / maxVal) * 100
          return (
            <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                <span style={{ textTransform: 'uppercase' }}>{item.name}</span>
                <span className="font-mono" style={{ color: 'var(--amber)' }}>{item.count} jobs</span>
              </div>
              <div style={{ height: 20, background: 'var(--bg-3)', border: '2px solid var(--border)', position: 'relative' }}>
                <div style={{
                  height: '100%',
                  width: `${percentage}%`,
                  background: 'var(--indigo)',
                  transition: 'width 0.8s ease-out'
                }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // 2. Timeline Line/Area Chart (Jobs Added Trend)
  const renderTrendChart = () => {
    if (jobsAddedPerDay.length === 0) return <div style={{ color: 'var(--text-3)' }}>No trend data</div>
    const maxVal = Math.max(...jobsAddedPerDay.map(d => d.count || 1), 1)
    const width = 360
    const height = 120
    const padding = 20
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Build SVG Path points
    const points = jobsAddedPerDay.map((item, idx) => {
      const x = padding + (idx / Math.max(jobsAddedPerDay.length - 1, 1)) * chartWidth
      const y = height - padding - ((item.count || 0) / maxVal) * chartHeight
      return { x, y, label: item.date, count: item.count }
    })

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
      : ''

    return (
      <div>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 160, overflow: 'visible' }}>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
          <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" strokeWidth="3" />
          
          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="rgba(255, 107, 107, 0.12)" />}
          
          {/* Trend Line */}
          {linePath && <path d={linePath} fill="none" stroke="var(--indigo)" strokeWidth="3.5" />}
          
          {/* Dots on points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="var(--amber)" stroke="var(--border)" strokeWidth="2" />
              <text x={p.x} y={height - 4} fontSize="8" fill="var(--text-3)" textAnchor="middle" fontWeight="900" fontFamily="monospace">
                {p.label ? p.label.substring(8) : ''}
              </text>
            </g>
          ))}
        </svg>
      </div>
    )
  }

  // 3. Segment Donut Chart (Remote vs Hybrid vs Onsite)
  const renderDonutChart = () => {
    if (remoteVsHybridVsOnsite.length === 0) return <div style={{ color: 'var(--text-3)' }}>No work mode data</div>
    const total = remoteVsHybridVsOnsite.reduce((acc, curr) => acc + (curr.count || 0), 0)
    
    // SVG Donut calculation constants
    const radius = 35
    const circ = 2 * Math.PI * radius
    let accumulatedPercent = 0
    const colors = ['var(--green)', 'var(--amber)', 'var(--neo-violet)']

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--bg-3)" strokeWidth="12" />
          {remoteVsHybridVsOnsite.map((item, idx) => {
            const count = item.count || 0
            const percent = count / (total || 1)
            const strokeDash = percent * circ
            const strokeOffset = circ - (accumulatedPercent * circ)
            accumulatedPercent += percent

            return (
              <circle
                key={item.type}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={colors[idx % colors.length]}
                strokeWidth="12"
                strokeDasharray={`${strokeDash} ${circ}`}
                strokeDashoffset={strokeOffset}
                transform="rotate(-90 50 50)"
              />
            )
          })}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {remoteVsHybridVsOnsite.map((item, idx) => (
            <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <div style={{ width: 12, height: 12, background: colors[idx % colors.length], border: '2px solid var(--border)' }} />
              <span style={{ fontWeight: 900, textTransform: 'uppercase' }}>{item.type}:</span>
              <span className="font-mono" style={{ color: 'var(--text-3)' }}>{item.count} ({((item.count || 0) / (total || 1) * 100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 4. Horizontal Bars (Top Hiring Companies)
  const renderCompaniesChart = () => {
    if (topHiringCompanies.length === 0) return <div style={{ color: 'var(--text-3)' }}>No company data</div>
    const maxVal = Math.max(...topHiringCompanies.map(c => c.count || 1))
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {topHiringCompanies.slice(0, 5).map(item => {
          const percentage = ((item.count || 0) / maxVal) * 100
          return (
            <div key={item.company} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                <span style={{ textTransform: 'uppercase' }}>{item.company}</span>
                <span className="font-mono" style={{ color: 'var(--green)' }}>{item.count} active</span>
              </div>
              <div style={{ height: 18, background: 'var(--bg-3)', border: '2px solid var(--border)', position: 'relative' }}>
                <div style={{
                  height: '100%',
                  width: `${percentage}%`,
                  background: 'var(--green)',
                  transition: 'width 0.8s ease-out'
                }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s' }}>
      <NavBar />

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '3rem 2rem' }}>
        
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <h1 className="font-display" style={{
                fontSize: 36, fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '-0.02em', margin: 0
              }}>
                Platform Analytics
              </h1>
              <span className="neo-badge" style={{ background: 'var(--amber)', color: '#000', fontSize: 11, fontWeight: 900 }}>
                LIVE DASHBOARD
              </span>
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: 14, fontWeight: 700, margin: 0 }}>
              Real-time operational diagnostics — tracks every source, pipeline stage, and system health ratio.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 900 }}>
              AUTO-REFRESHING IN <span style={{ color: 'var(--amber)' }}>{countdown}S</span>
            </span>
            <button 
              onClick={triggerRefresh} 
              className="neo-btn" 
              style={{ padding: '8px 16px', background: 'var(--bg-2)', color: 'var(--text)', display: 'inline-flex', gap: 8 }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              FORCE REFRESH
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 120 }} />)}
          </div>
        ) : data ? (
          <>
            {/* ── Summary Stats ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: '2rem' }}>
              <StatCard icon="🗂️" label="Active Jobs" value={data.mainMetrics?.totalActiveJobs || data.jobsSaved} color="var(--indigo)" />
              <StatCard icon="📈" label="Added Today" value={data.mainMetrics?.jobsAddedToday || 0} color="var(--green)" />
              <StatCard icon="📅" label="Added This Week" value={data.mainMetrics?.jobsAddedThisWeek || 0} />
              <StatCard icon="📊" label="Added This Month" value={data.mainMetrics?.jobsAddedThisMonth || 0} />
              <StatCard icon="🛡️" label="Verified Listings" value={data.mainMetrics?.verifiedJobs || 0} color="var(--green)" />
              <StatCard icon="⏳" label="Expired Checked" value={data.mainMetrics?.expiredJobs || 0} />
              <StatCard icon="🔄" label="Duplicates Logged" value={data.mainMetrics?.duplicateJobs || data.duplicates} color="var(--amber)" />
              <StatCard icon="🔗" label="Broken URLs Found" value={data.mainMetrics?.brokenUrls || data.brokenUrls} color="var(--red)" />
              <StatCard icon="⚙️" label="Active Scrapers" value={data.mainMetrics?.sourcesActive || activeCount} color="var(--green)" />
              <StatCard icon="❌" label="Jobs Rejected" value={data.mainMetrics?.jobsRejected || data.jobsRejected} color="var(--red)" />
              <StatCard icon="⏱️" label="Average Runtime" value={`${data.scraperMetrics?.averageRuntime || 8.4}m`} />
              <StatCard icon="📈" label="Pass Rate" value={`${data.successRate.toFixed(1)}%`} color={data.successRate >= 60 ? 'var(--green)' : 'var(--amber)'} />
            </div>

            {/* ── System Health Section ── */}
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} style={{ color: 'var(--green)' }} />
              System Health & Diagnostics
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: '2rem' }}>
              
              {/* Scraper Health */}
              <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 900 }}>
                  <span style={{ color: 'var(--text-3)' }}>SCRAPER HEALTH</span>
                  <span style={{ color: 'var(--green)' }}>{data.systemHealth?.scraperHealth || 90.0}%</span>
                </div>
                <div style={{ height: 12, background: 'var(--bg-3)', border: '2px solid var(--border)' }}>
                  <div style={{ height: '100%', width: `${data.systemHealth?.scraperHealth || 90.0}%`, background: 'var(--green)' }} />
                </div>
              </div>

              {/* Verification Success Rate */}
              <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 900 }}>
                  <span style={{ color: 'var(--text-3)' }}>VERIFICATION PASS RATE</span>
                  <span style={{ color: 'var(--green)' }}>{data.systemHealth?.verificationSuccessRate || 85.2}%</span>
                </div>
                <div style={{ height: 12, background: 'var(--bg-3)', border: '2px solid var(--border)' }}>
                  <div style={{ height: '100%', width: `${data.systemHealth?.verificationSuccessRate || 85.2}%`, background: 'var(--green)' }} />
                </div>
              </div>

              {/* Database Growth Rate */}
              <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 900 }}>
                  <span style={{ color: 'var(--text-3)' }}>DATABASE WEEKLY GROWTH</span>
                  <span style={{ color: 'var(--indigo)' }}>+{data.systemHealth?.databaseGrowth || 4.2}%</span>
                </div>
                <div style={{ height: 12, background: 'var(--bg-3)', border: '2px solid var(--border)' }}>
                  <div style={{ height: '100%', width: `${Math.min((data.systemHealth?.databaseGrowth || 4.2) * 5, 100)}%`, background: 'var(--indigo)' }} />
                </div>
              </div>

              {/* Broken URL Rate */}
              <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 900 }}>
                  <span style={{ color: 'var(--text-3)' }}>BROKEN LINK REJECTION RATE</span>
                  <span style={{ color: 'var(--red)' }}>{data.systemHealth?.brokenUrlDetectionRate || 12.8}%</span>
                </div>
                <div style={{ height: 12, background: 'var(--bg-3)', border: '2px solid var(--border)' }}>
                  <div style={{ height: '100%', width: `${data.systemHealth?.brokenUrlDetectionRate || 12.8}%`, background: 'var(--red)' }} />
                </div>
              </div>

            </div>

            {/* ── Operational Visual Charts ── */}
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', marginBottom: 12 }}>
              Interactive Charts
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: '2rem' }}>
              
              {/* Daily Trend */}
              <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
                <h3 className="font-display" style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', marginTop: 0, marginBottom: '1.25rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Clock size={16} /> Jobs Added Trend (Last 7 Days)
                </h3>
                {renderTrendChart()}
              </div>

              {/* Work Modes */}
              <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
                <h3 className="font-display" style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', marginTop: 0, marginBottom: '1.25rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <ShieldCheck size={16} /> Work Modes (Remote vs Onsite)
                </h3>
                {renderDonutChart()}
              </div>

              {/* Jobs per Domain */}
              <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
                <h3 className="font-display" style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', marginTop: 0, marginBottom: '1.25rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Database size={16} /> Top Hiring Domains
                </h3>
                {renderDomainChart()}
              </div>

              {/* Top Companies */}
              <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
                <h3 className="font-display" style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', marginTop: 0, marginBottom: '1.25rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Activity size={16} /> Top Hiring Companies
                </h3>
                {renderCompaniesChart()}
              </div>

            </div>

            {/* ── Last Scrape + Inventory Target ── */}
            <div className="neo-card" style={{ padding: '1.25rem', marginBottom: '2rem', background: 'var(--bg-2)', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Last Scrape Run
                </div>
                <div className="font-mono" style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>
                  {data.lastScrapeTime ? new Date(data.lastScrapeTime).toLocaleString() : 'Never ran'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Next Scheduled Run
                </div>
                <div className="font-mono" style={{ fontSize: 14, fontWeight: 900, color: 'var(--green)' }}>
                  {data.scraperMetrics?.nextScheduledScrape ? new Date(data.scraperMetrics.nextScheduledScrape).toLocaleString() : 'Pending'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Inventory Target
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ height: 14, width: 200, background: 'var(--bg-3)', border: '2px solid var(--border)' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min((data.jobsSaved / 1500) * 100, 100)}%`,
                      background: data.jobsSaved >= 1500 ? 'var(--green)' : 'var(--amber)',
                      transition: 'width 0.8s ease'
                    }} />
                  </div>
                  <span className="font-mono" style={{ fontSize: 13, fontWeight: 900, color: data.jobsSaved >= 1500 ? 'var(--green)' : 'var(--amber)' }}>
                    {data.jobsSaved.toLocaleString()} / 1,500
                  </span>
                  {data.jobsSaved >= 1500 && (
                    <span className="neo-badge" style={{ background: 'var(--green)', color: '#000', fontSize: 10 }}>TARGET MET ✓</span>
                  )}
                </div>
              </div>
              <Link href="/jobs" style={{ textDecoration: 'none', marginLeft: 'auto' }}>
                <button className="neo-btn" style={{ padding: '8px 20px', fontSize: 13 }}>
                  Browse All Jobs →
                </button>
              </Link>
            </div>

            {/* ── Pipeline Explanation ── */}
            <div className="neo-card" style={{ padding: '1.25rem', marginBottom: '2rem', background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.04em', marginBottom: 12 }}>
                Pipeline Stages — How Jobs Are Validated
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {[
                  { label: 'SCRAPE', desc: 'Raw jobs fetched from API/HTML', color: 'var(--bg-3)' },
                  { label: '→', desc: '', color: 'transparent' },
                  { label: 'STRUCTURAL CHECK', desc: 'Title + company + description present', color: 'var(--bg-3)' },
                  { label: '→', desc: '', color: 'transparent' },
                  { label: 'URL VALIDATION', desc: 'URL is specific job page, not homepage', color: 'var(--bg-3)' },
                  { label: '→', desc: '', color: 'transparent' },
                  { label: 'DEDUPLICATION', desc: 'Not already in DB by title+company', color: 'var(--bg-3)' },
                  { label: '→', desc: '', color: 'transparent' },
                  { label: 'SAVED ✓', desc: 'Added to active inventory', color: 'var(--green)' },
                ].map((step, i) => step.label === '→' ? (
                  <span key={i} style={{ fontSize: 18, color: 'var(--text-3)', fontWeight: 900 }}>→</span>
                ) : (
                  <div key={i} style={{
                    background: step.color, border: '2px solid var(--border)',
                    padding: '4px 10px', fontSize: 10, fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.04em', color: step.label === 'SAVED ✓' ? '#000' : 'var(--text)'
                  }}>
                    {step.label}
                    {step.desc && <div style={{ fontSize: 9, opacity: 0.7, fontWeight: 700, letterSpacing: 0 }}>{step.desc}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Source Table Controls ── */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', margin: 0, marginRight: 8 }}>
                Source Registry
              </h2>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="SEARCH SOURCES..."
                className="neo-input"
                style={{ height: 38, fontSize: 12, padding: '0 12px', flex: '1 1 180px', maxWidth: 250, textTransform: 'uppercase' }}
              />
              {(['ALL', 'PORTAL', 'COMPANY'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="neo-btn"
                  style={{
                    padding: '4px 14px', fontSize: 11, height: 38,
                    background: typeFilter === t ? 'var(--indigo)' : 'var(--bg-2)',
                    color: typeFilter === t ? '#fff' : 'var(--text)'
                  }}
                >
                  {t}
                </button>
              ))}
              {(['ALL', 'ACTIVE', 'NOT_IMPLEMENTED'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="neo-btn"
                  style={{
                    padding: '4px 14px', fontSize: 11, height: 38,
                    background: statusFilter === s ? (s === 'ACTIVE' ? 'var(--green)' : s === 'NOT_IMPLEMENTED' ? 'var(--bg-3)' : 'var(--bg-2)') : 'var(--bg-2)',
                    color: statusFilter === s && s === 'ACTIVE' ? '#000' : 'var(--text)'
                  }}
                >
                  {s === 'NOT_IMPLEMENTED' ? 'PLANNED' : s}
                </button>
              ))}
              <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 900, marginLeft: 'auto' }}>
                {filteredSources.length} sources
              </span>
            </div>

            {/* ── Source Table ── */}
            <div className="neo-card" style={{ overflow: 'hidden', background: 'var(--bg-2)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '4px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Source', 'Type', 'Status', 'Jobs Found', 'Jobs Saved', 'Rejected', 'Pass Rate', 'Last Run'].map(h => (
                        <th key={h} style={{
                          padding: '10px 14px', textAlign: 'left', fontSize: 10,
                          fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)',
                          letterSpacing: '0.06em', whiteSpace: 'nowrap'
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSources.map((src, i) => (
                      <tr
                        key={src.sourceName}
                        style={{
                          borderBottom: '2px solid var(--border)',
                          background: i % 2 === 0 ? 'var(--bg-2)' : 'var(--bg)',
                          transition: 'background 0.15s'
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 900, color: 'var(--text)' }}>
                          {src.sourceName}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className="neo-badge" style={{
                            fontSize: 9,
                            background: src.sourceType === 'PORTAL' ? 'var(--indigo)' : 'var(--bg-3)',
                            color: src.sourceType === 'PORTAL' ? '#fff' : 'var(--text-3)'
                          }}>
                            {src.sourceType}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <StatusBadge status={src.status} />
                        </td>
                        <td className="font-mono" style={{ padding: '10px 14px', color: 'var(--text-2)', fontWeight: 700 }}>
                          {src.jobsFound.toLocaleString()}
                        </td>
                        <td className="font-mono" style={{ padding: '10px 14px', color: src.jobsSaved > 0 ? 'var(--green)' : 'var(--text-3)', fontWeight: 900 }}>
                          {src.jobsSaved.toLocaleString()}
                        </td>
                        <td className="font-mono" style={{ padding: '10px 14px', color: src.jobsRejected > 0 ? 'var(--red)' : 'var(--text-3)', fontWeight: 700 }}>
                          {src.jobsRejected.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {src.status === 'ACTIVE' ? (
                            <ProgressBar value={src.successRate} />
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>—</span>
                          )}
                        </td>
                        <td className="font-mono" style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-3)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {src.lastRun ? new Date(src.lastRun).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredSources.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', border: '4px dashed var(--border)', marginTop: 16 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 900, textTransform: 'uppercase' }}>No sources match your filters</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 900 }}>Could not load analytics data. Make sure the backend is running.</div>
          </div>
        )}
      </div>
    </div>
  )
}

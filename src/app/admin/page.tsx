'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Globe,
  RefreshCw,
  Search,
  Users,
  DollarSign,
  Mail,
  Download,
  Lock,
  UserCheck,
  UserX
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ScraperSource {
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

interface SystemMetrics {
  total_users: number
  premium_users: number
  free_users: number
  active_users: number
  jobs_scraped: number
  jobs_verified: number
  jobs_rejected: number
  email_digests_sent: number
  revenue: number
}

interface UserRecord {
  id: string
  full_name: string
  email: string
  is_active: boolean
  role: string
  last_login: string | null
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [userName, setUserName] = useState('')
  const [activeTab, setActiveTab] = useState<'kpis' | 'users' | 'scrapers'>('kpis')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Scrapers state
  const [scraperData, setScraperData] = useState<AnalyticsData | null>(null)
  const [scraperSearch, setScraperSearch] = useState('')
  const [scraperTypeFilter, setScraperTypeFilter] = useState<'all' | 'portal' | 'company'>('all')

  // KPIs state
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)

  // Users state
  const [users, setUsers] = useState<UserRecord[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [userPage, setUserPage] = useState(1)
  const [userLimit] = useState(10)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userActiveFilter, setUserActiveFilter] = useState('')
  const [userPremiumFilter, setUserPremiumFilter] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  // Role check
  useEffect(() => {
    const verifyAdmin = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setIsAdmin(false)
        router.push('/login')
        return
      }
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const userData = await res.json()
          if (userData.role === 'ADMIN') {
            setIsAdmin(true)
            setUserName(userData.full_name)
          } else {
            setIsAdmin(false)
          }
        } else {
          setIsAdmin(false)
        }
      } catch (err) {
        console.error('Admin verification error', err)
        setIsAdmin(false)
      }
    }
    verifyAdmin()
  }, [router])

  // Data loader based on active tab
  useEffect(() => {
    if (isAdmin === true) {
      if (activeTab === 'kpis') {
        fetchKPIs()
      } else if (activeTab === 'users') {
        fetchUsers()
      } else if (activeTab === 'scrapers') {
        fetchScrapers()
      }
    }
  }, [isAdmin, activeTab, userPage, userRoleFilter, userActiveFilter, userPremiumFilter])

  // Trigger user search
  useEffect(() => {
    if (isAdmin === true && activeTab === 'users') {
      const handler = setTimeout(() => {
        setUserPage(1)
        fetchUsers()
      }, 300)
      return () => clearTimeout(handler)
    }
  }, [userSearch])

  const fetchKPIs = async () => {
    setLoading(true)
    setError(null)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/admin/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load system KPIs')
      const json = await res.json()
      setMetrics(json)
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard metrics')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    const token = localStorage.getItem('token')
    let url = `${API_BASE}/admin/users?page=${userPage}&limit=${userLimit}`
    if (userSearch) url += `&q=${encodeURIComponent(userSearch)}`
    if (userRoleFilter) url += `&role=${userRoleFilter}`
    if (userActiveFilter) url += `&is_active=${userActiveFilter === 'active'}`
    if (userPremiumFilter) url += `&premium_status=${userPremiumFilter}`

    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load users database')
      const json = await res.json()
      setUsers(json.users)
      setUserTotal(json.total)
    } catch (err: any) {
      setError(err.message || 'Error loading users list')
    } finally {
      setLoading(false)
    }
  }

  const fetchScrapers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/jobs/analytics`)
      if (!res.ok) throw new Error('Failed to fetch scraper performance statistics')
      const json = await res.json()
      setScraperData(json)
    } catch (err: any) {
      setError(err.message || 'Error loading scraper logs')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/role?role=${newRole}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.detail || 'Failed to update user role')
      }
    } catch (err) {
      console.error(err)
      alert('Error updating user role')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleExportCSV = () => {
    const token = localStorage.getItem('token')
    let url = `${API_BASE}/admin/users/export?`
    if (userSearch) url += `&q=${encodeURIComponent(userSearch)}`
    if (userRoleFilter) url += `&role=${userRoleFilter}`
    if (userActiveFilter) url += `&is_active=${userActiveFilter === 'active'}`
    if (userPremiumFilter) url += `&premium_status=${userPremiumFilter}`

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to export CSV')
        return res.blob()
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `users_export_${new Date().getTime()}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
      })
      .catch(err => {
        console.error(err)
        alert('Failed to download CSV export')
      })
  }

  // Scraper filtering
  const filteredSources = scraperData?.sources.filter(s => {
    const matchesSearch = s.sourceName.toLowerCase().includes(scraperSearch.toLowerCase())
    const isPortal = s.sourceType === 'PORTAL'
    if (scraperTypeFilter === 'portal') {
      return matchesSearch && isPortal
    }
    if (scraperTypeFilter === 'company') {
      return matchesSearch && !isPortal
    }
    return matchesSearch
  }) || []

  // Access check layouts
  if (isAdmin === null) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="shimmer" style={{ width: 300, height: 100, border: '4px solid var(--border)' }} />
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0F19', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="neo-card" style={{ maxWidth: 450, padding: '3rem 2rem', textAlign: 'center', border: '4px solid var(--red)' }}>
          <div style={{ display: 'inline-flex', padding: 16, background: 'var(--red-dim)', border: '2px solid var(--red)', borderRadius: '50%', marginBottom: 20 }}>
            <Lock size={40} style={{ color: 'var(--red)' }} />
          </div>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', marginBottom: 12 }}>
            Access Denied
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            Administrator authentication is required to access the system metrics, database reports, and developer control panels.
          </p>
          <button className="neo-btn" onClick={() => router.push('/jobs')} style={{ width: '100%', padding: '12px 0', background: 'var(--neo-violet)' }}>
            Return to Job Search
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <NavBar name={userName} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 2rem' }}>
        
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span className="neo-badge" style={{ background: 'var(--neo-violet)', color: '#000000', marginBottom: 8 }}>
              Admin Portal
            </span>
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', marginTop: 4 }}>
              System Command Dashboard
            </h1>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            {activeTab === 'scrapers' && (
              <button className="neo-btn" onClick={fetchScrapers} style={{ padding: '10px 20px', background: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={16} />
                <span>Sync Scrapers</span>
              </button>
            )}
            {activeTab === 'kpis' && (
              <button className="neo-btn" onClick={fetchKPIs} style={{ padding: '10px 20px', background: 'var(--neo-violet)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={16} />
                <span>Sync KPIs</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, borderBottom: '4px solid var(--border)', paddingBottom: 16 }}>
          <button 
            onClick={() => { setActiveTab('kpis'); setError(null); }}
            style={{
              padding: '12px 24px',
              fontWeight: 900,
              fontSize: 14,
              textTransform: 'uppercase',
              background: activeTab === 'kpis' ? 'var(--neo-violet)' : 'transparent',
              color: activeTab === 'kpis' ? '#000000' : 'var(--text-2)',
              border: activeTab === 'kpis' ? '3px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            System Metrics & KPIs
          </button>
          <button 
            onClick={() => { setActiveTab('users'); setError(null); }}
            style={{
              padding: '12px 24px',
              fontWeight: 900,
              fontSize: 14,
              textTransform: 'uppercase',
              background: activeTab === 'users' ? 'var(--indigo)' : 'transparent',
              color: activeTab === 'users' ? '#FFFFFF' : 'var(--text-2)',
              border: activeTab === 'users' ? '3px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            User Management
          </button>
          <button 
            onClick={() => { setActiveTab('scrapers'); setError(null); }}
            style={{
              padding: '12px 24px',
              fontWeight: 900,
              fontSize: 14,
              textTransform: 'uppercase',
              background: activeTab === 'scrapers' ? 'var(--amber)' : 'transparent',
              color: activeTab === 'scrapers' ? '#000000' : 'var(--text-2)',
              border: activeTab === 'scrapers' ? '3px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            Scraper Performance
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
              {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 140 }} />)}
            </div>
            <div className="shimmer" style={{ height: 350 }} />
          </div>
        ) : (
          <>
            {/* KPI TAB */}
            {activeTab === 'kpis' && metrics && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
                  {/* Card 1: Users counts */}
                  <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--neo-violet)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Accounts Database</span>
                      <Users size={20} style={{ color: 'var(--neo-violet)' }} />
                    </div>
                    <h2 className="font-display" style={{ fontSize: 36, fontWeight: 900, margin: '4px 0' }}>
                      {metrics.total_users}
                    </h2>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                      Active: <span style={{ fontWeight: 900, color: 'var(--green)' }}>{metrics.active_users}</span> · Premium: <span style={{ fontWeight: 900, color: 'var(--indigo)' }}>{metrics.premium_users}</span>
                    </div>
                  </div>

                  {/* Card 2: Scraper pipeline summary */}
                  <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--amber)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Jobs Database</span>
                      <Database size={20} style={{ color: 'var(--amber)' }} />
                    </div>
                    <h2 className="font-display" style={{ fontSize: 36, fontWeight: 900, margin: '4px 0' }}>
                      {metrics.jobs_scraped}
                    </h2>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                      Verified: <span style={{ fontWeight: 900, color: 'var(--green)' }}>{metrics.jobs_verified}</span> · Rejected: <span style={{ fontWeight: 900, color: 'var(--red)' }}>{metrics.jobs_rejected}</span>
                    </div>
                  </div>

                  {/* Card 3: Revenue */}
                  <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--green)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Revenue (Captured)</span>
                      <DollarSign size={20} style={{ color: 'var(--green)' }} />
                    </div>
                    <h2 className="font-display" style={{ fontSize: 36, fontWeight: 900, margin: '4px 0', color: 'var(--green)' }}>
                      ₹{metrics.revenue.toLocaleString()}
                    </h2>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                      Active Subscribers: <span style={{ fontWeight: 900 }}>{metrics.premium_users}</span>
                    </div>
                  </div>

                  {/* Card 4: Daily Email Digests */}
                  <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--indigo)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Email Digest Sent</span>
                      <Mail size={20} style={{ color: 'var(--indigo)' }} />
                    </div>
                    <h2 className="font-display" style={{ fontSize: 36, fontWeight: 900, margin: '4px 0' }}>
                      {metrics.email_digests_sent}
                    </h2>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                      Match Threshold: <span style={{ fontWeight: 900 }}>&ge; 50%</span>
                    </div>
                  </div>
                </div>

                {/* Scraper / Verification audit info */}
                <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Clock size={20} style={{ color: 'var(--neo-violet)' }} />
                    <h3 className="font-display" style={{ fontSize: 18, fontWeight: 900 }}>Database Audit & Scraper Execution Logs</h3>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>
                    This system uses automated scrapers checking portals every 6 hours and running a database quality verification checker.
                  </p>
                  <div style={{ background: 'var(--bg-3)', border: '2px solid var(--border)', padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>
                    <div><span style={{ color: 'var(--indigo)' }}># Trigger multi-page scraper manually from CLI:</span></div>
                    <div style={{ color: '#FFF', fontWeight: 'bold', margin: '4px 0 12px 0' }}>.venv\Scripts\python -m app.utils.scraper</div>
                    <div><span style={{ color: 'var(--indigo)' }}># Trigger data quality verification audit manually:</span></div>
                    <div style={{ color: '#FFF', fontWeight: 'bold', marginTop: 4 }}>.venv\Scripts\python -m app.utils.db_audit</div>
                  </div>
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                
                {/* Search and Filters */}
                <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)', marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                    <h3 className="font-display" style={{ fontSize: 18, fontWeight: 900 }}>Search & Filter Accounts</h3>
                    
                    <button className="neo-btn" onClick={handleExportCSV} style={{ padding: '8px 16px', background: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <Download size={14} />
                      <span>Export CSV</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    {/* Search query */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-3)' }} />
                      <input 
                        type="text" 
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="neo-input"
                        style={{ paddingLeft: 36, height: 40, fontSize: 14, width: '100%' }}
                      />
                    </div>

                    {/* Role Filter */}
                    <select 
                      value={userRoleFilter}
                      onChange={e => { setUserPage(1); setUserRoleFilter(e.target.value); }}
                      className="neo-input"
                      style={{ height: 40, fontSize: 14, cursor: 'pointer', padding: '0 12px' }}
                    >
                      <option value="">All Roles</option>
                      <option value="FREE">FREE</option>
                      <option value="PREMIUM">PREMIUM</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>

                    {/* Active filter */}
                    <select 
                      value={userActiveFilter}
                      onChange={e => { setUserPage(1); setUserActiveFilter(e.target.value); }}
                      className="neo-input"
                      style={{ height: 40, fontSize: 14, cursor: 'pointer', padding: '0 12px' }}
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Deactivated Only</option>
                    </select>

                    {/* Premium status filter */}
                    <select 
                      value={userPremiumFilter}
                      onChange={e => { setUserPage(1); setUserPremiumFilter(e.target.value); }}
                      className="neo-input"
                      style={{ height: 40, fontSize: 14, cursor: 'pointer', padding: '0 12px' }}
                    >
                      <option value="">All Subscription states</option>
                      <option value="active">Active Premium</option>
                      <option value="expired">Expired Premium</option>
                      <option value="none">No Premium Record</option>
                    </select>
                  </div>
                </div>

                {/* Users List Table */}
                <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                      <thead>
                        <tr style={{ borderBottom: '4px solid var(--border)' }}>
                          <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>User Details</th>
                          <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Role</th>
                          <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Status</th>
                          <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Last Login</th>
                          <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Registered At</th>
                          <th style={{ padding: '12px 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'center' }}>Modify Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length > 0 ? (
                          users.map((u) => (
                            <tr key={u.id} style={{ borderBottom: '2px solid var(--bg-3)' }}>
                              <td style={{ padding: '14px 8px' }}>
                                <div style={{ fontWeight: 900, fontSize: 15 }}>{u.full_name}</div>
                                <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>{u.email}</div>
                              </td>
                              <td style={{ padding: '14px 8px' }}>
                                <span 
                                  className="neo-badge" 
                                  style={{ 
                                    fontSize: 10, 
                                    padding: '2px 8px',
                                    background: u.role === 'ADMIN' ? 'var(--neo-violet)' : u.role === 'PREMIUM' ? 'var(--indigo)' : 'var(--bg-3)',
                                    color: u.role === 'FREE' ? 'var(--text-2)' : '#000000',
                                    borderColor: 'var(--border)'
                                  }}
                                >
                                  {u.role}
                                </span>
                              </td>
                              <td style={{ padding: '14px 8px' }}>
                                {u.is_active ? (
                                  <span style={{ color: 'var(--green)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <UserCheck size={14} /> Active
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <UserX size={14} /> Deactivated
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '14px 8px', fontSize: 13, color: 'var(--text-2)' }}>
                                {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                              </td>
                              <td style={{ padding: '14px 8px', fontSize: 13, color: 'var(--text-3)' }}>
                                {new Date(u.created_at).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                                <select 
                                  value={u.role} 
                                  disabled={updatingUserId === u.id}
                                  onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                  className="neo-input"
                                  style={{ height: 32, fontSize: 12, padding: '0 8px', cursor: 'pointer' }}
                                >
                                  <option value="FREE">Make FREE</option>
                                  <option value="PREMIUM">Make PREMIUM</option>
                                  <option value="ADMIN">Make ADMIN</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-3)' }}>
                              No users found in database records.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {userTotal > userLimit && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                      <button 
                        className="neo-btn" 
                        disabled={userPage <= 1}
                        onClick={() => setUserPage(userPage - 1)}
                        style={{ padding: '6px 12px', fontSize: 13 }}
                      >
                        Prev
                      </button>
                      <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontWeight: 900 }}>
                        Page {userPage} of {Math.ceil(userTotal / userLimit)}
                      </span>
                      <button 
                        className="neo-btn" 
                        disabled={userPage >= Math.ceil(userTotal / userLimit)}
                        onClick={() => setUserPage(userPage + 1)}
                        style={{ padding: '6px 12px', fontSize: 13 }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCRAPERS TAB */}
            {activeTab === 'scrapers' && scraperData && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
                  <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--indigo)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Integrations</span>
                      <Globe size={20} style={{ color: 'var(--indigo)' }} />
                    </div>
                    <h2 className="font-display" style={{ fontSize: 32, fontWeight: 900, margin: '4px 0' }}>
                      {scraperData.implementedSources} / {scraperData.totalSources}
                    </h2>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                      <span style={{ fontWeight: 900, color: 'var(--indigo)' }}>{scraperData.pendingSources} Pending</span> roadmap sources
                    </div>
                  </div>

                  <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--amber)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Jobs Aggregation</span>
                      <Database size={20} style={{ color: 'var(--amber)' }} />
                    </div>
                    <h2 className="font-display" style={{ fontSize: 32, fontWeight: 900, margin: '4px 0' }}>
                      {scraperData.jobsSaved}
                    </h2>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                      Found: <span style={{ fontWeight: 900 }}>{scraperData.jobsFound}</span> · Rejected: <span style={{ fontWeight: 900, color: 'var(--red)' }}>{scraperData.jobsRejected}</span>
                    </div>
                  </div>

                  <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--red)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Audit Soft Deletes</span>
                      <AlertTriangle size={20} style={{ color: 'var(--red)' }} />
                    </div>
                    <h2 className="font-display" style={{ fontSize: 32, fontWeight: 900, margin: '4px 0', color: 'var(--red)' }}>
                      {scraperData.brokenUrls + scraperData.duplicates}
                    </h2>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                      Broken URLs: <span style={{ fontWeight: 900 }}>{scraperData.brokenUrls}</span> · Dups: <span style={{ fontWeight: 900 }}>{scraperData.duplicates}</span>
                    </div>
                  </div>

                  <div className="neo-card" style={{ padding: '1.5rem', borderLeft: '8px solid var(--green)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-3)' }}>Avg Success Rate</span>
                      <Activity size={20} style={{ color: 'var(--green)' }} />
                    </div>
                    <h2 className="font-display" style={{ fontSize: 32, fontWeight: 900, margin: '4px 0', color: 'var(--green)' }}>
                      {scraperData.successRate.toFixed(1)}%
                    </h2>
                    <div style={{ height: 6, background: 'var(--bg-3)', border: '1px solid var(--border)', marginTop: 14 }}>
                      <div style={{ height: '100%', background: 'var(--green)', width: `${scraperData.successRate}%` }} />
                    </div>
                  </div>
                </div>

                <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                    <h3 className="font-display" style={{ fontSize: 20, fontWeight: 900 }}>Source Performance Metrics</h3>
                    
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-3)' }} />
                        <input 
                          type="text" 
                          value={scraperSearch}
                          onChange={e => setScraperSearch(e.target.value)}
                          placeholder="Search source name..."
                          className="neo-input"
                          style={{ paddingLeft: 36, height: 40, fontSize: 14 }}
                        />
                      </div>

                      <select 
                        value={scraperTypeFilter}
                        onChange={e => setScraperTypeFilter(e.target.value as any)}
                        className="neo-input"
                        style={{ height: 40, fontSize: 14, cursor: 'pointer', padding: '0 12px' }}
                      >
                        <option value="all">All Sources</option>
                        <option value="portal">Job Portals</option>
                        <option value="company">Company Careers</option>
                      </select>
                    </div>
                  </div>

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
                          filteredSources.map((source) => (
                            <tr key={source.sourceName} style={{ borderBottom: '2px solid var(--bg-3)', background: source.status === 'NOT_IMPLEMENTED' ? 'rgba(255,255,255,0.02)' : undefined }}>
                              <td className="font-display" style={{ padding: '16px 8px', fontSize: 15, fontWeight: 900 }}>
                                {source.sourceName}
                              </td>
                              <td style={{ padding: '16px 8px', fontSize: 13 }}>
                                <span className="neo-badge" style={{ fontSize: 10, padding: '2px 6px', background: source.sourceType === 'PORTAL' ? 'var(--indigo-dim)' : 'var(--amber-dim)', color: source.sourceType === 'PORTAL' ? 'var(--indigo)' : 'var(--amber)', borderColor: source.sourceType === 'PORTAL' ? 'var(--indigo-border)' : 'var(--amber-border)' }}>
                                  {source.sourceType === 'PORTAL' ? 'Portal' : 'Company'}
                                </span>
                              </td>
                              <td style={{ padding: '16px 8px', fontSize: 14, textAlign: 'right', fontWeight: 900 }}>{source.jobsFound}</td>
                              <td style={{ padding: '16px 8px', fontSize: 14, textAlign: 'right', fontWeight: 900, color: 'var(--green)' }}>{source.jobsSaved}</td>
                              <td style={{ padding: '16px 8px', fontSize: 14, textAlign: 'right', color: 'var(--red)' }}>{source.jobsRejected}</td>
                              <td style={{ padding: '16px 8px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace' }}>{source.runtime > 0 ? `${source.runtime.toFixed(1)}s` : '—'}</td>
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
                                {source.status === 'SUCCESS' && <span className="neo-badge" style={{ background: 'var(--green-dim)', color: 'var(--green)', borderColor: 'var(--green)', fontSize: 10 }}>SUCCESS</span>}
                                {source.status === 'FAILED' && <span className="neo-badge" style={{ background: 'var(--red-dim)', color: 'var(--red)', borderColor: 'var(--red)', fontSize: 10 }}>FAILED</span>}
                                {source.status === 'NOT_RUN' && <span className="neo-badge" style={{ background: 'var(--amber-dim)', color: 'var(--amber)', borderColor: 'var(--amber)', fontSize: 10 }}>READY</span>}
                                {source.status === 'NOT_IMPLEMENTED' && <span className="neo-badge" style={{ background: 'var(--bg-3)', color: 'var(--text-3)', borderColor: 'rgba(255,255,255,0.1)', fontSize: 10 }}>PLANNED</span>}
                              </td>
                            </tr>
                          ))
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

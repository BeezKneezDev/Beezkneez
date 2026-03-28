import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const TARGETS = {
  week: {
    google_reviews: 5,
    flyers_dropped: 100,
    quote_requests: 2,
  },
  month: {
    google_reviews: 8,
    flyers_dropped: 500,
    regular_clients: 4,
    revenue: 2250,
  },
  quarter: {
    google_reviews: 15,
    regular_clients: 10,
    revenue: 4000, // per month avg
  },
  year: {
    google_reviews: 35,
    regular_clients: 25,
    revenue: 70000,
  },
}

const METRIC_CONFIG = {
  google_reviews: { label: 'Google Reviews', icon: 'fa-solid fa-star', manual: false },
  flyers_dropped: { label: 'Flyers Dropped', icon: 'fa-solid fa-paper-plane', manual: true },
  quote_requests: { label: 'Quote Requests', icon: 'fa-solid fa-file-invoice', manual: false },
  regular_clients: { label: 'Regular Clients', icon: 'fa-solid fa-users', manual: false },
  revenue: { label: 'Revenue', icon: 'fa-solid fa-dollar-sign', manual: false },
  jobs_completed: { label: 'Jobs Completed', icon: 'fa-solid fa-check-circle', manual: false },
}

const TIMEFRAMES = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'year', label: 'This Year' },
]

function getTimeframeRange(tf) {
  const now = new Date()
  let start
  if (tf === 'week') {
    start = new Date(now)
    const day = start.getDay()
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1)) // Monday start
    start.setHours(0, 0, 0, 0)
  } else if (tf === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (tf === 'quarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3
    start = new Date(now.getFullYear(), qMonth, 1)
  } else {
    start = new Date(now.getFullYear(), 0, 1)
  }
  return { start, end: now }
}

function formatCurrency(n) {
  return `$${Number(n || 0).toLocaleString('en-NZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

export default function KPI() {
  const [timeframe, setTimeframe] = useState('month')
  const [autoData, setAutoData] = useState({})
  const [manualData, setManualData] = useState({ flyers_dropped: 0 })
  const [flyerInput, setFlyerInput] = useState('')
  const [flyerDate, setFlyerDate] = useState(new Date().toISOString().split('T')[0])
  const [flyerNotes, setFlyerNotes] = useState('')
  const [recentFlyers, setRecentFlyers] = useState([])
  const [saving, setSaving] = useState(false)
  const [chartData, setChartData] = useState({ revenue: [], clients: [], jobs: [] })

  // Fetch auto-tracked data
  useEffect(() => {
    async function fetchAuto() {
      const { start } = getTimeframeRange(timeframe)
      const startISO = start.toISOString()
      const startDate = startISO.split('T')[0]

      // Revenue (paid invoices in timeframe)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, discount_percent, paid_at')
        .eq('status', 'paid')
        .gte('paid_at', startISO)

      const revenue = (invoices || []).reduce((sum, inv) => {
        const amt = Number(inv.amount || 0)
        const disc = Number(inv.discount_percent || 0)
        return sum + amt * (1 - disc / 100)
      }, 0)

      // For quarter target (avg per month), calculate monthly average
      let revenueDisplay = revenue
      if (timeframe === 'quarter') {
        const months = Math.max(1, (new Date().getMonth() - start.getMonth() + 1))
        revenueDisplay = Math.round(revenue / months)
      }

      // Regular clients (customers with recurring jobs)
      const { data: jobs } = await supabase
        .from('jobs')
        .select('customer_id, frequency')
        .neq('frequency', 'one_off')
      const regularClientIds = new Set((jobs || []).map(j => j.customer_id).filter(Boolean))

      // Quote requests in timeframe
      const { count: quoteCount } = await supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startISO)

      // Jobs completed in timeframe (filter completions JSONB by date)
      const { data: allJobs } = await supabase
        .from('jobs')
        .select('completions')
      let jobsCompleted = 0
      for (const job of (allJobs || [])) {
        const comps = job.completions || []
        for (const c of comps) {
          const compDate = c.date || c.completed_at
          if (compDate && compDate >= startDate) jobsCompleted++
        }
      }

      // Google reviews count from reviews.json
      let googleReviews = 0
      try {
        const res = await fetch('/reviews.json')
        if (res.ok) {
          const json = await res.json()
          googleReviews = json.totalRatings || json.reviews?.length || 0
        }
      } catch {}

      setAutoData({
        google_reviews: googleReviews,
        revenue: revenueDisplay,
        regular_clients: regularClientIds.size,
        quote_requests: quoteCount || 0,
        jobs_completed: jobsCompleted,
      })
    }
    fetchAuto()
  }, [timeframe])

  // Fetch manual data
  useEffect(() => {
    async function fetchManual() {
      const { start } = getTimeframeRange(timeframe)
      const startISO = start.toISOString()

      // Flyers dropped — sum within timeframe
      const { data: flyerRows } = await supabase
        .from('kpi_manual')
        .select('*')
        .eq('metric', 'flyers_dropped')
        .gte('created_at', startISO)
        .order('created_at', { ascending: false })

      const totalFlyers = (flyerRows || []).reduce((s, r) => s + Number(r.value || 0), 0)
      setRecentFlyers(flyerRows || [])

      setManualData({ flyers_dropped: totalFlyers })
    }
    fetchManual()
  }, [timeframe, saving])

  // Fetch chart data (last 12 months)
  useEffect(() => {
    async function fetchCharts() {
      const now = new Date()
      const months = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: d.toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }),
          start: d,
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
        })
      }

      // Revenue per month
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('amount, discount_percent, paid_at')
        .eq('status', 'paid')
        .gte('paid_at', months[0].start.toISOString())

      const revenueByMonth = {}
      for (const m of months) revenueByMonth[m.key] = 0
      for (const inv of (paidInvoices || [])) {
        if (!inv.paid_at) continue
        const d = new Date(inv.paid_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (revenueByMonth[key] !== undefined) {
          const amt = Number(inv.amount || 0)
          const disc = Number(inv.discount_percent || 0)
          revenueByMonth[key] += amt * (1 - disc / 100)
        }
      }

      // Client growth (cumulative)
      const { data: customers } = await supabase
        .from('customers')
        .select('created_at')
        .order('created_at')

      let cumulative = 0
      const clientsByMonth = {}
      // Count all customers before chart range
      for (const c of (customers || [])) {
        const d = new Date(c.created_at)
        if (d < months[0].start) {
          cumulative++
        } else {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          clientsByMonth[key] = (clientsByMonth[key] || 0) + 1
        }
      }

      // Jobs completed per month
      const { data: allJobs } = await supabase.from('jobs').select('completions')
      const jobsByMonth = {}
      for (const m of months) jobsByMonth[m.key] = 0
      for (const job of (allJobs || [])) {
        for (const c of (job.completions || [])) {
          const compDate = c.date || c.completed_at
          if (!compDate) continue
          const d = new Date(compDate)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (jobsByMonth[key] !== undefined) jobsByMonth[key]++
        }
      }

      const revenueChart = months.map(m => ({
        name: m.label,
        revenue: Math.round(revenueByMonth[m.key] || 0),
      }))

      const clientChart = months.map(m => {
        cumulative += (clientsByMonth[m.key] || 0)
        return { name: m.label, clients: cumulative }
      })

      const jobChart = months.map(m => ({
        name: m.label,
        jobs: jobsByMonth[m.key] || 0,
      }))

      setChartData({ revenue: revenueChart, clients: clientChart, jobs: jobChart })
    }
    fetchCharts()
  }, [])

  // Build KPI cards for current timeframe
  const targets = TARGETS[timeframe] || {}
  const cards = useMemo(() => {
    const list = []
    for (const [metric, target] of Object.entries(targets)) {
      const config = METRIC_CONFIG[metric]
      if (!config) continue
      const current = config.manual ? manualData[metric] : autoData[metric]
      list.push({ metric, target, current: current || 0, ...config })
    }
    // Always show jobs_completed if we have data
    if (!targets.jobs_completed && autoData.jobs_completed) {
      const config = METRIC_CONFIG.jobs_completed
      list.push({ metric: 'jobs_completed', target: null, current: autoData.jobs_completed, ...config })
    }
    return list
  }, [timeframe, targets, autoData, manualData])

  async function saveFlyerDrop() {
    if (!flyerInput) return
    setSaving(true)
    await supabase.from('kpi_manual').insert({
      metric: 'flyers_dropped',
      value: Number(flyerInput),
      notes: flyerNotes || null,
      drop_date: flyerDate || null,
    })
    setFlyerInput('')
    setFlyerDate(new Date().toISOString().split('T')[0])
    setFlyerNotes('')
    setSaving(false)
  }

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; KPIs
      </div>

      <div className="dash-header">
        <h1>KPI Tracker</h1>
      </div>

      {/* Timeframe Tabs */}
      <div className="kpi-tabs">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.key}
            className={`kpi-tab ${timeframe === tf.key ? 'active' : ''}`}
            onClick={() => setTimeframe(tf.key)}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Progress Cards */}
      <div className="kpi-progress-grid">
        {cards.map(card => {
          const pct = card.target ? Math.min(100, Math.round((card.current / card.target) * 100)) : null
          const isOver = card.target && card.current > card.target
          const isCurrency = card.metric === 'revenue'
          return (
            <div className="kpi-progress-card" key={card.metric}>
              <div className="kpi-card-header">
                <div className="kpi-card-title">
                  <i className={card.icon}></i>
                  {card.label}
                </div>
                <span className={`kpi-card-badge ${card.manual ? 'kpi-card-badge--manual' : 'kpi-card-badge--auto'}`}>
                  {card.manual ? 'Manual' : 'Auto'}
                </span>
              </div>
              <div className="kpi-card-values">
                <span className="kpi-card-current">
                  {isCurrency ? formatCurrency(card.current) : card.current}
                </span>
                {card.target && (
                  <span className="kpi-card-target">
                    / {isCurrency ? formatCurrency(card.target) : card.target}
                    {timeframe === 'quarter' && isCurrency ? '/mo avg' : ''}
                  </span>
                )}
              </div>
              {card.target && (
                <div className="kpi-progress-bar">
                  <div
                    className={`kpi-progress-fill ${isOver ? 'kpi-progress-fill--over' : ''}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="kpi-charts">
        <div className="kpi-chart-card">
          <h3>Revenue (Last 12 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData.revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => [`$${v}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#2e7d32" fill="#e8f5e9" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="kpi-chart-card">
          <h3>Client Growth</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData.clients}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [v, 'Clients']} />
              <Line type="monotone" dataKey="clients" stroke="#1565c0" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="kpi-chart-card">
          <h3>Jobs Completed (Monthly)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.jobs}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={v => [v, 'Jobs']} />
              <Bar dataKey="jobs" fill="#2e7d32" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="kpi-chart-card">
          <h3>Google Reviews & Flyers</h3>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', padding: '16px 0' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: 6 }}>Google Reviews</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>{autoData.google_reviews}</span>
                {TARGETS.year.google_reviews && (
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>/ {TARGETS.year.google_reviews} yr target</span>
                )}
              </div>
              <div className="kpi-progress-bar">
                <div
                  className="kpi-progress-fill"
                  style={{ width: `${Math.min(100, Math.round((autoData.google_reviews / TARGETS.year.google_reviews) * 100))}%` }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: 6 }}>Flyers Dropped (period)</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>{manualData.flyers_dropped}</span>
                {targets.flyers_dropped && (
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>/ {targets.flyers_dropped} target</span>
                )}
              </div>
              {targets.flyers_dropped && (
                <div className="kpi-progress-bar">
                  <div
                    className="kpi-progress-fill"
                    style={{ width: `${Math.min(100, Math.round((manualData.flyers_dropped / targets.flyers_dropped) * 100))}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Input Section */}
      <div className="kpi-manual-section">
        <div className="kpi-manual-card">
          <h3>Log Flyer Drop</h3>
          <div className="kpi-manual-form">
            <div className="dash-form-group">
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                value={flyerInput}
                onChange={e => setFlyerInput(e.target.value)}
                placeholder="50"
              />
            </div>
            <div className="dash-form-group">
              <label>Date</label>
              <input
                type="date"
                value={flyerDate}
                onChange={e => setFlyerDate(e.target.value)}
              />
            </div>
            <div className="dash-form-group kpi-notes-field">
              <label>Notes (optional)</label>
              <input
                type="text"
                value={flyerNotes}
                onChange={e => setFlyerNotes(e.target.value)}
                placeholder="e.g. Ngongotaha area"
              />
            </div>
            <button className="dash-action-btn" onClick={saveFlyerDrop} disabled={saving}>
              {saving ? 'Saving...' : 'Log'}
            </button>
          </div>
          {recentFlyers.length > 0 && (
            <div className="kpi-recent-entries">
              <table>
                <thead>
                  <tr>
                    <th>Qty</th>
                    <th>Notes</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFlyers.map(r => (
                    <tr key={r.id}>
                      <td>{r.value}</td>
                      <td>{r.notes || '—'}</td>
                      <td>{formatDate(r.drop_date || r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </>
  )
}

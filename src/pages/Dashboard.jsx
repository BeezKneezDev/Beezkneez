import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function badgeClass(status) {
  const map = {
    'scheduled': 'dash-badge--scheduled',
    'completed': 'dash-badge--completed',
    'cancelled': 'dash-badge--cancelled',
    'pending': 'dash-badge--new',
    'sent': 'dash-badge--scheduled',
    'approved': 'dash-badge--completed',
    'declined': 'dash-badge--cancelled',
  }
  return `dash-badge ${map[status] || ''}`
}

function formatCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function shortAddress(addr) {
  if (!addr) return ''
  const parts = addr
    .replace(/,?\s*(Australia|New Zealand)\s*$/i, '')
    .replace(/,?\s*\d{4,5}\s*$/, '')
    .replace(/\s+(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s*$/i, '')
    .replace(/,?\s*(Bay of Plenty|Waikato|Canterbury|Otago|Hawke's Bay|Manawat[uū][-–]Whanganui|Taranaki|Southland|Northland|Gisborne|Marlborough|Nelson|West Coast|Tasman)\s*/gi, '')
    .replace(/\s+Lakes?\s+District/gi, '')
    .replace(/\s+District/gi, '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (parts.length <= 2) return parts.join(', ')
  // street, suburb + city
  return `${parts[0]}, ${parts[1]} ${parts[parts.length - 1]}`
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function Dashboard() {
  const [customers, setCustomers] = useState([])
  const [notes, setNotes] = useState([])
  const [stats, setStats] = useState({ customers: 0, jobsThisWeek: 0, pendingQuotes: 0, revenueThisMonth: 0 })
  const [upcomingJobs, setUpcomingJobs] = useState([])
  const [recentQuotes, setRecentQuotes] = useState([])
  const [pendingInvoices, setPendingInvoices] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    // Customers
    supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(5).then(({ data }) => {
      if (data) setCustomers(data)
    })
    // Notes
    supabase.from('notes').select('*, customers(id, name), jobs(id, type), quotes(id, contact_name)').order('created_at', { ascending: false }).limit(10).then(({ data }) => {
      if (data) setNotes(data)
    })
    // Stats
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    supabase.from('customers').select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth)
      .then(({ count }) => setStats(s => ({ ...s, customers: count || 0 })))

    supabase.from('jobs').select('*')
      .gte('scheduled_date', startOfWeek.toISOString().split('T')[0])
      .lte('scheduled_date', new Date(startOfWeek.getTime() + 6 * 86400000).toISOString().split('T')[0])
      .then(({ data }) => setStats(s => ({ ...s, jobsThisWeek: data?.length || 0 })))

    supabase.from('quotes').select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setStats(s => ({ ...s, pendingQuotes: count || 0 })))

    supabase.from('invoices').select('amount, status, discount_percent')
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth)
      .then(({ data }) => {
        const total = (data || []).reduce((sum, inv) => {
          const amount = Number(inv.amount || 0)
          const discount = Number(inv.discount_percent || 0)
          return sum + amount * (1 - discount / 100)
        }, 0)
        setStats(s => ({ ...s, revenueThisMonth: total }))
      })

    // Upcoming jobs
    supabase.from('jobs').select('*, customers(id, name, address), services(name)')
      .eq('status', 'scheduled')
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .order('scheduled_date')
      .limit(5)
      .then(({ data }) => { if (data) setUpcomingJobs(data) })

    // Recent quotes
    supabase.from('quotes').select('*, services(name)')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => { if (data) setRecentQuotes(data) })

    // Pending invoices (draft + sent)
    supabase.from('invoices').select('*, customers(id, name)')
      .in('status', ['draft', 'sent'])
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPendingInvoices(data) })
  }, [])

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; dashboard
      </div>

      <div className="dash-header">
        <h1>Your Dashboard</h1>
        <span>This Month</span>
      </div>

      <div className="dash-stats">
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--clients"><i className="fa-solid fa-users"></i></div>
          <div className="dash-stat-info">
            <div className="dash-stat-value">{stats.customers}</div>
            <div className="dash-stat-label">new customers</div>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--jobs"><i className="fa-solid fa-briefcase"></i></div>
          <div className="dash-stat-info">
            <div className="dash-stat-value">{stats.jobsThisWeek}</div>
            <div className="dash-stat-label">jobs this week</div>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--quotes"><i className="fa-solid fa-file-invoice"></i></div>
          <div className="dash-stat-info">
            <div className="dash-stat-value">{stats.pendingQuotes}</div>
            <div className="dash-stat-label">pending quotes</div>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--quotes"><i className="fa-solid fa-file-invoice-dollar"></i></div>
          <div className="dash-stat-info">
            <div className="dash-stat-value">{pendingInvoices.length}</div>
            <div className="dash-stat-label">pending invoices</div>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--revenue"><i className="fa-solid fa-dollar-sign"></i></div>
          <div className="dash-stat-info">
            <div className="dash-stat-value">{formatCurrency(stats.revenueThisMonth)}</div>
            <div className="dash-stat-label">revenue this month</div>
          </div>
        </div>
      </div>

      <div className="dash-section">
        <h2 className="dash-section-title">Upcoming Jobs</h2>
        {upcomingJobs.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>No upcoming jobs.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Address</th>
                <th>Service</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingJobs.map(job => (
                <tr key={job.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/jobs/${job.id}`)}>
                  <td className="dash-client-name">{job.customers?.name || '—'}</td>
                  <td>{shortAddress(job.customers?.address)}</td>
                  <td className="dash-client-name">{job.services?.name || job.type || '—'}</td>
                  <td>{formatDate(job.scheduled_date)}</td>
                  <td><span className={badgeClass(job.status)}>{job.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pendingInvoices.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">Pending Invoices</h2>
            <Link to="/dashboard/invoices" className="dash-action-btn">View All</Link>
          </div>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvoices.map(inv => (
                <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}>
                  <td style={{ fontWeight: 500 }}>{inv.invoice_number}</td>
                  <td className="dash-client-name">{inv.customers?.name || '—'}</td>
                  <td className="dash-amount">{formatCurrency(inv.amount)}</td>
                  <td>{formatDate(inv.created_at)}</td>
                  <td><span className={badgeClass(inv.status)}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Recent Quotes</h2>
          <Link to="/dashboard/quotes" className="dash-action-btn">View All</Link>
        </div>
        {recentQuotes.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>No quotes yet.</p>
        ) : (
          <div className="dash-enquiries">
            {recentQuotes.map(q => (
              <div className="dash-enquiry-card" key={q.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/quotes/${q.id}`)}>
                <div className="dash-enquiry-name">{q.contact_name}</div>
                <div className="dash-enquiry-service">{q.services?.name || q.description || '—'}</div>
                <div className="dash-enquiry-meta">
                  <span>{q.amount ? formatCurrency(q.amount) : '—'}</span>
                  <span className={badgeClass(q.status)}>{q.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dash-section">
        <h2 className="dash-section-title">Latest Notes</h2>
        {notes.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>No notes yet.</p>
        ) : (
          <div className="dash-notes-list">
            {notes.map(note => (
              <div
                key={note.id}
                className="dash-note-item dash-note-item--clickable"
                onClick={() => note.job_id
                  ? navigate(`/dashboard/jobs/${note.job_id}`)
                  : note.quote_id
                    ? navigate(`/dashboard/quotes/${note.quote_id}`)
                    : navigate(`/dashboard/customers/${note.customer_id}`)
                }
              >
                {note.job_id && note.jobs?.type && (
                  <div className="dash-note-job-title" onClick={e => { e.stopPropagation(); navigate(`/dashboard/jobs/${note.job_id}`) }}>
                    <i className="fa-solid fa-briefcase"></i> {note.jobs.type}
                  </div>
                )}
                <div className="dash-note-content">{note.content}</div>
                <div className="dash-note-meta">
                  <span className="dash-note-time">
                    {(note.customers?.name || note.quotes?.contact_name) && <strong>{note.customers?.name || note.quotes?.contact_name}</strong>}
                    {' · '}{timeAgo(note.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Customers</h2>
          <Link to="/dashboard/customers" className="dash-action-btn">View All</Link>
        </div>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td className="dash-client-name" onClick={() => navigate(`/dashboard/customers/${c.id}`)}>{c.name}</td>
                <td>{shortAddress(c.address)}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

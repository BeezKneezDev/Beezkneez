import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const stats = [
  { label: 'new customers', value: '12', icon: 'fa-solid fa-users', iconClass: 'dash-stat-icon--clients' },
  { label: 'jobs this week', value: '8', icon: 'fa-solid fa-briefcase', iconClass: 'dash-stat-icon--jobs' },
  { label: 'pending quotes', value: '3', icon: 'fa-solid fa-file-invoice', iconClass: 'dash-stat-icon--quotes' },
  { label: 'revenue this month', value: '$2,340', icon: 'fa-solid fa-dollar-sign', iconClass: 'dash-stat-icon--revenue' },
]

const upcomingJobs = [
  { client: 'Sarah Mitchell', address: '14 Banksia St, Capalaba', service: 'Lawn Mowing', date: 'Mon 10 Mar', status: 'Scheduled' },
  { client: 'James Thornton', address: '8 Wattle Dr, Cleveland', service: 'Hedge Trimming', date: 'Mon 10 Mar', status: 'Scheduled' },
  { client: 'Linda Nguyen', address: '22 Palm Ave, Thornlands', service: 'Garden Cleanup', date: 'Tue 11 Mar', status: 'In Progress' },
  { client: 'Mark Davidson', address: '5 Cedar Ct, Victoria Point', service: 'Lawn Mowing', date: 'Wed 12 Mar', status: 'Scheduled' },
  { client: 'Rachel Cooper', address: '31 Eucalyptus Rd, Redland Bay', service: 'Mulching', date: 'Thu 13 Mar', status: 'Done' },
]

const recentEnquiries = [
  { name: 'Tom Harris', service: 'Full garden makeover — front and back yard', date: '6 Mar 2026', status: 'New' },
  { name: 'Emma Wilson', service: 'Regular lawn mowing — fortnightly', date: '5 Mar 2026', status: 'Responded' },
  { name: 'Peter Chang', service: 'Tree pruning and stump removal', date: '4 Mar 2026', status: 'Quoted' },
]


function badgeClass(status) {
  const map = {
    'Scheduled': 'dash-badge--scheduled',
    'In Progress': 'dash-badge--active',
    'Done': 'dash-badge--completed',
    'New': 'dash-badge--new',
    'Responded': 'dash-badge--responded',
    'Quoted': 'dash-badge--quoted',
  }
  return `dash-badge ${map[status] || ''}`
}

function shortAddress(addr) {
  if (!addr) return ''
  return addr
    .replace(/,?\s*(Australia|New Zealand)\s*$/i, '')
    .replace(/,?\s*\d{4,5}\s*$/, '')
    .replace(/\s+(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s*$/i, '')
    .split(',')
    .slice(0, 3)
    .join(', ')
    .trim()
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
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(5).then(({ data }) => {
      if (data) setCustomers(data)
    })
    supabase.from('notes').select('*, customers(id, name), jobs(id, type)').order('created_at', { ascending: false }).limit(10).then(({ data }) => {
      if (data) setNotes(data)
    })
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
        {stats.map(stat => (
          <div className="dash-stat-card" key={stat.label}>
            <div className={`dash-stat-icon ${stat.iconClass}`}><i className={stat.icon}></i></div>
            <div className="dash-stat-info">
              <div className="dash-stat-value">{stat.value}</div>
              <div className="dash-stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-section">
        <h2 className="dash-section-title">Upcoming Jobs</h2>
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
            {upcomingJobs.map((job, i) => (
              <tr key={i}>
                <td className="dash-client-name">{job.client}</td>
                <td>{job.address}</td>
                <td>{job.service}</td>
                <td>{job.date}</td>
                <td><span className={badgeClass(job.status)}>{job.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dash-section">
        <h2 className="dash-section-title">Recent Enquiries</h2>
        <div className="dash-enquiries">
          {recentEnquiries.map((enq, i) => (
            <div className="dash-enquiry-card" key={i}>
              <div className="dash-enquiry-name">{enq.name}</div>
              <div className="dash-enquiry-service">{enq.service}</div>
              <div className="dash-enquiry-meta">
                <span>{enq.date}</span>
                <span className={badgeClass(enq.status)}>{enq.status}</span>
              </div>
            </div>
          ))}
        </div>
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
                    {note.customers?.name && <strong>{note.customers.name}</strong>}
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

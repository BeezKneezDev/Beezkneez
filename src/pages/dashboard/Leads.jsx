import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function formatCurrency(n) {
  return `$${Number(n || 0).toLocaleString('en-NZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function Leads() {
  const navigate = useNavigate()
  const [leadChannels, setLeadChannels] = useState([])
  const [customers, setCustomers] = useState([])
  const [newChannel, setNewChannel] = useState({ title: '', cost: '' })
  const [savingChannel, setSavingChannel] = useState(false)
  const [deletingChannel, setDeletingChannel] = useState(null)

  async function fetchData() {
    const [channelsRes, customersRes] = await Promise.all([
      supabase.from('lead_channels').select('*').order('title'),
      supabase.from('customers').select('id, name, lead_source, created_at').order('created_at', { ascending: false }),
    ])
    if (channelsRes.data) setLeadChannels(channelsRes.data)
    if (customersRes.data) setCustomers(customersRes.data)
  }

  useEffect(() => { fetchData() }, [])

  // Count customers per lead source
  const leadCounts = {}
  let totalWithSource = 0
  for (const c of customers) {
    if (c.lead_source) {
      leadCounts[c.lead_source] = (leadCounts[c.lead_source] || 0) + 1
      totalWithSource++
    }
  }

  // Build source list: channels + any other sources that have customers
  const allSources = new Set([
    ...leadChannels.map(ch => ch.title),
    ...Object.keys(leadCounts),
  ])

  async function addChannel() {
    if (!newChannel.title.trim()) return
    setSavingChannel(true)
    await supabase.from('lead_channels').insert({
      title: newChannel.title.trim(),
      cost: Number(newChannel.cost) || 0,
    })
    setNewChannel({ title: '', cost: '' })
    setSavingChannel(false)
    fetchData()
  }

  async function deleteChannel(id) {
    if (deletingChannel === id) {
      await supabase.from('lead_channels').delete().eq('id', id)
      setDeletingChannel(null)
      fetchData()
    } else {
      setDeletingChannel(id)
    }
  }

  // Total spend across all channels
  const totalSpend = leadChannels.reduce((s, ch) => s + Number(ch.cost || 0), 0)
  const overallCPL = totalWithSource > 0 ? totalSpend / totalWithSource : null

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; Leads
      </div>

      <div className="dash-header">
        <h1>Lead Tracking</h1>
      </div>

      {/* Summary Stats */}
      <div className="dash-stats">
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--clients">
            <i className="fa-solid fa-users" style={{ color: 'var(--green-mid)' }}></i>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{customers.length}</span>
            <span className="dash-stat-label">Total Customers</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--jobs">
            <i className="fa-solid fa-bullhorn" style={{ color: '#1565c0' }}></i>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{totalWithSource}</span>
            <span className="dash-stat-label">With Lead Source</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--quotes">
            <i className="fa-solid fa-dollar-sign" style={{ color: '#e65100' }}></i>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{formatCurrency(totalSpend)}</span>
            <span className="dash-stat-label">Total Ad Spend</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--revenue">
            <i className="fa-solid fa-chart-line" style={{ color: '#7b1fa2' }}></i>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{overallCPL !== null ? formatCurrency(overallCPL) : '—'}</span>
            <span className="dash-stat-label">Avg Cost / Lead</span>
          </div>
        </div>
      </div>

      {/* Lead Channels */}
      <div className="dash-section">
        <h2 className="dash-section-title">Lead Channels</h2>
        <div className="kpi-leads-form">
          <div className="dash-form-group kpi-leads-title-field">
            <label>Channel Name</label>
            <input
              type="text"
              value={newChannel.title}
              onChange={e => setNewChannel({ ...newChannel, title: e.target.value })}
              placeholder="e.g. Google Ads"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChannel() } }}
            />
          </div>
          <div className="dash-form-group kpi-leads-cost-field">
            <label>Cost ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newChannel.cost}
              onChange={e => setNewChannel({ ...newChannel, cost: e.target.value })}
              placeholder="0"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChannel() } }}
            />
          </div>
          <button className="dash-action-btn" onClick={addChannel} disabled={savingChannel}>
            {savingChannel ? 'Adding...' : '+ Channel'}
          </button>
        </div>
        {leadChannels.length > 0 ? (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Cost</th>
                <th>Leads</th>
                <th>Cost / Lead</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {leadChannels.map(ch => {
                const leads = leadCounts[ch.title] || 0
                const cost = Number(ch.cost || 0)
                const cpl = leads > 0 ? cost / leads : null
                return (
                  <tr key={ch.id}>
                    <td style={{ fontWeight: 500 }}>{ch.title}</td>
                    <td className="kpi-lead-cost">{formatCurrency(cost)}</td>
                    <td className={`kpi-lead-stat ${leads > 0 ? 'kpi-lead-stat--good' : 'kpi-lead-stat--neutral'}`}>{leads}</td>
                    <td className="kpi-lead-stat kpi-lead-stat--neutral">
                      {cpl !== null ? formatCurrency(cpl) : '—'}
                    </td>
                    <td>
                      <button
                        className={`dash-btn-icon dash-btn-icon--danger ${deletingChannel === ch.id ? 'confirm' : ''}`}
                        onClick={() => deleteChannel(ch.id)}
                        onBlur={() => setDeletingChannel(null)}
                        title={deletingChannel === ch.id ? 'Click again to confirm' : 'Delete'}
                      >
                        <i className={`fa-solid ${deletingChannel === ch.id ? 'fa-check' : 'fa-trash'}`}></i>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#888', fontSize: '0.85rem', fontStyle: 'italic' }}>No channels yet. Add one above.</p>
        )}
      </div>

      {/* Lead Source Breakdown */}
      <div className="dash-section">
        <h2 className="dash-section-title">Lead Source Breakdown</h2>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Customers</th>
              <th>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {[...allSources]
              .filter(s => leadCounts[s])
              .sort((a, b) => (leadCounts[b] || 0) - (leadCounts[a] || 0))
              .map(source => {
                const count = leadCounts[source] || 0
                const pct = customers.length > 0 ? Math.round((count / customers.length) * 100) : 0
                return (
                  <tr key={source}>
                    <td style={{ fontWeight: 500 }}>{source}</td>
                    <td className="kpi-lead-stat kpi-lead-stat--good">{count}</td>
                    <td>{pct}%</td>
                  </tr>
                )
              })}
            {customers.length - totalWithSource > 0 && (
              <tr>
                <td style={{ color: '#888', fontStyle: 'italic' }}>No source set</td>
                <td className="kpi-lead-stat kpi-lead-stat--neutral">{customers.length - totalWithSource}</td>
                <td>{Math.round(((customers.length - totalWithSource) / customers.length) * 100)}%</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Customers by Source */}
      <div className="dash-section">
        <h2 className="dash-section-title">Recent Customers</h2>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Lead Source</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {customers.slice(0, 20).map(c => (
              <tr key={c.id}>
                <td
                  className="dash-client-name"
                  onClick={() => navigate(`/dashboard/customers/${c.id}`)}
                >
                  {c.name}
                </td>
                <td>{c.lead_source || '—'}</td>
                <td>{new Date(c.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

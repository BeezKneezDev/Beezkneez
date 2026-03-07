import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AddressAutocomplete from '../../components/AddressAutocomplete'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTimestamp(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`
}

function jobBadgeClass(status) {
  const map = {
    scheduled: 'dash-badge--scheduled',
    completed: 'dash-badge--completed',
    cancelled: 'dash-badge--cancelled',
  }
  return `dash-badge ${map[status] || ''}`
}

function invoiceBadgeClass(status) {
  const map = {
    draft: 'dash-badge--new',
    sent: 'dash-badge--quoted',
    paid: 'dash-badge--completed',
    overdue: 'dash-badge--cancelled',
  }
  return `dash-badge ${map[status] || ''}`
}

const frequencyLabels = {
  one_off: 'One-off',
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [customerNotes, setCustomerNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', address: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchAll() {
      const [custRes, jobsRes, invRes, notesRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('jobs').select('*, services(name)').eq('customer_id', id).order('scheduled_date', { ascending: false }),
        supabase.from('invoices').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
        supabase.from('notes').select('*, jobs(id, type)').eq('customer_id', id).order('created_at', { ascending: false }),
      ])
      if (custRes.data) setCustomer(custRes.data)
      if (jobsRes.data) setJobs(jobsRes.data)
      if (invRes.data) setInvoices(invRes.data)
      if (notesRes.data) setCustomerNotes(notesRes.data)
      setLoading(false)
    }
    fetchAll()
  }, [id])

  async function addNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    const content = newNote.trim()
    await supabase.from('notes').insert({ customer_id: id, content })
    const { data: refreshed } = await supabase
      .from('notes')
      .select('*, jobs(id, type)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
    if (refreshed) setCustomerNotes(refreshed)
    setNewNote('')
    setAddingNote(false)
  }

  async function deleteNote() {
    await supabase.from('notes').delete().eq('id', confirmDelete)
    setCustomerNotes(customerNotes.filter(n => n.id !== confirmDelete))
    setConfirmDelete(null)
  }

  function openEdit() {
    setEditForm({
      name: customer.name || '',
      address: customer.address || '',
      email: customer.email || '',
      phone: customer.phone || '',
    })
    setShowEdit(true)
  }

  async function saveEdit(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('customers').update(editForm).eq('id', id)
    setCustomer({ ...customer, ...editForm })
    setSaving(false)
    setShowEdit(false)
  }

  if (loading) {
    return (
      <>
        <div className="dash-breadcrumb">
          <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/customers">customers</Link> &rsaquo; ...
        </div>
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: 24 }}>Loading...</p>
      </>
    )
  }

  if (!customer) {
    return (
      <>
        <div className="dash-breadcrumb">
          <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/customers">customers</Link>
        </div>
        <div className="dash-header"><h1>Customer not found</h1></div>
        <Link to="/dashboard/customers" className="dash-back-btn">
          <i className="fa-solid fa-arrow-left"></i> Back to Customers
        </Link>
      </>
    )
  }

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
  const outstanding = totalInvoiced - totalPaid
  const customerType = jobs.length >= 3 ? 'Regular' : 'One-off'

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/customers">customers</Link> &rsaquo; {customer.name}
      </div>

      <div className="dash-header">
        <div>
          <h1>{customer.name}</h1>
          <span style={{ fontSize: '0.85rem', color: '#888' }}>Since {formatDate(customer.created_at)}</span>
        </div>
        <span className={`dash-badge ${customerType === 'Regular' ? 'dash-badge--regular' : 'dash-badge--oneoff'}`}>
          {customerType}
        </span>
        <button className="dash-btn-icon" onClick={openEdit} title="Edit customer">
          <i className="fa-solid fa-pen-to-square"></i>
        </button>
      </div>

      {/* Contact Details */}
      <div className="dash-section">
        <h2 className="dash-section-title">Contact Details</h2>
        <div className="dash-contact-details">
          <div className="dash-contact-row">
            <i className="fa-solid fa-location-dot"></i>
            {customer.address ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {customer.address}
              </a>
            ) : (
              <span className="dash-contact-empty">No address</span>
            )}
          </div>
          <div className="dash-contact-row">
            <i className="fa-solid fa-envelope"></i>
            {customer.email ? (
              <a href={`mailto:${customer.email}`}>{customer.email}</a>
            ) : (
              <span className="dash-contact-empty">No email</span>
            )}
          </div>
          <div className="dash-contact-row">
            <i className="fa-solid fa-phone"></i>
            {customer.phone ? (
              <a href={`tel:${customer.phone}`}>{customer.phone}</a>
            ) : (
              <span className="dash-contact-empty">No phone</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="dash-stats">
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--jobs">
            <i className="fa-solid fa-briefcase" style={{ color: '#1565c0' }}></i>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{jobs.length}</span>
            <span className="dash-stat-label">Total Jobs</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--quotes">
            <i className="fa-solid fa-file-invoice-dollar" style={{ color: '#e65100' }}></i>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{formatCurrency(totalInvoiced)}</span>
            <span className="dash-stat-label">Total Invoiced</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--clients">
            <i className="fa-solid fa-circle-check" style={{ color: 'var(--green-mid)' }}></i>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{formatCurrency(totalPaid)}</span>
            <span className="dash-stat-label">Total Paid</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon--revenue">
            <i className="fa-solid fa-clock" style={{ color: '#7b1fa2' }}></i>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{formatCurrency(outstanding)}</span>
            <span className="dash-stat-label">Outstanding</span>
          </div>
        </div>
      </div>

      {/* Jobs */}
      <div className="dash-section">
        <h2 className="dash-section-title">Jobs</h2>
        {jobs.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>No jobs yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Description</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Frequency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td className="dash-client-name" onClick={() => navigate(`/dashboard/jobs/${job.id}`)}>{job.services?.name || job.type}</td>
                  <td>{job.description}</td>
                  <td>{formatDate(job.scheduled_date)}</td>
                  <td className="dash-amount">{job.amount ? formatCurrency(job.amount) : '—'}</td>
                  <td>{frequencyLabels[job.frequency] || 'One-off'}</td>
                  <td><span className={jobBadgeClass(job.status)}>{job.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Notes */}
      <div className="dash-section">
        <h2 className="dash-section-title">Notes</h2>
        <div className="dash-note-add">
          <textarea
            className="dash-notes-textarea"
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            rows={2}
            placeholder="Add a note... e.g. Ask about back fence next visit"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() } }}
          />
          <button className="dash-action-btn" onClick={addNote} disabled={addingNote || !newNote.trim()}>
            {addingNote ? 'Adding...' : '+ Add Note'}
          </button>
        </div>
        {customerNotes.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.85rem', fontStyle: 'italic', margin: '12px 0 0' }}>No notes yet.</p>
        ) : (
          <div className="dash-notes-list">
            {customerNotes.map(note => (
              <div key={note.id} className="dash-note-item">
                {note.job_id && note.jobs?.type && (
                  <div className="dash-note-job-title" onClick={() => navigate(`/dashboard/jobs/${note.job_id}`)}>
                    <i className="fa-solid fa-briefcase"></i> {note.jobs.type}
                  </div>
                )}
                <div className="dash-note-content">{note.content}</div>
                <div className="dash-note-meta">
                  <span className="dash-note-time">
                    {formatTimestamp(note.created_at)}
                  </span>
                  <button
                    className={`dash-btn-icon dash-btn-icon--danger ${confirmDelete === note.id ? 'confirm' : ''}`}
                    onClick={() => confirmDelete === note.id ? deleteNote() : setConfirmDelete(note.id)}
                    onBlur={() => setConfirmDelete(null)}
                    title={confirmDelete === note.id ? 'Click again to confirm' : 'Delete note'}
                    style={{ width: 24, height: 24, fontSize: '0.7rem' }}
                  >
                    <i className={`fa-solid ${confirmDelete === note.id ? 'fa-check' : 'fa-trash'}`}></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="dash-section">
        <h2 className="dash-section-title">Invoices</h2>
        {invoices.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>No invoices yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 500 }}>{inv.invoice_number}</td>
                  <td>{inv.description}</td>
                  <td className="dash-amount">{formatCurrency(inv.amount)}</td>
                  <td>{formatDate(inv.created_at)}</td>
                  <td><span className={invoiceBadgeClass(inv.status)}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Link to="/dashboard/customers" className="dash-back-btn">
        <i className="fa-solid fa-arrow-left"></i> Back to Customers
      </Link>

      {showEdit && (
        <div className="dash-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Edit Customer</h3>
              <button className="dash-modal-close" onClick={() => setShowEdit(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="dash-form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="dash-form-group">
                <label>Address</label>
                <AddressAutocomplete
                  value={editForm.address}
                  onChange={address => setEditForm({ ...editForm, address })}
                />
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="dash-form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="dash-modal-actions">
                <button type="button" className="dash-btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="dash-action-btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

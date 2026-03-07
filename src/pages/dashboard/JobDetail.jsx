import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

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
    in_progress: 'dash-badge--in-progress',
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

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [jobNotes, setJobNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [services, setServices] = useState([])
  const [customers, setCustomers] = useState([])
  const [editForm, setEditForm] = useState({ customer_id: '', service_id: '', description: '', scheduled_date: '', amount: '', status: 'scheduled', frequency: 'one_off' })
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    async function fetchAll() {
      const [jobRes, invRes, notesRes, servicesRes, customersRes] = await Promise.all([
        supabase.from('jobs').select('*, customers(id, name), services(id, name)').eq('id', id).single(),
        supabase.from('invoices').select('*').eq('job_id', id).limit(1),
        supabase.from('notes').select('*').eq('job_id', id).order('created_at', { ascending: false }),
        supabase.from('services').select('*').order('name'),
        supabase.from('customers').select('id, name').order('name'),
      ])
      if (jobRes.data) setJob(jobRes.data)
      if (invRes.data && invRes.data.length > 0) setInvoice(invRes.data[0])
      if (notesRes.data) setJobNotes(notesRes.data)
      if (servicesRes.data) setServices(servicesRes.data)
      if (customersRes.data) setCustomers(customersRes.data)
      setLoading(false)
    }
    fetchAll()
  }, [id])

  async function addNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    await supabase.from('notes').insert({ job_id: id, customer_id: job?.customer_id || null, content: newNote.trim() })
    const { data: refreshed } = await supabase
      .from('notes')
      .select('*')
      .eq('job_id', id)
      .order('created_at', { ascending: false })
    if (refreshed) setJobNotes(refreshed)
    setNewNote('')
    setAddingNote(false)
  }

  async function deleteNote() {
    await supabase.from('notes').delete().eq('id', confirmDelete)
    setJobNotes(jobNotes.filter(n => n.id !== confirmDelete))
    setConfirmDelete(null)
  }

  function openEdit() {
    setEditForm({
      customer_id: job.customer_id || '',
      service_id: job.service_id || '',
      description: job.description || '',
      scheduled_date: job.scheduled_date || '',
      amount: job.amount || '',
      status: job.status || 'scheduled',
      frequency: job.frequency || 'one_off',
    })
    setShowEdit(true)
  }

  async function saveEdit(e) {
    e.preventDefault()
    setSaving(true)
    const selectedService = services.find(s => s.id === editForm.service_id)
    const payload = {
      customer_id: editForm.customer_id || null,
      service_id: editForm.service_id || null,
      description: editForm.description || null,
      scheduled_date: editForm.scheduled_date || null,
      amount: editForm.amount ? Number(editForm.amount) : null,
      status: editForm.status,
      frequency: editForm.frequency || 'one_off',
      type: selectedService?.name || '',
    }
    await supabase.from('jobs').update(payload).eq('id', id)
    const { data: refreshed } = await supabase.from('jobs').select('*, customers(id, name), services(id, name)').eq('id', id).single()
    if (refreshed) setJob(refreshed)
    setSaving(false)
    setShowEdit(false)
  }

  async function generateInvoiceNumber() {
    const { data } = await supabase.from('invoices').select('invoice_number').order('created_at', { ascending: false }).limit(1)
    if (data && data.length > 0) {
      const last = data[0].invoice_number
      const num = parseInt(last.replace('INV-', ''), 10) || 0
      return `INV-${String(num + 1).padStart(3, '0')}`
    }
    return 'INV-001'
  }

  async function handleCompleteAndInvoice() {
    setCompleting(true)
    // Mark job as completed
    await supabase.from('jobs').update({ status: 'completed' }).eq('id', id)
    // Generate invoice
    const invoiceNumber = await generateInvoiceNumber()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)
    const lineItems = [
      { description: job.description || serviceName, amount: job.amount || 0 },
      ...jobNotes.map(note => ({ description: note.content, amount: 0 })),
    ]
    const totalAmount = lineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0)
    const { data: newInvoice, error } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      customer_id: job.customer_id,
      job_id: id,
      amount: totalAmount,
      line_items: lineItems,
      description: job.description || serviceName,
      status: 'draft',
      due_date: dueDate.toISOString().split('T')[0],
    }).select().single()
    setCompleting(false)
    if (error) {
      console.error('Invoice insert error:', error)
      alert('Failed to create invoice: ' + error.message)
      return
    }
    if (newInvoice) {
      navigate(`/dashboard/invoices/${newInvoice.id}`)
    }
  }

  const canCompleteAndInvoice = job &&
    job.frequency === 'one_off' &&
    job.status !== 'completed' &&
    job.status !== 'cancelled' &&
    !invoice

  const serviceName = job?.services?.name || job?.type || 'Job'

  if (loading) {
    return (
      <>
        <div className="dash-breadcrumb">
          <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/jobs">jobs</Link> &rsaquo; ...
        </div>
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: 24 }}>Loading...</p>
      </>
    )
  }

  if (!job) {
    return (
      <>
        <div className="dash-breadcrumb">
          <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/jobs">jobs</Link>
        </div>
        <div className="dash-header"><h1>Job not found</h1></div>
        <Link to="/dashboard/jobs" className="dash-back-btn">
          <i className="fa-solid fa-arrow-left"></i> Back to Jobs
        </Link>
      </>
    )
  }

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/jobs">jobs</Link> &rsaquo; {serviceName}
      </div>

      <div className="dash-header">
        <div>
          <h1>{serviceName}</h1>
          {job.description && <span style={{ fontSize: '0.85rem', color: '#888' }}>{job.description}</span>}
        </div>
        <span className={jobBadgeClass(job.status)}>{job.status}</span>
        <button className="dash-btn-icon" onClick={openEdit} title="Edit job">
          <i className="fa-solid fa-pen-to-square"></i>
        </button>
        {canCompleteAndInvoice && (
          <button className="dash-action-btn" style={{ marginLeft: 'auto' }} onClick={handleCompleteAndInvoice} disabled={completing}>
            <i className="fa-solid fa-file-invoice-dollar"></i> {completing ? 'Creating...' : 'Complete & Create Invoice'}
          </button>
        )}
      </div>

      {/* Job Info */}
      <div className="dash-section">
        <h2 className="dash-section-title">Job Details</h2>
        <div className="dash-contact-details">
          <div className="dash-contact-row">
            <i className="fa-solid fa-user"></i>
            {job.customers ? (
              <Link to={`/dashboard/customers/${job.customers.id}`} style={{ color: 'var(--green-mid)', fontWeight: 500 }}>
                {job.customers.name}
              </Link>
            ) : (
              <span className="dash-contact-empty">No customer</span>
            )}
          </div>
          <div className="dash-contact-row">
            <i className="fa-solid fa-calendar"></i>
            <span>{formatDate(job.scheduled_date)}</span>
          </div>
          <div className="dash-contact-row">
            <i className="fa-solid fa-dollar-sign"></i>
            <span>{job.amount ? formatCurrency(job.amount) : '—'}</span>
          </div>
          <div className="dash-contact-row">
            <i className="fa-solid fa-repeat"></i>
            <span>{frequencyLabels[job.frequency] || 'One-off'}</span>
          </div>
        </div>
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
            placeholder="Add a note..."
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() } }}
          />
          <button className="dash-action-btn" onClick={addNote} disabled={addingNote || !newNote.trim()}>
            {addingNote ? 'Adding...' : '+ Add Note'}
          </button>
        </div>
        {jobNotes.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.85rem', fontStyle: 'italic', margin: '12px 0 0' }}>No notes yet.</p>
        ) : (
          <div className="dash-notes-list">
            {jobNotes.map(note => (
              <div key={note.id} className="dash-note-item">
                <div className="dash-note-content">{note.content}</div>
                <div className="dash-note-meta">
                  <span className="dash-note-time">{formatTimestamp(note.created_at)}</span>
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

      {/* Linked Invoice */}
      {invoice && (
        <div className="dash-section">
          <h2 className="dash-section-title">Linked Invoice</h2>
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
              <tr>
                <td style={{ fontWeight: 500 }}>{invoice.invoice_number}</td>
                <td>{invoice.description}</td>
                <td className="dash-amount">{formatCurrency(invoice.amount)}</td>
                <td>{formatDate(invoice.created_at)}</td>
                <td><span className={invoiceBadgeClass(invoice.status)}>{invoice.status}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Link to="/dashboard/jobs" className="dash-back-btn">
        <i className="fa-solid fa-arrow-left"></i> Back to Jobs
      </Link>

      {showEdit && (
        <div className="dash-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Edit Job</h3>
              <button className="dash-modal-close" onClick={() => setShowEdit(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="dash-form-group">
                <label>Customer *</label>
                <select
                  value={editForm.customer_id}
                  onChange={e => setEditForm({ ...editForm, customer_id: e.target.value })}
                  required
                >
                  <option value="">Select customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Service *</label>
                  <select
                    value={editForm.service_id}
                    onChange={e => {
                      const newServiceId = e.target.value
                      const newService = services.find(s => s.id === newServiceId)
                      const oldService = services.find(s => s.id === editForm.service_id)
                      const shouldAutoFill = !editForm.description || editForm.description === (oldService?.description || '')
                      setEditForm({
                        ...editForm,
                        service_id: newServiceId,
                        ...(shouldAutoFill && newService?.description ? { description: newService.description } : {}),
                      })
                    }}
                    required
                  >
                    <option value="">Select service...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="dash-form-group">
                  <label>Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="dash-form-group">
                <label>Frequency</label>
                <select
                  value={editForm.frequency}
                  onChange={e => setEditForm({ ...editForm, frequency: e.target.value })}
                >
                  <option value="one_off">One-off</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div className="dash-form-group">
                <label>Description</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={editForm.scheduled_date}
                    onChange={e => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                  />
                </div>
                <div className="dash-form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.amount}
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                    placeholder="0.00"
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

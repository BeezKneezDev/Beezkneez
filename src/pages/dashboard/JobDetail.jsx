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

function getNextDate(currentDate, frequency) {
  const d = new Date(currentDate)
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'fortnightly': d.setDate(d.getDate() + 14); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    default: break
  }
  return d.toISOString().split('T')[0]
}

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [linkedInvoices, setLinkedInvoices] = useState([])
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
  const [draftInvoice, setDraftInvoice] = useState(null)
  const [alreadyInvoiced, setAlreadyInvoiced] = useState(false)
  const [earlyWarning, setEarlyWarning] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      const [jobRes, notesRes, servicesRes, customersRes] = await Promise.all([
        supabase.from('jobs').select('*, customers(id, name), services(id, name)').eq('id', id).single(),
        supabase.from('notes').select('*').eq('job_id', id).order('created_at', { ascending: false }),
        supabase.from('services').select('*').order('name'),
        supabase.from('customers').select('id, name').order('name'),
      ])
      if (jobRes.data) setJob(jobRes.data)
      if (notesRes.data) setJobNotes(notesRes.data)
      if (servicesRes.data) setServices(servicesRes.data)
      if (customersRes.data) setCustomers(customersRes.data)

      // Find all linked invoices (any invoice whose line_items contain this job_id)
      if (jobRes.data?.customer_id) {
        const { data: custInvoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', jobRes.data.customer_id)
          .order('created_at', { ascending: false })
        if (custInvoices) {
          const linked = custInvoices.filter(inv =>
            (inv.line_items || []).some(li => li.job_id === id)
          )
          setLinkedInvoices(linked)

          // Check if there's an existing draft for this customer
          const draft = custInvoices.find(inv => inv.status === 'draft')
          if (draft) setDraftInvoice(draft)

          // Check if this job is already on any invoice's line_items (for one-off jobs)
          setAlreadyInvoiced(linked.length > 0)
        }
      }

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

  function handleCompleteAndInvoice() {
    // Warn if invoicing well before scheduled date
    if (isRecurring && job.scheduled_date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const scheduled = new Date(job.scheduled_date)
      scheduled.setHours(0, 0, 0, 0)
      const daysEarly = Math.round((scheduled - today) / (1000 * 60 * 60 * 24))
      if (daysEarly > 1) {
        setEarlyWarning({ date: job.scheduled_date, days: daysEarly })
        return
      }
    }
    proceedWithInvoice()
  }

  async function proceedWithInvoice() {
    setEarlyWarning(null)
    setCompleting(true)

    const newLineItems = [
      { description: job.description || serviceName, amount: job.amount || 0, job_id: id },
      ...jobNotes.map(note => ({ description: note.content, amount: 0, job_id: id })),
    ]

    let invoiceId = null

    if (draftInvoice) {
      // Append to existing draft invoice
      const existingItems = draftInvoice.line_items || []
      const mergedItems = [...existingItems, ...newLineItems]
      const totalAmount = mergedItems.reduce((sum, li) => sum + Number(li.amount || 0), 0)
      const description = mergedItems.map(li => li.description).filter(Boolean).join(', ') || null
      const { data: updated, error } = await supabase.from('invoices').update({
        line_items: mergedItems,
        amount: totalAmount,
        description,
      }).eq('id', draftInvoice.id).select().single()
      if (error) {
        console.error('Invoice update error:', error)
        alert('Failed to update invoice: ' + error.message)
        setCompleting(false)
        return
      }
      invoiceId = updated?.id
    } else {
      // Create new invoice
      const invoiceNumber = await generateInvoiceNumber()
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 7)
      const totalAmount = newLineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0)
      const { data: newInvoice, error } = await supabase.from('invoices').insert({
        invoice_number: invoiceNumber,
        customer_id: job.customer_id,
        amount: totalAmount,
        line_items: newLineItems,
        description: job.description || serviceName,
        status: 'draft',
        due_date: dueDate.toISOString().split('T')[0],
      }).select().single()
      if (error) {
        console.error('Invoice insert error:', error)
        alert('Failed to create invoice: ' + error.message)
        setCompleting(false)
        return
      }
      invoiceId = newInvoice?.id
    }

    if (isRecurring) {
      // Record completion and advance scheduled_date
      const completions = [...(job.completions || []), { completed_at: new Date().toISOString(), invoice_id: invoiceId }]
      const nextDate = getNextDate(job.scheduled_date || new Date().toISOString(), job.frequency)
      const { error: jobError } = await supabase.from('jobs').update({
        completions,
        scheduled_date: nextDate,
      }).eq('id', id)
      if (jobError) {
        console.error('Job update error:', jobError)
        alert('Invoice created but failed to advance schedule: ' + jobError.message)
      }
      // Refresh job and invoices
      const [jobRes, invoicesRes] = await Promise.all([
        supabase.from('jobs').select('*, customers(id, name), services(id, name)').eq('id', id).single(),
        supabase.from('invoices').select('*').eq('customer_id', job.customer_id).order('created_at', { ascending: false }),
      ])
      if (jobRes.data) setJob(jobRes.data)
      if (invoicesRes.data) {
        const linked = invoicesRes.data.filter(inv => (inv.line_items || []).some(li => li.job_id === id))
        setLinkedInvoices(linked)
        const draft = invoicesRes.data.find(inv => inv.status === 'draft')
        setDraftInvoice(draft || null)
      }
      setCompleting(false)
    } else {
      // One-off: mark completed and navigate to invoice
      await supabase.from('jobs').update({ status: 'completed' }).eq('id', id)
      setCompleting(false)
      if (invoiceId) navigate(`/dashboard/invoices/${invoiceId}`)
    }
  }

  const isRecurring = job && job.frequency && job.frequency !== 'one_off'
  const canCompleteAndInvoice = job && job.status !== 'cancelled' && (
    isRecurring ||
    (job.status !== 'completed' && !alreadyInvoiced)
  )

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
            <i className="fa-solid fa-file-invoice-dollar"></i> {completing ? 'Adding...' : isRecurring ? 'Invoice & Schedule Next' : draftInvoice ? 'Complete & Add to Invoice' : 'Complete & Create Invoice'}
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

      {/* Activity (recurring jobs only) */}
      {isRecurring && (job.completions || []).length > 0 && (
        <div className="dash-section">
          <h2 className="dash-section-title">Activity</h2>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Completed</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {[...(job.completions || [])].reverse().map((c, i) => {
                const linked = linkedInvoices.find(inv => inv.id === c.invoice_id)
                return (
                  <tr key={i}>
                    <td>{formatTimestamp(c.completed_at)}</td>
                    <td>
                      {linked ? (
                        <Link to={`/dashboard/invoices/${linked.id}`} style={{ color: 'var(--green-mid)', fontWeight: 500 }}>
                          {linked.invoice_number}
                        </Link>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Linked Invoices */}
      {linkedInvoices.length > 0 && (
        <div className="dash-section">
          <h2 className="dash-section-title">Linked Invoices</h2>
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
              {linkedInvoices.map(inv => (
                <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}>
                  <td style={{ fontWeight: 500 }}>{inv.invoice_number}</td>
                  <td>{inv.description}</td>
                  <td className="dash-amount">{formatCurrency(inv.amount)}</td>
                  <td>{formatDate(inv.created_at)}</td>
                  <td><span className={invoiceBadgeClass(inv.status)}>{inv.status}</span></td>
                </tr>
              ))}
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

      {earlyWarning && (
        <div className="dash-modal-overlay" onClick={() => setEarlyWarning(null)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="dash-modal-header">
              <h3>Invoice Early?</h3>
              <button className="dash-modal-close" onClick={() => setEarlyWarning(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style={{ padding: '20px 24px', lineHeight: 1.5, color: '#ccc' }}>
              <p style={{ margin: '0 0 12px' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f0ad4e', marginRight: 8 }}></i>
                This job isn't scheduled until <strong>{formatDate(earlyWarning.date)}</strong> — that's <strong>{earlyWarning.days} days</strong> away.
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#999' }}>
                Are you sure you want to invoice and advance the schedule now?
              </p>
            </div>
            <div className="dash-modal-actions" style={{ margin: '8px 24px 20px' }}>
              <button className="dash-btn-secondary" onClick={() => setEarlyWarning(null)}>Cancel</button>
              <button className="dash-action-btn" onClick={proceedWithInvoice}>Invoice Anyway</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

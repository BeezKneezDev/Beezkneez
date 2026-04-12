import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AddressAutocomplete from '../../components/AddressAutocomplete'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTimestamp(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`
}

function badgeClass(status) {
  const map = {
    pending: 'dash-badge--new',
    sent: 'dash-badge--scheduled',
    approved: 'dash-badge--completed',
    declined: 'dash-badge--cancelled',
  }
  return `dash-badge ${map[status] || ''}`
}

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const [approving, setApproving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [services, setServices] = useState([])

  async function fetchQuote() {
    const { data } = await supabase.from('quotes').select('*, services(id, name)').eq('id', id).single()
    if (data) setQuote(data)
    return data
  }

  useEffect(() => {
    async function fetchAll() {
      const [quoteRes, notesRes, servicesRes] = await Promise.all([
        supabase.from('quotes').select('*, services(id, name)').eq('id', id).single(),
        supabase.from('notes').select('*').eq('quote_id', id).order('created_at', { ascending: false }),
        supabase.from('services').select('*').order('name'),
      ])
      if (quoteRes.data) setQuote(quoteRes.data)
      if (notesRes.data) setNotes(notesRes.data)
      if (servicesRes.data) setServices(servicesRes.data)
      setLoading(false)
    }
    fetchAll()
  }, [id])

  const serviceName = quote?.services?.name || '—'
  const showActions = quote && quote.status !== 'approved' && quote.status !== 'declined'

  async function addNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    await supabase.from('notes').insert({ quote_id: id, content: newNote.trim() })
    const { data: refreshed } = await supabase
      .from('notes')
      .select('*')
      .eq('quote_id', id)
      .order('created_at', { ascending: false })
    if (refreshed) setNotes(refreshed)
    setNewNote('')
    setAddingNote(false)
  }

  async function deleteNote() {
    await supabase.from('notes').delete().eq('id', confirmDelete)
    setNotes(notes.filter(n => n.id !== confirmDelete))
    setConfirmDelete(null)
  }

  function openEmailModal() {
    const body = `Hi ${quote.contact_name || ''},

Thanks for getting in touch — nice to meet you!

Here is your quote for ${serviceName} at ${quote.contact_address || ''}:

If you're happy to go ahead, just let me know and I'll get it booked in.

Cheers,
Byron
Beezkneez Lawns & Property Care`

    setEmailForm({
      to: quote.contact_email || '',
      subject: `Quote ${quote.quote_number} — Beezkneez Lawns & Property Care`,
      body,
    })
    setShowEmailModal(true)
  }

  async function handleSendEmail(e) {
    e.preventDefault()
    setSending(true)
    try {
      const { error: fnError } = await supabase.functions.invoke('send-quote', {
        body: { to: emailForm.to, subject: emailForm.subject, body: emailForm.body, line_items: quote.line_items || [] },
      })
      if (fnError) throw new Error(fnError.message || 'Unknown error')
    } catch (err) {
      alert('Failed to send email: ' + err.message)
      setSending(false)
      return
    }
    // Mark as sent + add note
    const { data } = await supabase.from('quotes')
      .update({ status: 'sent' })
      .eq('id', id)
      .select('*, services(id, name)')
      .single()
    if (data) setQuote(data)
    await supabase.from('notes').insert({ quote_id: id, content: `Quote emailed to ${emailForm.to}`, is_system: true })
    const { data: refreshedNotes } = await supabase
      .from('notes')
      .select('*')
      .eq('quote_id', id)
      .order('created_at', { ascending: false })
    if (refreshedNotes) setNotes(refreshedNotes)
    setSending(false)
    setShowEmailModal(false)
  }

  async function handleApprove() {
    setApproving(true)
    try {
      // Find or create customer
      let customerId = null
      // Search by name first
      if (quote.contact_name) {
        const { data } = await supabase.from('customers').select('id').eq('name', quote.contact_name).limit(1).single()
        if (data) customerId = data.id
      }
      // Then by email
      if (!customerId && quote.contact_email) {
        const { data } = await supabase.from('customers').select('id').eq('email', quote.contact_email).limit(1).single()
        if (data) customerId = data.id
      }
      // Then by phone
      if (!customerId && quote.contact_phone) {
        const { data } = await supabase.from('customers').select('id').eq('phone', quote.contact_phone).limit(1).single()
        if (data) customerId = data.id
      }
      // Create new customer if no match
      if (!customerId) {
        const { data: newCustomer, error } = await supabase.from('customers').insert({
          name: quote.contact_name,
          email: quote.contact_email || null,
          phone: quote.contact_phone || null,
          address: quote.contact_address || null,
        }).select().single()
        if (error) throw new Error('Failed to create customer: ' + error.message)
        customerId = newCustomer.id
      }

      // Create job
      const { data: newJob, error: jobError } = await supabase.from('jobs').insert({
        customer_id: customerId,
        service_id: quote.service_id || null,
        type: serviceName,
        description: quote.description || null,
        amount: quote.amount || null,
        status: 'scheduled',
      }).select().single()
      if (jobError) throw new Error('Failed to create job: ' + jobError.message)

      // Copy manual notes to the new job (skip system-generated ones)
      const manualNotes = notes.filter(n => !n.is_system)
      if (manualNotes.length > 0) {
        await supabase.from('notes').insert(
          manualNotes.map(n => ({ job_id: newJob.id, customer_id: customerId, content: n.content }))
        )
      }

      // Update quote
      await supabase.from('quotes').update({
        status: 'approved',
        customer_id: customerId,
        job_id: newJob.id,
      }).eq('id', id)

      setApproving(false)
      navigate(`/dashboard/jobs/${newJob.id}`)
    } catch (err) {
      alert(err.message)
      setApproving(false)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    const { data } = await supabase.from('quotes')
      .update({ status: 'declined' })
      .eq('id', id)
      .select('*, services(id, name)')
      .single()
    if (data) setQuote(data)
    setCancelling(false)
  }

  function openEditModal() {
    const lineItems = (quote.line_items || []).length > 0
      ? quote.line_items.map(li => ({ description: li.description || '', amount: li.amount ?? '' }))
      : [{ description: quote.description || '', amount: quote.amount ?? '' }]
    setEditForm({
      contact_name: quote.contact_name || '',
      contact_email: quote.contact_email || '',
      contact_phone: quote.contact_phone || '',
      contact_address: quote.contact_address || '',
      service_id: quote.service_id || '',
      line_items: lineItems,
    })
    setShowEditModal(true)
  }

  async function handleEditSave(e) {
    e.preventDefault()
    setEditSaving(true)
    const lineItems = editForm.line_items.filter(li => li.description || li.amount)
    const total = lineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0)
    const combinedDesc = lineItems.map(li => li.description).filter(Boolean).join(', ')

    const { data } = await supabase.from('quotes')
      .update({
        contact_name: editForm.contact_name,
        contact_email: editForm.contact_email || null,
        contact_phone: editForm.contact_phone || null,
        contact_address: editForm.contact_address || null,
        service_id: editForm.service_id || null,
        line_items: lineItems.map(li => ({ description: li.description, amount: Number(li.amount || 0) })),
        description: combinedDesc || null,
        amount: total || null,
      })
      .eq('id', id)
      .select('*, services(id, name)')
      .single()
    if (data) setQuote(data)
    setEditSaving(false)
    setShowEditModal(false)
  }

  if (loading) {
    return (
      <>
        <div className="dash-breadcrumb">
          <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/quotes">quotes</Link> &rsaquo; ...
        </div>
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: 24 }}>Loading...</p>
      </>
    )
  }

  if (!quote) {
    return (
      <>
        <div className="dash-breadcrumb">
          <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/quotes">quotes</Link>
        </div>
        <div className="dash-header"><h1>Quote not found</h1></div>
        <Link to="/dashboard/quotes" className="dash-back-btn">
          <i className="fa-solid fa-arrow-left"></i> Back to Quotes
        </Link>
      </>
    )
  }

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/quotes">quotes</Link> &rsaquo; {quote.contact_name || quote.quote_number}
      </div>

      <div className="dash-header">
        <div>
          <h1>{quote.contact_name || quote.quote_number}</h1>
          <span style={{ fontSize: '0.85rem', color: '#888' }}>{quote.quote_number}</span>
        </div>
        <span className={badgeClass(quote.status)}>{quote.status}</span>
        {showActions && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="dash-action-btn" onClick={openEmailModal}>
              <i className="fa-solid fa-paper-plane"></i> Send Email
            </button>
            <button className="dash-action-btn" onClick={handleApprove} disabled={approving}>
              <i className="fa-solid fa-check"></i> {approving ? 'Approving...' : 'Approved'}
            </button>
            <button className="dash-action-btn" style={{ background: '#dc3545' }} onClick={handleCancel} disabled={cancelling}>
              <i className="fa-solid fa-xmark"></i> {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        )}
      </div>

      {/* Quote Details */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Quote Details</h2>
          {showActions && (
            <button className="dash-btn-secondary" onClick={openEditModal} style={{ fontSize: '0.85rem' }}>
              <i className="fa-solid fa-pen"></i> Edit
            </button>
          )}
        </div>
        <div className="dash-contact-details">
          <div className="dash-contact-row">
            <i className="fa-solid fa-user"></i>
            {quote.customer_id ? (
              <Link to={`/dashboard/customers/${quote.customer_id}`} style={{ color: 'var(--green-mid)', fontWeight: 500 }}>
                {quote.contact_name}
              </Link>
            ) : (
              <span>{quote.contact_name || <span className="dash-contact-empty">No contact</span>}</span>
            )}
          </div>
          {quote.contact_address && (
            <div className="dash-contact-row">
              <i className="fa-solid fa-location-dot"></i>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quote.contact_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--green-mid)' }}
              >
                {quote.contact_address}
              </a>
            </div>
          )}
          {quote.contact_email && (
            <div className="dash-contact-row">
              <i className="fa-solid fa-envelope"></i>
              <a href={`mailto:${quote.contact_email}`} style={{ color: 'var(--green-mid)' }}>{quote.contact_email}</a>
            </div>
          )}
          {quote.contact_phone && (
            <div className="dash-contact-row">
              <i className="fa-solid fa-phone"></i>
              <a href={`tel:${quote.contact_phone}`} style={{ color: 'var(--green-mid)' }}>{quote.contact_phone}</a>
            </div>
          )}
          <div className="dash-contact-row">
            <i className="fa-solid fa-briefcase"></i>
            <span>{serviceName}</span>
          </div>
          <div className="dash-contact-row">
            <i className="fa-solid fa-calendar"></i>
            <span>{formatDate(quote.created_at)}</span>
          </div>
        </div>

        {/* Line Items Table */}
        {(quote.line_items || []).length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Description</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '2px solid #e0e0e0', fontWeight: 600, width: 100 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(quote.line_items || []).map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>{item.description || '—'}</td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', padding: '10px 0', fontWeight: 700, fontSize: '1rem' }}>
              Total: {formatCurrency(quote.amount)}
            </div>
          </div>
        ) : quote.description ? (
          <div className="dash-contact-details" style={{ marginTop: 8 }}>
            <div className="dash-contact-row">
              <i className="fa-solid fa-align-left"></i>
              <span>{quote.description}</span>
            </div>
            <div className="dash-contact-row">
              <i className="fa-solid fa-dollar-sign"></i>
              <span>{quote.amount ? formatCurrency(quote.amount) : '—'}</span>
            </div>
          </div>
        ) : (
          <div className="dash-contact-details" style={{ marginTop: 8 }}>
            <div className="dash-contact-row">
              <i className="fa-solid fa-dollar-sign"></i>
              <span>{quote.amount ? formatCurrency(quote.amount) : '—'}</span>
            </div>
          </div>
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
            placeholder="Add a note..."
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() } }}
          />
          <button className="dash-action-btn" onClick={addNote} disabled={addingNote || !newNote.trim()}>
            {addingNote ? 'Adding...' : '+ Add Note'}
          </button>
        </div>
        {notes.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.85rem', fontStyle: 'italic', margin: '12px 0 0' }}>No notes yet.</p>
        ) : (
          <div className="dash-notes-list">
            {notes.map(note => (
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

      {/* Linked Job */}
      {quote.job_id && (
        <div className="dash-section">
          <h2 className="dash-section-title">Linked Job</h2>
          <div className="dash-contact-details">
            <div className="dash-contact-row">
              <i className="fa-solid fa-hammer"></i>
              <Link to={`/dashboard/jobs/${quote.job_id}`} style={{ color: 'var(--green-mid)', fontWeight: 500 }}>
                View Job
              </Link>
            </div>
          </div>
        </div>
      )}

      <Link to="/dashboard/quotes" className="dash-back-btn">
        <i className="fa-solid fa-arrow-left"></i> Back to Quotes
      </Link>

      {showEmailModal && (
        <div className="dash-modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Send Quote</h3>
              <button className="dash-modal-close" onClick={() => setShowEmailModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSendEmail}>
              <div className="dash-form-group">
                <label>To</label>
                <input
                  type="email"
                  value={emailForm.to}
                  onChange={e => setEmailForm({ ...emailForm, to: e.target.value })}
                  required
                />
              </div>
              <div className="dash-form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
                  required
                />
              </div>
              <div className="dash-form-group">
                <label>Body</label>
                <textarea
                  value={emailForm.body}
                  onChange={e => setEmailForm({ ...emailForm, body: e.target.value })}
                  rows={14}
                  required
                />
              </div>
              <div className="dash-modal-actions">
                <button type="button" className="dash-btn-secondary" onClick={() => setShowEmailModal(false)}>Cancel</button>
                <button type="submit" className="dash-action-btn" disabled={sending}>
                  <i className="fa-solid fa-paper-plane"></i> {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editForm && (
        <div className="dash-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Edit Quote</h3>
              <button className="dash-modal-close" onClick={() => setShowEditModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleEditSave}>
              <div className="dash-form-group">
                <label>Contact Name *</label>
                <input
                  type="text"
                  value={editForm.contact_name}
                  onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })}
                  required
                />
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editForm.contact_email}
                    onChange={e => setEditForm({ ...editForm, contact_email: e.target.value })}
                  />
                </div>
                <div className="dash-form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={editForm.contact_phone}
                    onChange={e => setEditForm({ ...editForm, contact_phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="dash-form-group">
                <label>Address</label>
                <AddressAutocomplete
                  value={editForm.contact_address}
                  onChange={address => setEditForm({ ...editForm, contact_address: address })}
                />
              </div>
              <div className="dash-form-group">
                <label>Service</label>
                <select
                  value={editForm.service_id}
                  onChange={e => setEditForm({ ...editForm, service_id: e.target.value })}
                >
                  <option value="">Select service...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="dash-form-group">
                <label>Line Items</label>
                {editForm.line_items.map((item, i) => (
                  <div key={i} className="dash-form-row" style={{ marginBottom: 8, alignItems: 'flex-end' }}>
                    <div className="dash-form-group" style={{ flex: 2, marginBottom: 0 }}>
                      {i === 0 && <label style={{ fontSize: '0.75rem', color: '#888' }}>Description</label>}
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => {
                          const items = [...editForm.line_items]
                          items[i] = { ...items[i], description: e.target.value }
                          setEditForm({ ...editForm, line_items: items })
                        }}
                        placeholder="Description"
                      />
                    </div>
                    <div className="dash-form-group" style={{ minWidth: 100, marginBottom: 0 }}>
                      {i === 0 && <label style={{ fontSize: '0.75rem', color: '#888' }}>Amount</label>}
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={e => {
                          const items = [...editForm.line_items]
                          items[i] = { ...items[i], amount: e.target.value }
                          setEditForm({ ...editForm, line_items: items })
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    {editForm.line_items.length > 1 && (
                      <button
                        type="button"
                        className="dash-btn-icon dash-btn-icon--danger"
                        onClick={() => {
                          const items = editForm.line_items.filter((_, idx) => idx !== i)
                          setEditForm({ ...editForm, line_items: items })
                        }}
                        style={{ width: 28, height: 28, fontSize: '0.7rem', marginBottom: 2 }}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="dash-btn-secondary"
                  onClick={() => setEditForm({ ...editForm, line_items: [...editForm.line_items, { description: '', amount: '' }] })}
                  style={{ marginTop: 4, fontSize: '0.85rem' }}
                >
                  + Add Line Item
                </button>
                <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 600, fontSize: '0.95rem' }}>
                  Total: {formatCurrency(editForm.line_items.reduce((sum, li) => sum + Number(li.amount || 0), 0))}
                </div>
              </div>
              <div className="dash-modal-actions">
                <button type="button" className="dash-btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="dash-action-btn" disabled={editSaving}>
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

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

  async function fetchQuote() {
    const { data } = await supabase.from('quotes').select('*, services(id, name)').eq('id', id).single()
    if (data) setQuote(data)
    return data
  }

  useEffect(() => {
    async function fetchAll() {
      const [quoteRes, notesRes] = await Promise.all([
        supabase.from('quotes').select('*, services(id, name)').eq('id', id).single(),
        supabase.from('notes').select('*').eq('quote_id', id).order('created_at', { ascending: false }),
      ])
      if (quoteRes.data) setQuote(quoteRes.data)
      if (notesRes.data) setNotes(notesRes.data)
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
    const amount = quote.amount ? formatCurrency(quote.amount) : ''
    const body = `Hi ${quote.contact_name || ''},

Thanks for getting in touch — nice to meet you!

Here is your quote for ${serviceName} at ${quote.contact_address || ''}:

${quote.description || ''}
Amount: ${amount}

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
        body: { to: emailForm.to, subject: emailForm.subject, body: emailForm.body },
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
        <h2 className="dash-section-title">Quote Details</h2>
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
            <i className="fa-solid fa-dollar-sign"></i>
            <span>{quote.amount ? formatCurrency(quote.amount) : '—'}</span>
          </div>
          <div className="dash-contact-row">
            <i className="fa-solid fa-calendar"></i>
            <span>{formatDate(quote.created_at)}</span>
          </div>
          {quote.description && (
            <div className="dash-contact-row">
              <i className="fa-solid fa-align-left"></i>
              <span>{quote.description}</span>
            </div>
          )}
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
    </>
  )
}

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
    draft: 'dash-badge--new',
    sent: 'dash-badge--quoted',
    paid: 'dash-badge--completed',
    overdue: 'dash-badge--cancelled',
  }
  return `dash-badge ${map[status] || ''}`
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [jobNotes, setJobNotes] = useState([])
  const [customerNotes, setCustomerNotes] = useState([])
  const [updating, setUpdating] = useState(false)

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false)
  const [customers, setCustomers] = useState([])
  const [editForm, setEditForm] = useState({ customer_id: '', line_items: [{ description: '', amount: '' }], status: 'draft', due_date: '', discount_percent: 0 })
  const [saving, setSaving] = useState(false)

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' })
  const [sending, setSending] = useState(false)

  // Inline draft editing
  const [draftItems, setDraftItems] = useState([])
  const [draftDiscount, setDraftDiscount] = useState(0)
  const [savingDraft, setSavingDraft] = useState(false)

  useEffect(() => {
    async function fetchAll() {
      const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single()

      if (!inv) { setLoading(false); return }
      setInvoice(inv)

      const promises = []

      // Fetch customer
      if (inv.customer_id) {
        promises.push(
          supabase.from('customers').select('*').eq('id', inv.customer_id).single()
            .then(({ data }) => { if (data) setCustomer(data) })
        )
        // Fetch customer notes (not linked to a job)
        promises.push(
          supabase.from('notes').select('*').eq('customer_id', inv.customer_id).is('job_id', null)
            .order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setCustomerNotes(data) })
        )
      }

      // Fetch job notes from all jobs linked via line_items
      const jobIds = [...new Set((inv.line_items || []).map(li => li.job_id).filter(Boolean))]
      if (jobIds.length > 0) {
        promises.push(
          supabase.from('notes').select('*').in('job_id', jobIds)
            .order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setJobNotes(data) })
        )
      }

      await Promise.all(promises)
      setLoading(false)
    }
    fetchAll()
  }, [id])

  // Sync draft state from invoice
  useEffect(() => {
    if (invoice) {
      setDraftItems(invoice.line_items && invoice.line_items.length > 0
        ? invoice.line_items.map(li => ({ description: li.description || '', amount: li.amount || 0 }))
        : [{ description: '', amount: 0 }])
      setDraftDiscount(invoice.discount_percent || 0)
    }
  }, [invoice])

  function addActivity(type, detail) {
    return [...(invoice.activity || []), { type, at: new Date().toISOString(), ...(detail ? { detail } : {}) }]
  }

  function openEmailModal(mode) {
    const isReceipt = mode === 'receipt'
    const defaultBody = isReceipt
      ? `Hi ${customer?.name || 'there'},\n\nThanks for your payment! Here is your receipt for your records. A PDF copy is also attached.`
      : `Hi ${customer?.name || 'there'},\n\nPlease find your invoice below. A PDF copy is also attached.`

    setEmailForm({
      to: customer?.email || '',
      subject: `${isReceipt ? 'Receipt' : 'Invoice'} ${invoice.invoice_number} — Beezkneez Lawns & Property Care`,
      body: defaultBody,
      mode,
    })
    setShowEmailModal(true)
  }

  async function handleSendEmail(e) {
    if (e) e.preventDefault()
    setSending(true)
    const isReceipt = emailForm.mode === 'receipt'

    try {
      const invoicePayload = isReceipt ? { ...invoice, status: 'paid' } : invoice
      const { error: fnError } = await supabase.functions.invoke('send-invoice', {
        body: { invoice: invoicePayload, customer, message: emailForm.body },
      })
      if (fnError) throw new Error(fnError.message || 'Unknown error')
    } catch (e) {
      alert('Failed to send email: ' + e.message)
      setSending(false)
      return
    }

    // Update invoice based on what we sent
    const now = new Date().toISOString()
    const activity = addActivity(isReceipt ? 'receipt_sent' : 'sent')

    if (isReceipt) {
      // Sending receipt — just log it, don't change status
      const { data } = await supabase.from('invoices')
        .update({ sent_at: now, activity })
        .eq('id', id).select().single()
      if (data) setInvoice(data)
    } else if (invoice.status === 'draft') {
      // First send — mark as sent
      const { data } = await supabase.from('invoices')
        .update({ status: 'sent', sent_at: now, activity })
        .eq('id', id).select().single()
      if (data) setInvoice(data)
    } else {
      // Resend — just log activity
      const { data } = await supabase.from('invoices')
        .update({ activity })
        .eq('id', id).select().single()
      if (data) setInvoice(data)
    }

    setSending(false)
    setShowEmailModal(false)
  }

  async function handleMarkPaid() {
    setUpdating(true)
    const now = new Date().toISOString()
    const activity = addActivity('paid')
    const { data } = await supabase.from('invoices')
      .update({ status: 'paid', paid_at: now, activity })
      .eq('id', id).select().single()
    if (data) setInvoice(data)
    setUpdating(false)
  }

  async function saveDraftItems() {
    setSavingDraft(true)
    const lineItems = draftItems.filter(li => li.description?.trim() || Number(li.amount))
    const subtotal = lineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0)
    const { data } = await supabase.from('invoices').update({
      line_items: lineItems,
      amount: subtotal,
      description: lineItems.map(li => li.description).filter(Boolean).join(', ') || null,
      discount_percent: Number(draftDiscount) || 0,
    }).eq('id', id).select().single()
    if (data) setInvoice(data)
    setSavingDraft(false)
  }

  function openEdit() {
    const lineItems = invoice.line_items && invoice.line_items.length > 0
      ? invoice.line_items.map(li => ({ description: li.description || '', amount: li.amount || 0 }))
      : [{ description: invoice.description || '', amount: invoice.amount || 0 }]
    setEditForm({
      customer_id: invoice.customer_id || '',
      line_items: lineItems,
      status: invoice.status || 'draft',
      due_date: invoice.due_date || '',
      discount_percent: invoice.discount_percent || 0,
    })
    // Load customers for the select dropdown
    supabase.from('customers').select('id, name').order('name').then(({ data }) => {
      if (data) setCustomers(data)
    })
    setShowEdit(true)
  }

  async function saveEdit(e) {
    e.preventDefault()
    setSaving(true)
    const lineItems = editForm.line_items.filter(li => li.description?.trim() || Number(li.amount))
    const subtotal = lineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0)
    const payload = {
      customer_id: editForm.customer_id,
      amount: subtotal,
      line_items: lineItems,
      description: lineItems.map(li => li.description).filter(Boolean).join(', ') || null,
      status: editForm.status,
      due_date: editForm.due_date || null,
      discount_percent: Number(editForm.discount_percent) || 0,
    }
    // Set sent_at when transitioning to sent
    if (editForm.status === 'sent' && invoice.status !== 'sent' && !invoice.sent_at) {
      payload.sent_at = new Date().toISOString()
    }
    // Set paid_at when transitioning to paid
    if (editForm.status === 'paid' && invoice.status !== 'paid' && !invoice.paid_at) {
      payload.paid_at = new Date().toISOString()
    }
    const { data } = await supabase.from('invoices').update(payload).eq('id', id).select().single()
    if (data) setInvoice(data)
    setSaving(false)
    setShowEdit(false)
  }

  // Draft computed values
  const draftSubtotal = draftItems.reduce((sum, li) => sum + Number(li.amount || 0), 0)
  const draftDiscountNum = Number(draftDiscount) || 0
  const draftTotal = draftSubtotal * (1 - draftDiscountNum / 100)

  if (loading) {
    return (
      <>
        <div className="dash-breadcrumb">
          <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/invoices">invoices</Link> &rsaquo; ...
        </div>
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: 24 }}>Loading...</p>
      </>
    )
  }

  if (!invoice) {
    return (
      <>
        <div className="dash-breadcrumb">
          <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/invoices">invoices</Link>
        </div>
        <div className="dash-header"><h1>Invoice not found</h1></div>
        <Link to="/dashboard/invoices" className="dash-back-btn">
          <i className="fa-solid fa-arrow-left"></i> Back to Invoices
        </Link>
      </>
    )
  }

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; <Link to="/dashboard/invoices">invoices</Link> &rsaquo; {invoice.invoice_number}
      </div>

      {/* Invoice Preview Card */}
      <div className="dash-invoice-preview">
        <div className="dash-invoice-header">
          <h1>{invoice.invoice_number}</h1>
          <span className={badgeClass(invoice.status)}>{invoice.status}</span>
          <span style={{ fontSize: '0.85rem', color: '#888', marginLeft: 'auto' }}>{formatDate(invoice.created_at)}</span>
        </div>

        {/* Customer Details */}
        {customer && (
          <div className="dash-invoice-client">
            <h3>Bill To</h3>
            <div className="dash-contact-details">
              <div className="dash-contact-row">
                <i className="fa-solid fa-user"></i>
                <Link to={`/dashboard/customers/${customer.id}`} style={{ color: 'var(--green-mid)', fontWeight: 500 }}>
                  {customer.name}
                </Link>
              </div>
              {customer.address && (
                <div className="dash-contact-row">
                  <i className="fa-solid fa-location-dot"></i>
                  <span>{customer.address}</span>
                </div>
              )}
              {customer.email && (
                <div className="dash-contact-row">
                  <i className="fa-solid fa-envelope"></i>
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="dash-contact-row">
                  <i className="fa-solid fa-phone"></i>
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="dash-invoice-line">
          {invoice.status === 'draft' ? (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '2px solid #e0e0e0', fontWeight: 600, width: 120 }}>Amount</th>
                    <th style={{ width: 36, borderBottom: '2px solid #e0e0e0' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {draftItems.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 8px 6px 0' }}>
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => {
                            const items = [...draftItems]
                            items[i] = { ...items[i], description: e.target.value }
                            setDraftItems(items)
                          }}
                          placeholder="Description"
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 6 }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px 6px 0' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={e => {
                            const items = [...draftItems]
                            items[i] = { ...items[i], amount: e.target.value }
                            setDraftItems(items)
                          }}
                          placeholder="0.00"
                          style={{ width: '100%', textAlign: 'right', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 6 }}
                        />
                      </td>
                      <td style={{ padding: '6px 0', textAlign: 'center' }}>
                        {draftItems.length > 1 && (
                          <button
                            type="button"
                            className="dash-btn-icon dash-btn-icon--danger"
                            onClick={() => setDraftItems(draftItems.filter((_, idx) => idx !== i))}
                            style={{ width: 28, height: 28, fontSize: '0.7rem' }}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {draftDiscountNum > 0 && (
                    <>
                      <tr>
                        <td colSpan={3} style={{ padding: '8px 0', borderTop: '2px solid #e0e0e0', textAlign: 'right', fontWeight: 600 }}>
                          Subtotal: {formatCurrency(draftSubtotal)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ padding: '4px 0', textAlign: 'right', color: '#e53e3e', fontWeight: 600 }}>
                          Discount ({draftDiscountNum}%): -{formatCurrency(draftSubtotal * draftDiscountNum / 100)}
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td colSpan={3} style={{ padding: '8px 0', borderTop: draftDiscountNum > 0 ? 'none' : '2px solid #e0e0e0', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>
                      Total: <span className="dash-amount">{formatCurrency(draftTotal)}</span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="dash-btn-secondary"
                  onClick={() => setDraftItems([...draftItems, { description: '', amount: '' }])}
                  style={{ fontSize: '0.85rem' }}
                >
                  + Add Line Item
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                  <label style={{ fontSize: '0.8rem', color: '#888' }}>Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={draftDiscount}
                    onChange={e => setDraftDiscount(e.target.value)}
                    style={{ width: 70, textAlign: 'right', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 6 }}
                  />
                </div>
                <button
                  className="dash-action-btn"
                  onClick={saveDraftItems}
                  disabled={savingDraft}
                  style={{ fontSize: '0.85rem' }}
                >
                  {savingDraft ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Description</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '2px solid #e0e0e0', fontWeight: 600, width: 100 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.line_items || []).map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>{item.description || '—'}</td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {invoice.discount_percent > 0 ? (
                  <>
                    <tr>
                      <td style={{ padding: '8px 0', borderTop: '2px solid #e0e0e0', fontWeight: 600 }}>Subtotal</td>
                      <td style={{ padding: '8px 0', borderTop: '2px solid #e0e0e0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(invoice.amount)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', color: '#e53e3e', fontWeight: 600 }}>Discount ({invoice.discount_percent}%)</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: '#e53e3e', fontWeight: 600 }}>-{formatCurrency(invoice.amount * invoice.discount_percent / 100)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 700, fontSize: '1.1rem' }}>Total</td>
                      <td className="dash-amount" style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, fontSize: '1.25rem' }}>{formatCurrency(invoice.amount * (1 - invoice.discount_percent / 100))}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td style={{ padding: '8px 0', borderTop: '2px solid #e0e0e0', fontWeight: 700, fontSize: '1.1rem' }}>Total</td>
                    <td className="dash-amount" style={{ padding: '8px 0', borderTop: '2px solid #e0e0e0', textAlign: 'right', fontWeight: 700, fontSize: '1.25rem' }}>{formatCurrency(invoice.amount)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          )}
        </div>

        {/* Payment Details */}
        <div className="dash-invoice-payment">
          <h3>Payment Details</h3>
          <div className="dash-contact-details">
            <div className="dash-contact-row">
              <i className="fa-solid fa-user"></i>
              <span><strong>Name:</strong> Beezkneez Lawns & Property Care</span>
            </div>
            <div className="dash-contact-row">
              <i className="fa-solid fa-building-columns"></i>
              <span><strong>Bank:</strong> Kiwibank</span>
            </div>
            <div className="dash-contact-row">
              <i className="fa-solid fa-hashtag"></i>
              <span><strong>Account:</strong> 38-9024-0138160-00</span>
            </div>
            <div className="dash-contact-row">
              <i className="fa-solid fa-file-lines"></i>
              <span><strong>Reference:</strong> {invoice.invoice_number}</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#888', marginTop: 8 }}>
            Please use the invoice number as your payment reference.
            {invoice.due_date && <><br />Payment due by <strong style={{ color: '#333' }}>{formatDate(invoice.due_date)}</strong>.</>}
          </p>
        </div>


        {/* Action Buttons */}
        <div className="dash-invoice-actions">
          {invoice.status === 'draft' && (
            <>
              <button className="dash-action-btn" onClick={() => openEmailModal('invoice')} disabled={updating}>
                <i className="fa-solid fa-paper-plane"></i> Send Invoice
              </button>
              <button className="dash-btn-secondary" onClick={handleMarkPaid} disabled={updating}>
                <i className="fa-solid fa-money-bill"></i> {updating ? 'Updating...' : 'Paid'}
              </button>
            </>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <>
              <button className="dash-action-btn" onClick={handleMarkPaid} disabled={updating}>
                <i className="fa-solid fa-money-bill"></i> {updating ? 'Updating...' : 'Paid'}
              </button>
              <button className="dash-btn-secondary" onClick={() => openEmailModal('invoice')} disabled={updating}>
                <i className="fa-solid fa-paper-plane"></i> Send Again
              </button>
            </>
          )}
          {invoice.status === 'paid' && (() => {
            const receiptSent = (invoice.activity || []).some(a => a.type === 'receipt_sent')
            return receiptSent ? (
              <button className="dash-btn-secondary" onClick={() => openEmailModal('receipt')}>
                <i className="fa-solid fa-paper-plane"></i> Resend Receipt
              </button>
            ) : (
              <button className="dash-action-btn" onClick={() => openEmailModal('receipt')}>
                <i className="fa-solid fa-paper-plane"></i> Send Receipt
              </button>
            )
          })()}
        </div>

        {/* Activity Feed */}
        {(invoice.activity || []).length > 0 && (
          <div className="dash-invoice-activity">
            <h3>Activity</h3>
            <div className="dash-activity-feed">
              {[...(invoice.activity || [])].reverse().map((event, i) => {
                const labels = {
                  created: 'Invoice created',
                  job_added: `Job added${event.detail ? `: ${event.detail}` : ''}`,
                  sent: 'Invoice sent',
                  paid: 'Payment received',
                  receipt_sent: 'Receipt sent',
                }
                const icons = {
                  created: 'fa-file-circle-plus',
                  job_added: 'fa-plus',
                  sent: 'fa-paper-plane',
                  paid: 'fa-money-bill',
                  receipt_sent: 'fa-receipt',
                }
                return (
                  <div key={i} className="dash-activity-item">
                    <i className={`fa-solid ${icons[event.type] || 'fa-circle'}`}></i>
                    <span>{labels[event.type] || event.type}</span>
                    <span className="dash-activity-time">{formatTimestamp(event.at)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reference Notes */}
      {(jobNotes.length > 0 || customerNotes.length > 0) && (
        <div className="dash-ref-notes">
          <div className="dash-ref-notes-header">
            <h2 className="dash-section-title">Your Notes</h2>
            <span style={{ fontSize: '0.8rem', color: '#999' }}>For your reference only — not included in invoice</span>
          </div>

          {jobNotes.length > 0 && (
            <div style={{ marginBottom: customerNotes.length > 0 ? 16 : 0 }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Job Notes</h4>
              <div className="dash-notes-list">
                {jobNotes.map(note => (
                  <div key={note.id} className="dash-note-item">
                    <div className="dash-note-content">{note.content}</div>
                    <div className="dash-note-meta">
                      <span className="dash-note-time">{formatTimestamp(note.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customerNotes.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Customer Notes</h4>
              <div className="dash-notes-list">
                {customerNotes.map(note => (
                  <div key={note.id} className="dash-note-item">
                    <div className="dash-note-content">{note.content}</div>
                    <div className="dash-note-meta">
                      <span className="dash-note-time">{formatTimestamp(note.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Link to="/dashboard/invoices" className="dash-back-btn">
        <i className="fa-solid fa-arrow-left"></i> Back to Invoices
      </Link>

      {/* Edit Modal */}
      {showEdit && (
        <div className="dash-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Edit Invoice</h3>
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
                        style={{ marginBottom: 2 }}
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
                <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 600 }}>
                  Subtotal: {formatCurrency(editForm.line_items.reduce((sum, li) => sum + Number(li.amount || 0), 0))}
                </div>
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editForm.discount_percent}
                    onChange={e => setEditForm({ ...editForm, discount_percent: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="dash-form-group">
                  <label>Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <div className="dash-form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                />
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

      {showEmailModal && (
        <div className="dash-modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>{emailForm.mode === 'receipt' ? 'Send Receipt' : 'Send Invoice'}</h3>
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
                <label>Message</label>
                <textarea
                  value={emailForm.body}
                  onChange={e => setEmailForm({ ...emailForm, body: e.target.value })}
                  rows={10}
                  required
                />
              </div>
              <p style={{ fontSize: '0.8rem', color: '#999', margin: '0 0 12px' }}>
                The invoice table, payment details, and PDF attachment will be added automatically.
              </p>
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

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`
}

function badgeClass(status) {
  const map = {
    draft: 'dash-badge--new',
    sent: 'dash-badge--scheduled',
    paid: 'dash-badge--completed',
    overdue: 'dash-badge--cancelled',
  }
  return `dash-badge ${map[status] || ''}`
}

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

const emptyForm = { customer_id: '', line_items: [{ description: '', amount: '' }], status: 'draft', due_date: defaultDueDate(), discount_percent: 0 }

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const navigate = useNavigate()

  async function fetchInvoices() {
    const { data } = await supabase
      .from('invoices')
      .select('*, customers(id, name)')
      .order('created_at', { ascending: false })
    if (data) setInvoices(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchInvoices()
    supabase.from('customers').select('id, name').order('name').then(({ data }) => {
      if (data) setCustomers(data)
    })
  }, [])

  async function generateInvoiceNumber() {
    const { data } = await supabase.from('invoices').select('invoice_number').order('created_at', { ascending: false }).limit(1)
    if (data && data.length > 0) {
      const last = data[0].invoice_number
      const num = parseInt(last.replace('INV-', ''), 10) || 0
      return `INV-${String(num + 1).padStart(3, '0')}`
    }
    return 'INV-001'
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(invoice) {
    setEditing(invoice)
    const lineItems = invoice.line_items && invoice.line_items.length > 0
      ? invoice.line_items.map(li => ({ description: li.description || '', amount: li.amount || 0 }))
      : [{ description: invoice.description || '', amount: invoice.amount || 0 }]
    setForm({
      customer_id: invoice.customer_id || '',
      line_items: lineItems,
      status: invoice.status || 'draft',
      due_date: invoice.due_date || '',
      discount_percent: invoice.discount_percent || 0,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(emptyForm)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    const lineItems = form.line_items.filter(li => li.description?.trim() || Number(li.amount))
    const subtotal = lineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0)
    const payload = {
      customer_id: form.customer_id,
      amount: subtotal,
      line_items: lineItems,
      description: lineItems.map(li => li.description).filter(Boolean).join(', ') || null,
      status: form.status,
      due_date: form.due_date || null,
      discount_percent: Number(form.discount_percent) || 0,
    }

    if (editing) {
      // Set sent_at when transitioning to sent
      if (form.status === 'sent' && editing.status !== 'sent' && !editing.sent_at) {
        payload.sent_at = new Date().toISOString()
      }
      // Set paid_at when transitioning to paid
      if (form.status === 'paid' && editing.status !== 'paid' && !editing.paid_at) {
        payload.paid_at = new Date().toISOString()
      }
      await supabase.from('invoices').update(payload).eq('id', editing.id)
    } else {
      const invoiceNumber = await generateInvoiceNumber()
      await supabase.from('invoices').insert({ ...payload, invoice_number: invoiceNumber })
    }

    setSaving(false)
    closeModal()
    fetchInvoices()
  }

  async function handleDelete(invoice) {
    if (deleting === invoice.id) {
      await supabase.from('invoices').delete().eq('id', invoice.id)
      setDeleting(null)
      fetchInvoices()
    } else {
      setDeleting(invoice.id)
    }
  }

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; invoices
      </div>

      <div className="dash-header">
        <h1>Invoices</h1>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">All Invoices</h2>
          <button className="dash-action-btn" onClick={openCreate}>+ Invoice</button>
        </div>
        {loading ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Loading...</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Due</th>
                <th>Status</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td className="dash-client-name" onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}>{inv.invoice_number}</td>
                  <td
                    className="dash-client-name"
                    onClick={() => inv.customer_id && navigate(`/dashboard/customers/${inv.customer_id}`)}
                  >
                    {inv.customers?.name || '—'}
                  </td>
                  <td>{inv.description || '—'}</td>
                  <td className="dash-amount">{formatCurrency(inv.amount * (1 - (inv.discount_percent || 0) / 100))}</td>
                  <td>{formatDate(inv.created_at)}</td>
                  <td>{formatDate(inv.due_date)}</td>
                  <td><span className={badgeClass(inv.status)}>{inv.status}</span></td>
                  <td className="dash-row-actions">
                    <button
                      className={`dash-btn-icon dash-btn-icon--danger ${deleting === inv.id ? 'confirm' : ''}`}
                      onClick={() => handleDelete(inv)}
                      onBlur={() => setDeleting(null)}
                      title={deleting === inv.id ? 'Click again to confirm' : 'Delete'}
                    >
                      <i className={`fa-solid ${deleting === inv.id ? 'fa-check' : 'fa-trash'}`}></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="dash-modal-overlay" onClick={closeModal}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>{editing ? 'Edit Invoice' : 'New Invoice'}</h3>
              <button className="dash-modal-close" onClick={closeModal}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="dash-form-group">
                <label>Customer *</label>
                <select
                  value={form.customer_id}
                  onChange={e => setForm({ ...form, customer_id: e.target.value })}
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
                {form.line_items.map((item, i) => (
                  <div key={i} className="dash-form-row" style={{ marginBottom: 8, alignItems: 'flex-end' }}>
                    <div className="dash-form-group" style={{ flex: 2, marginBottom: 0 }}>
                      {i === 0 && <label style={{ fontSize: '0.75rem', color: '#888' }}>Description</label>}
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => {
                          const items = [...form.line_items]
                          items[i] = { ...items[i], description: e.target.value }
                          setForm({ ...form, line_items: items })
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
                          const items = [...form.line_items]
                          items[i] = { ...items[i], amount: e.target.value }
                          setForm({ ...form, line_items: items })
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    {form.line_items.length > 1 && (
                      <button
                        type="button"
                        className="dash-btn-icon dash-btn-icon--danger"
                        onClick={() => {
                          const items = form.line_items.filter((_, idx) => idx !== i)
                          setForm({ ...form, line_items: items })
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
                  onClick={() => setForm({ ...form, line_items: [...form.line_items, { description: '', amount: '' }] })}
                  style={{ marginTop: 4, fontSize: '0.85rem' }}
                >
                  + Add Line Item
                </button>
                <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 600 }}>
                  Subtotal: {formatCurrency(form.line_items.reduce((sum, li) => sum + Number(li.amount || 0), 0))}
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
                    value={form.discount_percent}
                    onChange={e => setForm({ ...form, discount_percent: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="dash-form-group">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
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
                  value={form.due_date}
                  onChange={e => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div className="dash-modal-actions">
                <button type="button" className="dash-btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="dash-action-btn" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

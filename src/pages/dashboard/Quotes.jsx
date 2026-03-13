import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AddressAutocomplete from '../../components/AddressAutocomplete'
import useSort from '../../hooks/useSort'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
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

const emptyForm = { contact_name: '', contact_email: '', contact_phone: '', contact_address: '', service_id: '', status: 'pending', description: '', amount: '' }

export default function Quotes() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const filteredQuotes = statusFilter === 'all' ? quotes : quotes.filter(q => q.status === statusFilter)
  const { sorted: sortedQuotes, SortHeader } = useSort(filteredQuotes, 'created_at', false)

  async function fetchQuotes() {
    const { data } = await supabase
      .from('quotes')
      .select('*, services(id, name)')
      .order('created_at', { ascending: false })
    if (data) setQuotes(data)
    setLoading(false)
  }

  async function fetchServices() {
    const { data } = await supabase.from('services').select('*').order('name')
    if (data) setServices(data)
  }

  useEffect(() => {
    fetchQuotes()
    fetchServices()
  }, [])

  async function generateQuoteNumber() {
    const { data } = await supabase.from('quotes').select('quote_number').order('created_at', { ascending: false }).limit(1)
    if (data && data.length > 0) {
      const last = data[0].quote_number
      const num = parseInt(last.replace('QTE-', ''), 10) || 0
      return `QTE-${String(num + 1).padStart(3, '0')}`
    }
    return 'QTE-001'
  }

  function openCreate() {
    setForm(emptyForm)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setForm(emptyForm)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      contact_name: form.contact_name,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      contact_address: form.contact_address || null,
      service_id: form.service_id || null,
      status: form.status,
      description: form.description || null,
      amount: form.amount ? Number(form.amount) : null,
    }

    const quoteNumber = await generateQuoteNumber()
    await supabase.from('quotes').insert({ ...payload, quote_number: quoteNumber })

    setSaving(false)
    closeModal()
    fetchQuotes()
  }

  async function handleDelete(quote) {
    if (deleting === quote.id) {
      await supabase.from('quotes').delete().eq('id', quote.id)
      setDeleting(null)
      fetchQuotes()
    } else {
      setDeleting(quote.id)
    }
  }

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; quotes
      </div>

      <div className="dash-header">
        <h1>Quotes</h1>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Quotes</h2>
          <button className="dash-action-btn" onClick={openCreate}>+ Quote</button>
        </div>
        <div className="dash-filter-tabs">
          {[['all', 'All'], ['pending', 'Pending'], ['sent', 'Sent'], ['approved', 'Approved'], ['declined', 'Declined']].map(([val, label]) => (
            <button key={val} className={`dash-filter-tab${statusFilter === val ? ' active' : ''}`} onClick={() => setStatusFilter(val)}>{label}</button>
          ))}
        </div>
        {loading ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Loading...</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <SortHeader label="Quote #" field="quote_number" />
                <SortHeader label="Contact" field="contact_name" />
                <SortHeader label="Service" field="services.name" />
                <SortHeader label="Amount" field="amount" />
                <SortHeader label="Date" field="created_at" />
                <SortHeader label="Status" field="status" />
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedQuotes.map(q => (
                <tr key={q.id}>
                  <td className="dash-client-name" onClick={() => navigate(`/dashboard/quotes/${q.id}`)}>{q.quote_number}</td>
                  <td>{q.contact_name}</td>
                  <td style={{ fontWeight: 500 }}>{q.services?.name || '—'}</td>
                  <td className="dash-amount">{q.amount ? formatCurrency(q.amount) : '—'}</td>
                  <td>{formatDate(q.created_at)}</td>
                  <td><span className={badgeClass(q.status)}>{q.status}</span></td>
                  <td className="dash-row-actions">
                    <button
                      className={`dash-btn-icon dash-btn-icon--danger ${deleting === q.id ? 'confirm' : ''}`}
                      onClick={() => handleDelete(q)}
                      onBlur={() => setDeleting(null)}
                      title={deleting === q.id ? 'Click again to confirm' : 'Delete'}
                    >
                      <i className={`fa-solid ${deleting === q.id ? 'fa-check' : 'fa-trash'}`}></i>
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
              <h3>New Quote</h3>
              <button className="dash-modal-close" onClick={closeModal}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="dash-form-group">
                <label>Contact Name *</label>
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={e => setForm({ ...form, contact_name: e.target.value })}
                  required
                />
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })}
                  />
                </div>
                <div className="dash-form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={e => setForm({ ...form, contact_phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="dash-form-group">
                <label>Address</label>
                <AddressAutocomplete
                  value={form.contact_address}
                  onChange={address => setForm({ ...form, contact_address: address })}
                />
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Service *</label>
                  <select
                    value={form.service_id}
                    onChange={e => setForm({ ...form, service_id: e.target.value })}
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
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="approved">Approved</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>
              <div className="dash-form-group">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="dash-form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="dash-modal-actions">
                <button type="button" className="dash-btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="dash-action-btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AddressAutocomplete from '../../components/AddressAutocomplete'

const emptyForm = { name: '', address: '', email: '', phone: '' }

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

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const navigate = useNavigate()

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('*').order('name')
    if (data) setCustomers(data)
    setLoading(false)
  }

  useEffect(() => { fetchCustomers() }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(customer) {
    setEditing(customer)
    setForm({
      name: customer.name || '',
      address: customer.address || '',
      email: customer.email || '',
      phone: customer.phone || '',
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

    if (editing) {
      await supabase.from('customers').update(form).eq('id', editing.id)
    } else {
      await supabase.from('customers').insert(form)
    }

    setSaving(false)
    closeModal()
    fetchCustomers()
  }

  async function handleDelete(customer) {
    if (deleting === customer.id) {
      await supabase.from('customers').delete().eq('id', customer.id)
      setDeleting(null)
      fetchCustomers()
    } else {
      setDeleting(customer.id)
    }
  }

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; customers
      </div>

      <div className="dash-header">
        <h1>Customers</h1>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">All Customers</h2>
          <button className="dash-action-btn" onClick={openCreate}>+ Customer</button>
        </div>
        {loading ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Loading...</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Email</th>
                <th>Phone</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td className="dash-client-name" onClick={() => navigate(`/dashboard/customers/${c.id}`)}>{c.name}</td>
                  <td>{shortAddress(c.address)}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td className="dash-row-actions">
                    <button className="dash-btn-icon" onClick={() => openEdit(c)} title="Edit">
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      className={`dash-btn-icon dash-btn-icon--danger ${deleting === c.id ? 'confirm' : ''}`}
                      onClick={() => handleDelete(c)}
                      onBlur={() => setDeleting(null)}
                      title={deleting === c.id ? 'Click again to confirm' : 'Delete'}
                    >
                      <i className={`fa-solid ${deleting === c.id ? 'fa-check' : 'fa-trash'}`}></i>
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
              <h3>{editing ? 'Edit Customer' : 'New Customer'}</h3>
              <button className="dash-modal-close" onClick={closeModal}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="dash-form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="dash-form-group">
                <label>Address</label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={address => setForm({ ...form, address })}
                />
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="dash-form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
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

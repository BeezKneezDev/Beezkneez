import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Services() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchServices() {
    const { data, error } = await supabase.from('services').select('*').order('name')
    console.log('services:', data, 'error:', error)
    if (data) setServices(data)
    setLoading(false)
  }

  useEffect(() => { fetchServices() }, [])

  function openCreate() {
    setEditingService(null)
    setFormName('')
    setFormDescription('')
    setShowModal(true)
  }

  function openEdit(service) {
    setEditingService(service)
    setFormName(service.name)
    setFormDescription(service.description || '')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingService(null)
    setFormName('')
    setFormDescription('')
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!formName.trim()) return
    setSaving(true)
    const payload = { name: formName.trim(), description: formDescription.trim() || null }
    if (editingService) {
      await supabase.from('services').update(payload).eq('id', editingService.id)
    } else {
      await supabase.from('services').insert(payload)
    }
    setSaving(false)
    closeModal()
    fetchServices()
  }

  async function deleteService(id) {
    if (deleting === id) {
      await supabase.from('services').delete().eq('id', id)
      setDeleting(null)
      fetchServices()
    } else {
      setDeleting(id)
    }
  }

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; services
      </div>

      <div className="dash-header">
        <h1>Services</h1>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">All Services</h2>
          <button className="dash-action-btn" onClick={openCreate}>+ Add Service</button>
        </div>
        {loading ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Loading...</p>
        ) : services.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>No services yet. Add one above.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Description</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id}>
                  <td><span style={{ fontWeight: 500 }}>{s.name}</span></td>
                  <td style={{ color: '#888', fontSize: '0.9rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.description || '—'}
                  </td>
                  <td className="dash-row-actions">
                    <button className="dash-btn-icon" onClick={() => openEdit(s)} title="Edit">
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      className={`dash-btn-icon dash-btn-icon--danger ${deleting === s.id ? 'confirm' : ''}`}
                      onClick={() => deleteService(s.id)}
                      onBlur={() => setDeleting(null)}
                      title={deleting === s.id ? 'Click again to confirm' : 'Delete'}
                    >
                      <i className={`fa-solid ${deleting === s.id ? 'fa-check' : 'fa-trash'}`}></i>
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
              <h3>{editingService ? 'Edit Service' : 'New Service'}</h3>
              <button className="dash-modal-close" onClick={closeModal}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="dash-form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Service name..."
                  required
                  autoFocus
                />
              </div>
              <div className="dash-form-group">
                <label>Description</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Default description for invoices..."
                />
              </div>
              <div className="dash-modal-actions">
                <button type="button" className="dash-btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="dash-action-btn" disabled={saving || !formName.trim()}>
                  {saving ? 'Saving...' : editingService ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

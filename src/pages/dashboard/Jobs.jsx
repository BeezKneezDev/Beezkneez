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

function formatTimestamp(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const frequencyLabels = {
  one_off: 'One-off',
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
}

function badgeClass(status) {
  const map = {
    scheduled: 'dash-badge--scheduled',
    completed: 'dash-badge--completed',
    cancelled: 'dash-badge--cancelled',
  }
  return `dash-badge ${map[status] || ''}`
}

const emptyForm = { customer_id: '', service_id: '', description: '', scheduled_date: '', amount: '', status: 'scheduled', frequency: 'one_off' }

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [jobNotes, setJobNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(null)
  const navigate = useNavigate()

  async function fetchJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('*, customers(id, name), services(id, name)')
      .order('scheduled_date', { ascending: false })
    if (data) setJobs(data)
    setLoading(false)
  }

  async function fetchServices() {
    const { data } = await supabase.from('services').select('*').order('name')
    if (data) setServices(data)
  }

  useEffect(() => {
    fetchJobs()
    supabase.from('customers').select('id, name').order('name').then(({ data }) => {
      if (data) setCustomers(data)
    })
    fetchServices()
  }, [])


  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  async function openEdit(job) {
    setEditing(job)
    setForm({
      customer_id: job.customer_id || '',
      service_id: job.service_id || '',
      description: job.description || '',
      scheduled_date: job.scheduled_date || '',
      amount: job.amount || '',
      status: job.status || 'scheduled',
      frequency: job.frequency || 'one_off',
    })
    setNewNote('')
    setShowModal(true)
    const { data } = await supabase.from('notes').select('*').eq('job_id', job.id).order('created_at', { ascending: false })
    if (data) setJobNotes(data)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(emptyForm)
    setJobNotes([])
    setNewNote('')
  }

  async function addNote() {
    if (!newNote.trim() || !editing) return
    setAddingNote(true)
    await supabase.from('notes').insert({ job_id: editing.id, customer_id: editing.customer_id || null, content: newNote.trim() })
    const { data } = await supabase.from('notes').select('*').eq('job_id', editing.id).order('created_at', { ascending: false })
    if (data) setJobNotes(data)
    setNewNote('')
    setAddingNote(false)
  }

  async function deleteNote() {
    await supabase.from('notes').delete().eq('id', confirmDeleteNote)
    setJobNotes(jobNotes.filter(n => n.id !== confirmDeleteNote))
    setConfirmDeleteNote(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const selectedService = services.find(s => s.id === form.service_id)
    const payload = {
      customer_id: form.customer_id || null,
      service_id: form.service_id || null,
      description: form.description || null,
      scheduled_date: form.scheduled_date || null,
      amount: form.amount ? Number(form.amount) : null,
      status: form.status,
      frequency: form.frequency || 'one_off',
      type: selectedService?.name || '',
    }

    console.log('Saving job, editing:', !!editing, 'payload:', payload)
    if (editing) {
      const { data, error } = await supabase.from('jobs').update(payload).eq('id', editing.id).select()
      console.log('Update data:', JSON.stringify(data))
      console.log('Update error:', JSON.stringify(error))
      if (error) alert('Update failed: ' + error.message)
      if (!data || data.length === 0) console.warn('Update returned no rows — RLS may be blocking')
    } else {
      const { data: newJob, error } = await supabase.from('jobs').insert(payload).select().single()
      console.log('Insert result:', { data: newJob, error })
      if (error) { console.error('Job insert error:', error); alert('Create failed: ' + error.message) }
    }

    setSaving(false)
    closeModal()
    fetchJobs()
  }

  async function handleDelete(job) {
    if (deleting === job.id) {
      await supabase.from('jobs').delete().eq('id', job.id)
      setDeleting(null)
      fetchJobs()
    } else {
      setDeleting(job.id)
    }
  }

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; jobs
      </div>

      <div className="dash-header">
        <h1>Jobs</h1>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">All Jobs</h2>
          <button className="dash-action-btn" onClick={openCreate}>+ Job</button>
        </div>
        {loading ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Loading...</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service</th>
                <th>Description</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Frequency</th>
                <th>Status</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td
                    className="dash-client-name"
                    onClick={() => job.customer_id && navigate(`/dashboard/customers/${job.customer_id}`)}
                  >
                    {job.customers?.name || '—'}
                  </td>
                  <td className="dash-client-name" onClick={() => navigate(`/dashboard/jobs/${job.id}`)}>{job.services?.name || job.type}</td>
                  <td>{job.description}</td>
                  <td>{formatDate(job.scheduled_date)}</td>
                  <td className="dash-amount">{job.amount ? formatCurrency(job.amount) : '—'}</td>
                  <td>{frequencyLabels[job.frequency] || 'One-off'}</td>
                  <td><span className={badgeClass(job.status)}>{job.status}</span></td>
                  <td className="dash-row-actions">
                    <button className="dash-btn-icon" onClick={() => openEdit(job)} title="Edit">
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      className={`dash-btn-icon dash-btn-icon--danger ${deleting === job.id ? 'confirm' : ''}`}
                      onClick={() => handleDelete(job)}
                      onBlur={() => setDeleting(null)}
                      title={deleting === job.id ? 'Click again to confirm' : 'Delete'}
                    >
                      <i className={`fa-solid ${deleting === job.id ? 'fa-check' : 'fa-trash'}`}></i>
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
              <h3>{editing ? 'Edit Job' : 'New Job'}</h3>
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
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Service *</label>
                  <select
                    value={form.service_id}
                    onChange={e => {
                      const newServiceId = e.target.value
                      const newService = services.find(s => s.id === newServiceId)
                      const oldService = services.find(s => s.id === form.service_id)
                      const shouldAutoFill = !form.description || form.description === (oldService?.description || '')
                      setForm({
                        ...form,
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
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
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
                  value={form.frequency}
                  onChange={e => setForm({ ...form, frequency: e.target.value })}
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
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.scheduled_date}
                    onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
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
              </div>
              <div className="dash-modal-actions">
                <button type="button" className="dash-btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="dash-action-btn" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
            {editing && (
              <div className="dash-modal-notes">
                <h4>Notes</h4>
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
                    {addingNote ? 'Adding...' : '+ Add'}
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
                            className={`dash-btn-icon dash-btn-icon--danger ${confirmDeleteNote === note.id ? 'confirm' : ''}`}
                            onClick={() => confirmDeleteNote === note.id ? deleteNote() : setConfirmDeleteNote(note.id)}
                            onBlur={() => setConfirmDeleteNote(null)}
                            title={confirmDeleteNote === note.id ? 'Click again to confirm' : 'Delete note'}
                            style={{ width: 24, height: 24, fontSize: '0.7rem' }}
                          >
                            <i className={`fa-solid ${confirmDeleteNote === note.id ? 'fa-check' : 'fa-trash'}`}></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

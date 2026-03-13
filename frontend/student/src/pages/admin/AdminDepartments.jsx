import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import Alert from '../../components/Alert'
import { notify } from '../../lib/toastService'
import ConfirmModal from '../../components/ConfirmModal'

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState(null)

  useEffect(() => { fetchDepartments() }, [])

  async function fetchDepartments() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('departments/')
      setDepartments(res.data.results || res.data)
    } catch (e) { setError('Failed to load departments') }
    finally { setLoading(false) }
  }

  async function createDept(e) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !code.trim()) { setError('Name and code required'); return }
    try {
      await api.post('departments/', { name: name.trim(), code: code.trim() })
      setName('')
      setCode('')
      fetchDepartments()
      notify({ type: 'success', message: 'Department created' })
    } catch (err) {
      setError('Create failed')
      notify({ type: 'error', message: 'Create failed' })
    }
  }

  async function deleteDept(id) {
    setConfirmPayload({ type: 'dept', id })
    setConfirmOpen(true)
  }

  async function handleConfirmDelete() {
    if (!confirmPayload) return
    try {
      if (confirmPayload.type === 'dept') {
        await api.delete(`departments/${confirmPayload.id}/`)
        notify({ type: 'success', message: 'Department deleted' })
        fetchDepartments()
      }
      setConfirmOpen(false)
      setConfirmPayload(null)
    } catch (err) {
      setError('Delete failed')
      notify({ type: 'error', message: 'Delete failed' })
    }
  }

  async function startEdit(d) {
    d._editing = true
    setDepartments([...departments])
  }

  async function saveEdit(d) {
    if (!d.name || !d.code) { setError('Name and code required'); return }
    try {
      await api.put(`departments/${d.id}/`, { name: d.name, code: d.code })
      d._editing = false
      setDepartments([...departments])
      notify({ type: 'success', message: 'Department updated' })
    } catch (e) { setError('Update failed'); notify({ type: 'error', message: 'Update failed' }) }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Departments (Admin)</h2>
      {error && <Alert>{error}</Alert>}
      <ConfirmModal open={confirmOpen} title="Delete department" message="Are you sure you want to delete this department?" onConfirm={handleConfirmDelete} onCancel={() => setConfirmOpen(false)} />
      <form onSubmit={createDept} style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button type="submit" className="btn-icon btn-success">Create Department</button>
      </form>
      {loading && <div>Loading...</div>}
      <div>
        {departments.map((d) => (
          <div key={d.id} className="list-row">
            {d._editing ? (
              <>
                <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                  <input value={d.name} onChange={(e) => { d.name = e.target.value; setDepartments([...departments]) }} />
                  <input value={d.code} onChange={(e) => { d.code = e.target.value; setDepartments([...departments]) }} />
                </div>
                <div className="actions">
                  <button className="btn-icon" onClick={() => saveEdit(d)} aria-label="Save">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    Save
                  </button>
                  <button className="btn-icon" onClick={() => { d._editing = false; setDepartments([...departments]) }} aria-label="Cancel">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{d.name}</div>
                  <div className="meta">{d.code}</div>
                </div>
                <div className="actions">
                  <button className="btn-icon" onClick={() => startEdit(d)} aria-label="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    Edit
                  </button>
                  <button className="btn-icon btn-danger" onClick={() => deleteDept(d.id)} aria-label="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

import React, { useEffect, useState, useRef } from 'react'
import api from '../../lib/api'
import { notify } from '../../lib/toastService'
import ConfirmModal from '../../components/ConfirmModal'

export default function AdminHods() {
  const [hods, setHods] = useState([])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [departments, setDepartments] = useState([])

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', username: '', password: '', department_id: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', department_id: '' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState(null)
  const searchTimer = useRef(null)

  useEffect(() => { fetchHods(); fetchDepartments() }, [])
  useEffect(() => { fetchHods() }, [deptFilter])
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { fetchHods() }, 420)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  async function fetchHods() {
    try {
      const params = {}
      if (search) params.search = search
      if (deptFilter) params.department = deptFilter
      const res = await api.get('hods/', { params })
      setHods(res.data.results || res.data)
    } catch (e) { console.error(e); notify({ type: 'error', message: 'Failed to load HODs' }) }
  }

  async function fetchDepartments() {
    try {
      const res = await api.get('departments/')
      setDepartments(res.data.results || res.data)
    } catch (e) { console.error('failed to load departments', e) }
  }

  async function createHod(e) {
    e.preventDefault()
    if (!form.username.trim() || !form.password) { notify({ type: 'error', message: 'Username and password required' }); return }
    if (!form.department_id) { notify({ type: 'error', message: 'Please select a department' }); return }
    try {
      const payload = { username: form.username.trim(), password: form.password, first_name: form.first_name, last_name: form.last_name, email: form.email, role: 'HOD' }
      const res = await api.post('register/', payload)
      const userId = res.data.user?.id
      if (userId) await api.post(`departments/${form.department_id}/assign_hod/`, { hod_user_id: userId })
      setForm({ first_name: '', last_name: '', email: '', username: '', password: '', department_id: '' })
      fetchHods()
      notify({ type: 'success', message: 'HOD created' })
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Create failed' })
    }
  }

  function startEdit(h) {
    setEditingId(h.id)
    setEditForm({ first_name: h.first_name || '', last_name: h.last_name || '', email: h.email || '', department_id: h.department_id || '' })
  }

  useEffect(() => {
    if (editingId) { setTimeout(() => { const el = document.getElementById(`edit-first-${editingId}`); if (el) el.focus() }, 0) }
  }, [editingId])

  async function saveEdit() {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) { notify({ type: 'error', message: 'First and last name required' }); return }
    try {
      await api.put(`users/${editingId}/`, { first_name: editForm.first_name, last_name: editForm.last_name, email: editForm.email })
      if (editForm.department_id) await api.post(`departments/${editForm.department_id}/assign_hod/`, { hod_user_id: editingId })
      setEditingId(null)
      fetchHods()
      notify({ type: 'success', message: 'HOD updated' })
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Update failed' })
    }
  }

  function confirmDelete(id) {
    setConfirmPayload({ type: 'hod', id })
    setConfirmOpen(true)
  }

  async function handleConfirmDelete() {
    if (!confirmPayload) return
    try {
      if (confirmPayload.type === 'hod') {
        await api.delete(`users/${confirmPayload.id}/`)
        notify({ type: 'success', message: 'HOD deleted' })
      }
      setConfirmOpen(false)
      setConfirmPayload(null)
      fetchHods()
    } catch (err) { console.error(err); notify({ type: 'error', message: err?.response?.data?.error || 'Delete failed' }) }
  }

  return (
    <div style={{ padding: 24 }}>
      <ConfirmModal open={confirmOpen} title="Delete HOD" message="Are you sure you want to delete this HOD user?" onConfirm={handleConfirmDelete} onCancel={() => setConfirmOpen(false)} />
      <h2>HODs (Admin)</h2>
      <form onSubmit={createHod} style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select value={form.department_id || ''} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
          <option value="">Select department</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button type="submit" className="btn-icon btn-success">Create HOD</button>
      </form>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input placeholder="Search by name or username" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchHods() }} />
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.code || d.id}>{d.name}</option>)}
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8 }}>First Name</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Last Name</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Username</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Department</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {hods.map((h) => (
            editingId === h.id ? (
              <tr key={h.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: 8 }}><input id={`edit-first-${h.id}`} value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} /></td>
                <td style={{ padding: 8 }}><input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} /></td>
                <td style={{ padding: 8 }}><input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></td>
                <td style={{ padding: 8 }}>{h.username}</td>
                <td style={{ padding: 8 }}>
                  <select value={editForm.department_id || ''} onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}>
                    <option value="">Select department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                  </select>
                </td>
                <td style={{ padding: 8 }}>
                  <button className="btn-icon" onClick={saveEdit} style={{ marginRight: 8 }}>Save</button>
                  <button className="btn-icon" onClick={() => setEditingId(null)}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={h.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: 8 }}>{h.first_name}</td>
                <td style={{ padding: 8 }}>{h.last_name}</td>
                <td style={{ padding: 8 }}>{h.email}</td>
                <td style={{ padding: 8 }}>{h.username}</td>
                <td style={{ padding: 8 }}>{h.department || h.department_name || ''}</td>
                <td style={{ padding: 8 }}>
                  <button className="btn-icon" onClick={() => startEdit(h)} style={{ marginRight: 8 }}>Edit</button>
                  <button className="btn-icon btn-danger" onClick={() => confirmDelete(h.id)}>Delete</button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  )
}

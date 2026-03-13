import React, { useEffect, useState, useRef } from 'react'
import api from '../../lib/api'
import { notify } from '../../lib/toastService'
import ConfirmModal from '../../components/ConfirmModal'
import { useAuth } from '../../lib/auth'

export default function HodFaculty() {
  const { user } = useAuth()
  const [faculty, setFaculty] = useState([])
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState(null)

  // create form
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', username: '', password: '' })

  // edit
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState(null)
  const searchTimer = useRef(null)

  useEffect(() => { fetchDept(); }, [user])
  useEffect(() => { fetchFaculty() }, [dept])
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { if (dept) fetchFaculty() }, 420)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  async function fetchDept() {
    try {
      const res = await api.get('departments/')
      const list = res.data.results || res.data || []
      const my = list.find((d) => {
        const h = d.hod
        if (!h || !user) return false
        if (typeof h === 'object' && h.id != null) return String(h.id) === String(user.id)
        return String(h) === String(user.id) || String(h) === String(user.username)
      })
      if (my) setDept(my)
    } catch (e) { console.error(e) }
  }

  async function fetchFaculty() {
    try {
      const params = { department: dept?.code }
      if (search) params.search = search
      const res = await api.get('faculty/', { params })
      setFaculty(res.data.results || res.data)
    } catch (e) { console.error(e); notify({ type: 'error', message: 'Failed to load faculty' }) }
  }

  async function createFaculty(e) {
    e.preventDefault()
    if (!form.username.trim() || !form.password) { notify({ type: 'error', message: 'Username and password required' }); return }
    try {
      const payload = { username: form.username.trim(), password: form.password, first_name: form.first_name, last_name: form.last_name, email: form.email }
      if (dept) payload.department_id = dept.id
      await api.post('faculty/', payload)
      setForm({ first_name: '', last_name: '', email: '', username: '', password: '' })
      fetchFaculty()
      notify({ type: 'success', message: 'Faculty created' })
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Create failed' })
    }
  }

  function startEdit(f) {
    setEditingId(f.id)
    setEditForm({ first_name: f.first_name || '', last_name: f.last_name || '', email: f.email || '' })
  }

  useEffect(() => {
    if (editingId) { setTimeout(() => { const el = document.getElementById(`edit-first-${editingId}`); if (el) el.focus() }, 0) }
  }, [editingId])

  async function saveEdit() {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) { notify({ type: 'error', message: 'First and last name required' }); return }
    if (editForm.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(editForm.email)) { notify({ type: 'error', message: 'Invalid email' }); return }
    try {
      const payload = { first_name: editForm.first_name, last_name: editForm.last_name, email: editForm.email }
      if (dept) payload.department_id = dept.id
      await api.put(`faculty/${editingId}/`, payload)
      setEditingId(null)
      fetchFaculty()
      notify({ type: 'success', message: 'Faculty updated' })
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Update failed' })
    }
  }

  function confirmDelete(id) {
    setConfirmPayload({ type: 'faculty', id })
    setConfirmOpen(true)
  }

  async function handleConfirmDelete() {
    if (!confirmPayload) return
    try {
      if (confirmPayload.type === 'faculty') {
        await api.delete(`faculty/${confirmPayload.id}/`)
        notify({ type: 'success', message: 'Faculty deleted' })
      }
      setConfirmOpen(false)
      setConfirmPayload(null)
      fetchFaculty()
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Delete failed' })
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <ConfirmModal open={confirmOpen} title="Delete faculty" message="Are you sure you want to delete this faculty member?" onConfirm={handleConfirmDelete} onCancel={() => setConfirmOpen(false)} />
      <h2>Faculty (Department)</h2>
      {dept ? <h4>{dept.name} ({dept.code})</h4> : <div>Loading department...</div>}

      <form onSubmit={createFaculty} style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button type="submit" className="btn-icon btn-success">Create Faculty</button>
      </form>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input placeholder="Search by name or username" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchFaculty() }} />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8 }}>First Name</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Last Name</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Username</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {faculty.map((f) => (
            editingId === f.id ? (
              <tr key={f.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: 8 }}><input id={`edit-first-${f.id}`} value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} /></td>
                <td style={{ padding: 8 }}><input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} /></td>
                <td style={{ padding: 8 }}><input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></td>
                <td style={{ padding: 8 }}>{f.user?.username || f.username}</td>
                <td style={{ padding: 8 }}>
                  <button className="btn-icon" onClick={saveEdit} style={{ marginRight: 8 }}>Save</button>
                  <button className="btn-icon" onClick={() => setEditingId(null)}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={f.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: 8 }}>{f.first_name}</td>
                <td style={{ padding: 8 }}>{f.last_name}</td>
                <td style={{ padding: 8 }}>{f.email}</td>
                <td style={{ padding: 8 }}>{f.username || f.user?.username}</td>
                <td style={{ padding: 8 }}>
                  <button className="btn-icon" onClick={() => startEdit(f)} style={{ marginRight: 8 }}>Edit</button>
                  <button className="btn-icon btn-danger" onClick={() => confirmDelete(f.id)}>Delete</button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  )
}

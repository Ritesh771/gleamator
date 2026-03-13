import React, { useEffect, useState, useRef } from 'react'
import api from '../../lib/api'
import { notify } from '../../lib/toastService'
import ConfirmModal from '../../components/ConfirmModal'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  // create form
  const [form, setForm] = useState({ username: '', password: '', first_name: '', last_name: '', email: '', role: 'STUDENT' })
  const [departments, setDepartments] = useState([])

  const roleLabels = { STUDENT: 'Student', FACULTY: 'Faculty', HOD: 'HOD', ADMIN: 'Admin' }

  // edit
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', role: '' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState(null)

  useEffect(() => { fetchUsers() }, [])
  useEffect(() => { fetchDepartments() }, [])

  // auto-fetch when role filter changes
  useEffect(() => { fetchUsers() }, [roleFilter])

  // debounce search input and auto-fetch
  const searchTimer = useRef(null)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    // small debounce so typing doesn't spam API
    searchTimer.current = setTimeout(() => {
      fetchUsers()
    }, 420)
    return () => { if (searchTimer.current) { clearTimeout(searchTimer.current); searchTimer.current = null } }
  }, [search])

  async function fetchUsers() {
    try {
      const params = {}
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      const res = await api.get('users/', { params })
      setUsers(res.data.results || res.data)
    } catch (e) { console.error(e); notify({ type: 'error', message: 'Failed to load users' }) }
  }

  async function fetchDepartments() {
    try {
      const res = await api.get('departments/')
      setDepartments(res.data.results || res.data)
    } catch (e) { console.error('failed to load departments', e) }
  }

  async function createUser(e) {
    e.preventDefault()
    // client-side validation
    if (!form.first_name.trim() || !form.last_name.trim()) { notify({ type: 'error', message: 'First and last name are required' }); return }
    if (!form.username.trim()) { notify({ type: 'error', message: 'Username is required' }); return }
    if (!form.password) { notify({ type: 'error', message: 'Password is required' }); return }
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) { notify({ type: 'error', message: 'Invalid email' }); return }

    try {
      const payload = { ...form }
      // include department_id when applicable (students, faculty, HOD)
      if (form.role === 'STUDENT' || form.role === 'FACULTY' || form.role === 'HOD') {
          if (!form.department_id) {
            notify({ type: 'error', message: 'Please select a department for students/faculty/HOD' })
            return
          }
        payload.department_id = form.department_id
      }
        await api.post('register/', payload)
        setForm({ username: '', password: '', first_name: '', last_name: '', email: '', role: 'STUDENT' })
        fetchUsers()
        notify({ type: 'success', message: 'User created' })
    } catch (err) {
      console.error(err)
      const msg = err?.response?.data?.error || 'Create failed'
        notify({ type: 'error', message: msg })
    }
  }

  function startEdit(u) {
    setEditingId(u.id)
    setEditForm({ first_name: u.first_name || '', last_name: u.last_name || '', email: u.email || '', role: u.role || 'STUDENT' })
    // focus will be handled by effect below
  }

  // autofocus first input when entering edit mode
  useEffect(() => {
    if (editingId) {
      setTimeout(() => {
        const el = document.getElementById(`edit-first-${editingId}`)
        if (el) el.focus()
      }, 0)
    }
  }, [editingId])

  async function saveEdit(e) {
    if (e && e.preventDefault) e.preventDefault()
    // client-side validation
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) { notify({ type: 'error', message: 'First and last name are required' }); return }
    if (editForm.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(editForm.email)) { notify({ type: 'error', message: 'Invalid email' }); return }
    try {
      await api.put(`users/${editingId}/`, editForm)
      setEditingId(null)
      fetchUsers()
      notify({ type: 'success', message: 'User updated' })
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Update failed' })
    }
  }

  async function deleteUser(id) {
    setConfirmPayload({ type: 'user', id })
    setConfirmOpen(true)
  }

  async function handleConfirmDelete() {
    if (!confirmPayload) return
    try {
      if (confirmPayload.type === 'user') {
        await api.delete(`users/${confirmPayload.id}/`)
        notify({ type: 'success', message: 'User deleted' })
      }
      setConfirmOpen(false)
      setConfirmPayload(null)
      fetchUsers()
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Delete failed' })
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <ConfirmModal open={confirmOpen} title="Delete user" message="Are you sure you want to delete this user?" onConfirm={handleConfirmDelete} onCancel={() => setConfirmOpen(false)} />
      <h2>Admin - Users</h2>

      {/* search & filter moved below into Existing Users section */}

      <form onSubmit={createUser} style={{ marginBottom: 18 }}>
        <h3>Create Student/Admin/Faculty</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="first name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <input placeholder="last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <input placeholder="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input placeholder="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="STUDENT">STUDENT</option>
            <option value="FACULTY">FACULTY</option>
            <option value="HOD">HOD</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          {(form.role === 'STUDENT' || form.role === 'FACULTY' || form.role === 'HOD') && (
            <select value={form.department_id || ''} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              <option value="">Select department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name || d.code}</option>)}
            </select>
          )}
          <button type="submit" className="btn-icon btn-success">Create {roleLabels[form.role] || 'User'}</button>
        </div>
      </form>

      <h3>Existing Users</h3>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="Search by username or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers() }}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="HOD">HOD</option>
          <option value="FACULTY">FACULTY</option>
          <option value="STUDENT">STUDENT</option>
        </select>
        {/* role filter auto-applies; no Filter button needed */}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8 }}>First Name</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Last Name</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Username</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Role</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            editingId === u.id ? (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: 8 }}>
                  <input id={`edit-first-${u.id}`} value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
                </td>
                <td style={{ padding: 8 }}>
                  <input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
                </td>
                <td style={{ padding: 8 }}>{u.username}</td>
                <td style={{ padding: 8 }}>
                  <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </td>
                <td style={{ padding: 8 }}>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="STUDENT">STUDENT</option>
                    <option value="FACULTY">FACULTY</option>
                    <option value="HOD">HOD</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td style={{ padding: 8 }}>
                  <button className="btn-icon" onClick={saveEdit} style={{ marginRight: 8 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    Save
                  </button>
                  <button className="btn-icon" onClick={() => setEditingId(null)}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: 8 }}>{u.first_name}</td>
                <td style={{ padding: 8 }}>{u.last_name}</td>
                <td style={{ padding: 8 }}>{u.username}</td>
                <td style={{ padding: 8 }}>{u.email}</td>
                <td style={{ padding: 8 }}>{u.role}</td>
                <td style={{ padding: 8 }}>
                  <button className="btn-icon" onClick={() => startEdit(u)} style={{ marginRight: 8 }} aria-label="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    Edit
                  </button>
                  <button className="btn-icon btn-danger" onClick={() => deleteUser(u.id)} aria-label="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                    Delete
                  </button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>

      {/* inline editing replaces separate edit panel */}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { notify } from '../../lib/toastService'
import ConfirmModal from '../../components/ConfirmModal'
import { useRef } from 'react'

export default function HodStudents() {
  const { user } = useAuth()
  const [dept, setDept] = useState(null)
  const [students, setStudents] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [meta, setMeta] = useState({ page: 1, page_size: pageSize })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', username: '', password: '', usn: '', semester: 1, section: 'A' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', semester: 1, section: 'A' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState(null)
  const searchTimer = useRef(null)

  useEffect(() => { fetchDept() }, [user])
  // fetch when department or page changes; search is handled by debounce below
  useEffect(() => { if (dept) fetchStudents() }, [dept, page])
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setPage(1); if (dept) fetchStudents() }, 420)
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

  async function fetchStudents() {
    if (!dept) return
    setLoading(true)
    try {
      const params = { department: dept.code, page, page_size: pageSize }
      if (search) params.search = search
      const res = await api.get('students/', { params })
      const data = res.data || {}
      setStudents(data.results || [])
      setMeta(data.meta || { page: 1, page_size: pageSize })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function createStudent(e) {
    e.preventDefault()
    if (!dept) return
    if (!form.username.trim() || !form.password) { notify({ type: 'error', message: 'Username and password required' }); return }
    try {
      const payload = { username: form.username.trim(), password: form.password, first_name: form.first_name, last_name: form.last_name, email: form.email, usn: form.usn, semester: Number(form.semester) || 1, section: form.section || 'A' }
      if (dept) payload.department_id = dept.id
      await api.post('students/', payload)
      setForm({ first_name: '', last_name: '', email: '', username: '', password: '', usn: '', semester: 1, section: 'A' })
      fetchStudents()
      notify({ type: 'success', message: 'Student created' })
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Create failed' })
    }
  }

  function startEdit(s) {
    setEditingId(s.id)
    setEditForm({ first_name: s.user?.first_name || s.first_name || '', last_name: s.user?.last_name || s.last_name || '', email: s.email || s.user?.email || '', semester: s.semester || 1, section: s.section || 'A' })
  }

  useEffect(() => {
    if (editingId) { setTimeout(() => { const el = document.getElementById(`edit-first-${editingId}`); if (el) el.focus() }, 0) }
  }, [editingId])

  async function saveEdit() {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) { notify({ type: 'error', message: 'First and last name required' }); return }
    if (editForm.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(editForm.email)) { notify({ type: 'error', message: 'Invalid email' }); return }
    try {
      const payload = { first_name: editForm.first_name, last_name: editForm.last_name, email: editForm.email, semester: Number(editForm.semester) || 1, section: editForm.section || 'A' }
      if (dept) payload.department_id = dept.id
      await api.put(`students/${editingId}/`, payload)
      setEditingId(null)
      fetchStudents()
      notify({ type: 'success', message: 'Student updated' })
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Update failed' })
    }
  }

  function confirmDelete(id) {
    setConfirmPayload({ type: 'student', id })
    setConfirmOpen(true)
  }

  async function handleConfirmDelete() {
    if (!confirmPayload) return
    try {
      if (confirmPayload.type === 'student') {
        await api.delete(`students/${confirmPayload.id}/`)
        notify({ type: 'success', message: 'Student deleted' })
      }
      setConfirmOpen(false)
      setConfirmPayload(null)
      fetchStudents()
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Delete failed' })
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Department Students{dept ? ` — ${dept.name}` : ''}</h2>
      <ConfirmModal open={confirmOpen} title="Delete student" message="Are you sure you want to delete this student?" onConfirm={handleConfirmDelete} onCancel={() => setConfirmOpen(false)} />

      {dept ? (
        <>
          <form onSubmit={createStudent} style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <input placeholder="USN" value={form.usn} onChange={(e) => setForm({ ...form, usn: e.target.value })} />
            <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{`Sem ${n}`}</option>)}
            </select>
            <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
              {['A','B','C','D','E','F','G'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" className="btn-icon btn-success">Create Student</button>
          </form>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="Search students" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading && <div>Loading...</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>First Name</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Last Name</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Username</th>
                <th style={{ textAlign: 'left', padding: 8 }}>USN</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Semester</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Section</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                editingId === s.id ? (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: 8 }}><input id={`edit-first-${s.id}`} value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} /></td>
                    <td style={{ padding: 8 }}><input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} /></td>
                    <td style={{ padding: 8 }}><input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></td>
                    <td style={{ padding: 8 }}>{s.user?.username || s.username}</td>
                    <td style={{ padding: 8 }}>{s.usn || ''}</td>
                    <td style={{ padding: 8 }}>
                      <select value={editForm.semester} onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })} style={{ width: 80 }}>
                        {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: 8 }}>
                      <select value={editForm.section} onChange={(e) => setEditForm({ ...editForm, section: e.target.value })} style={{ width: 80 }}>
                        {['A','B','C','D','E','F','G'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: 8 }}>
                      <button className="btn-icon" onClick={saveEdit} style={{ marginRight: 8 }}>Save</button>
                      <button className="btn-icon" onClick={() => setEditingId(null)}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: 8 }}>{s.user?.first_name || s.first_name}</td>
                    <td style={{ padding: 8 }}>{s.user?.last_name || s.last_name}</td>
                    <td style={{ padding: 8 }}>{s.email || s.user?.email}</td>
                    <td style={{ padding: 8 }}>{s.username || s.user?.username}</td>
                    <td style={{ padding: 8 }}>{s.usn || ''}</td>
                    <td style={{ padding: 8 }}>{s.semester || ''}</td>
                    <td style={{ padding: 8 }}>{s.section || ''}</td>
                    <td style={{ padding: 8 }}>
                      <button className="btn-icon" onClick={() => startEdit(s)} style={{ marginRight: 8 }}>Edit</button>
                      <button className="btn-icon btn-danger" onClick={() => confirmDelete(s.id)}>Delete</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.page <= 1}>Prev</button>
            <span style={{ margin: '0 8px' }}>Page {meta.page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={students.length < meta.page_size}>Next</button>
          </div>
        </>
      ) : (
        <div>No department assigned to your HOD account.</div>
      )}
    </div>
  )
}

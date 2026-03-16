import React, { useEffect, useState, useRef } from 'react'
import api from '../../lib/api'
import { notify } from '../../lib/toastService'
import ConfirmModal from '../../components/ConfirmModal'
import { useAuth } from '../../lib/auth'

export default function HodCourses() {
  const { user } = useAuth()
  const [dept, setDept] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [faculty, setFaculty] = useState([])
  const [form, setForm] = useState({ name: '', code: '', semester: 1, section: 'A', faculty_id: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', code: '', semester: 1, section: 'A', faculty_id: '', sections: [] })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState(null)
  const searchTimer = useRef(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchDept() }, [user])
  useEffect(() => { if (dept) { fetchSubjects(); fetchFaculty() } }, [dept])
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { if (dept) fetchSubjects() }, 420)
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

  async function fetchSubjects() {
    try {
      const params = { department: dept.code }
      if (search) params.search = search
      const res = await api.get('subjects/', { params })
      setSubjects(res.data.results || res.data || [])
    } catch (e) { console.error(e); notify({ type: 'error', message: 'Failed to load subjects' }) }
  }

  async function fetchFaculty() {
    try {
      const res = await api.get('faculty/', { params: { department: dept.code } })
      setFaculty(res.data.results || res.data || [])
    } catch (e) { console.error(e); notify({ type: 'error', message: 'Failed to load faculty' }) }
  }

  async function createSubject(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) { notify({ type: 'error', message: 'Name and code required' }); return }
    try {
      const payload = { name: form.name.trim(), code: form.code.trim(), semester: Number(form.semester) || 1 }
      if (dept) payload.department_id = dept.id
      const res = await api.post('subjects/', payload)
      // optionally assign faculty
      if (form.faculty_id) {
        try { await api.post('faculty-subjects/', { faculty_id: Number(form.faculty_id), subject_id: res.data.id, semester: Number(form.semester) || 1, section: form.section || 'A' }) } catch (e) { console.error('assign failed', e) }
      }
      setForm({ name: '', code: '', semester: 1, section: 'A', faculty_id: '' })
      fetchSubjects()
      notify({ type: 'success', message: 'Course created' })
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Create failed' })
    }
  }

  function startEdit(s) {
    setEditingId(s.id)
    setEditForm({
      name: s.name || '',
      code: s.code || '',
      semester: s.semester || 1,
      section: (s.assignments && s.assignments.length) ? s.assignments[0].section || 'A' : 'A',
      faculty_id: (s.assignments && s.assignments.length) ? String(s.assignments[0].faculty_id || '') : '',
      sections: (s.assignments || []).map(a => ({ id: a.id, section: a.section || 'A', faculty_id: a.faculty_id ? String(a.faculty_id) : '' }))
    })
  }

  async function saveEdit() {
    if (!editForm.name.trim() || !editForm.code.trim()) { notify({ type: 'error', message: 'Name and code required' }); return }
    try {
      await api.put(`subjects/${editingId}/`, { name: editForm.name.trim(), code: editForm.code.trim(), semester: Number(editForm.semester) || 1 })
      // synchronize sections/assignments
      if (Array.isArray(editForm.sections)) {
        for (const sec of editForm.sections) {
          try {
            if (sec.id) {
              // update existing assignment
              await api.put(`faculty-subjects/${sec.id}/`, { faculty_id: sec.faculty_id ? Number(sec.faculty_id) : null, section: sec.section || 'A', semester: Number(editForm.semester) || 1 })
            } else {
              // create new assignment
              // only create if faculty or section present
              await api.post('faculty-subjects/', { faculty_id: sec.faculty_id ? Number(sec.faculty_id) : null, subject_id: editingId, semester: Number(editForm.semester) || 1, section: sec.section || 'A' })
            }
          } catch (e) {
            console.error('sync assignment failed', e)
          }
        }
      }
      setEditingId(null)
      fetchSubjects()
      notify({ type: 'success', message: 'Course updated' })
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Update failed' })
    }
  }

  function confirmDelete(id) {
    setConfirmPayload({ type: 'subject', id })
    setConfirmOpen(true)
  }

  async function handleConfirmDelete() {
    if (!confirmPayload) return
    try {
      if (confirmPayload.type === 'subject') {
        await api.delete(`subjects/${confirmPayload.id}/`)
        notify({ type: 'success', message: 'Course deleted' })
      }
      setConfirmOpen(false)
      setConfirmPayload(null)
      fetchSubjects()
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: err?.response?.data?.error || 'Delete failed' })
    }
  }

  function addSectionRow() {
    setEditForm({ ...editForm, sections: [ ...(editForm.sections || []), { id: null, section: 'A', faculty_id: '' } ] })
  }

  async function removeSectionRow(index) {
    const sec = (editForm.sections || [])[index]
    if (!sec) return
    // optimistically remove
    setEditForm({ ...editForm, sections: editForm.sections.filter((_, i) => i !== index) })
    if (sec.id) {
      try {
        await api.delete(`faculty-subjects/${sec.id}/`)
        notify({ type: 'success', message: 'Section removed' })
      } catch (e) {
        console.error('delete assignment failed', e)
        notify({ type: 'error', message: 'Failed to remove section' })
        fetchSubjects()
      }
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <ConfirmModal open={confirmOpen} title="Delete course" message="Are you sure you want to delete this course?" onConfirm={handleConfirmDelete} onCancel={() => setConfirmOpen(false)} />
      <h2>Courses (Department)</h2>
      {dept ? <h4>{dept.name} ({dept.code})</h4> : <div>Loading department...</div>}

      <form onSubmit={createSubject} style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Course name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{`Sem ${n}`}</option>)}
        </select>
        <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
          {['A','B','C','D','E','F','G'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={form.faculty_id} onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}>
          <option value="">Assign faculty (optional)</option>
          {faculty.map(f => <option key={f.id} value={f.id}>{f.first_name || f.user?.first_name} {f.last_name || f.user?.last_name} ({f.user?.username || f.username})</option>)}
        </select>
        <button type="submit" className="btn-icon btn-success">Create Course</button>
      </form>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input placeholder="Search courses" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Code</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Semester</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Section</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Assigned Faculty</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map(s => (
            editingId === s.id ? (
              <tr key={s.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: 8 }}><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></td>
                <td style={{ padding: 8 }}><input value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value })} /></td>
                <td style={{ padding: 8 }}>
                  <select value={editForm.semester} onChange={e => setEditForm({ ...editForm, semester: e.target.value })} style={{ width: 120 }}>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{`Sem ${n}`}</option>)}
                  </select>
                </td>
                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  {(editForm.sections && editForm.sections.length) ? editForm.sections.map((sec, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <select value={sec.section} onChange={e => setEditForm({ ...editForm, sections: editForm.sections.map((s,i) => i === idx ? { ...s, section: e.target.value } : s) })} style={{ width: 80 }}>
                        {['A','B','C','D','E','F','G'].map(sx => <option key={sx} value={sx}>{sx}</option>)}
                      </select>
                      <button className="btn-icon btn-danger" onClick={() => removeSectionRow(idx)} style={{ padding: '4px 8px' }}>Delete</button>
                    </div>
                  )) : <div style={{ color: '#666' }}>No sections</div>}
                  <div>
                    <button className="btn-icon btn-success" onClick={addSectionRow} style={{ marginTop: 6 }}>Add section</button>
                  </div>
                </td>
                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  {(editForm.sections && editForm.sections.length) ? editForm.sections.map((sec, idx) => (
                    <div key={idx} style={{ marginBottom: 6 }}>
                      <select value={sec.faculty_id} onChange={e => setEditForm({ ...editForm, sections: editForm.sections.map((s,i) => i === idx ? { ...s, faculty_id: e.target.value } : s) })} style={{ minWidth: 200 }}>
                        <option value="">(none)</option>
                        {faculty.map(f => <option key={f.id} value={f.id}>{f.first_name || f.user?.first_name} {f.last_name || f.user?.last_name} ({f.user?.username || f.username})</option>)}
                      </select>
                    </div>
                  )) : <div style={{ color: '#666' }}>(no faculty)</div>}
                </td>
                <td style={{ padding: 8 }}>
                  <button className="btn-icon" onClick={saveEdit} style={{ marginRight: 8 }}>Save</button>
                  <button className="btn-icon" onClick={() => setEditingId(null)}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={s.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: 8 }}>{s.name}</td>
                <td style={{ padding: 8 }}>{s.code}</td>
                <td style={{ padding: 8 }}>{s.semester || ''}</td>
                <td style={{ padding: 8 }}>{(s.assignments && s.assignments.length) ? Array.from(new Set(s.assignments.map(a => a.section))).join(', ') : '—'}</td>
                <td style={{ padding: 8 }}>{(s.assignments && s.assignments.length) ? Array.from(new Set(s.assignments.map(a => a.faculty_username || a.faculty_id))).join(', ') : '—'}</td>
                <td style={{ padding: 8 }}>
                  <button className="btn-icon" onClick={() => startEdit(s)} style={{ marginRight: 8 }}>Edit</button>
                  <button className="btn-icon btn-danger" onClick={() => confirmDelete(s.id)}>Delete</button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>

      
    </div>
  )
}

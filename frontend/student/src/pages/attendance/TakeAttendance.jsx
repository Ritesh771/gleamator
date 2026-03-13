import React, { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function TakeAttendance() {
  const [subjects, setSubjects] = useState([])
  const [selected, setSelected] = useState(null)
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSubjects()
  }, [])

  async function fetchSubjects() {
    setLoading(true)
    try {
      const res = await api.get('faculty-subjects/')
      setSubjects(res.data.results || res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function selectSubject(s) {
    setSelected(s)
    setStudents([])
    setRecords({})
    setLoading(true)
    try {
      // try to fetch by department if available
      const params = {}
      if (s.department && s.department.code) params.department = s.department.code
      const res = await api.get('students/', { params })
      const list = res.data.results || res.data
      setStudents(list)
      const init = {}
      list.forEach((st) => { init[st.id] = true })
      setRecords(init)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function toggle(id) {
    setRecords((r) => ({ ...r, [id]: !r[id] }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    try {
      const payload = {
        subject_id: selected.subject.id || selected.subject_id || selected.id,
        records: students.map((s) => ({ student_id: s.id, present: !!records[s.id] })),
      }
      await api.post('attendance/take/', payload)
      alert('Attendance saved')
    } catch (err) {
      console.error(err)
      alert('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Take Attendance</h2>
      {loading && <div>Loading...</div>}
      <div>
        <label>Subject</label>
        <select onChange={(e) => selectSubject(JSON.parse(e.target.value))}>
          <option value="">-- select --</option>
          {subjects.map((fs) => (
            <option key={fs.id} value={JSON.stringify(fs)}>{fs.subject?.name || fs.subject_name || fs.id}</option>
          ))}
        </select>
      </div>
      {selected && (
        <form onSubmit={submit}>
          <h3>Students ({students.length})</h3>
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Present</th></tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id}>
                  <td>{i+1}</td>
                  <td>{s.first_name ? `${s.first_name} ${s.last_name || ''}` : s.name || s.username}</td>
                  <td><input type="checkbox" checked={!!records[s.id]} onChange={() => toggle(s.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Attendance'}</button>
        </form>
      )}
    </div>
  )
}

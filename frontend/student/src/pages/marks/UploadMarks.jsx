import React, { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function UploadMarks() {
  const [subjects, setSubjects] = useState([])
  const [selected, setSelected] = useState(null)
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSubjects() }, [])

  async function fetchSubjects() {
    try {
      const res = await api.get('faculty-subjects/')
      setSubjects(res.data.results || res.data)
    } catch (e) { console.error(e) }
  }

  async function selectSubject(s) {
    setSelected(s)
    try {
      const params = {}
      if (s.department && s.department.code) params.department = s.department.code
      const res = await api.get('students/', { params })
      const list = res.data.results || res.data
      setStudents(list)
      const init = {}
      list.forEach((st) => { init[st.id] = { obtained: '', max: '' } })
      setMarks(init)
    } catch (e) { console.error(e) }
  }

  function setMark(id, field, value) {
    setMarks((m) => ({ ...m, [id]: { ...m[id], [field]: value } }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    try {
      const payload = {
        subject_id: selected.subject.id || selected.subject_id || selected.id,
        marks: students.map((s) => ({ student_id: s.id, marks_obtained: Number(marks[s.id]?.obtained) || 0 })),
      }
      await api.post('marks/upload/', payload)
      alert('Marks uploaded')
    } catch (err) {
      console.error(err)
      alert('Failed to upload marks')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Upload Marks</h2>
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
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Marks Obtained</th></tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id}>
                  <td>{i+1}</td>
                  <td>{s.first_name ? `${s.first_name} ${s.last_name || ''}` : s.name || s.username}</td>
                  <td>
                    <input type="number" value={marks[s.id]?.obtained || ''} onChange={(e) => setMark(s.id, 'obtained', e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="submit" disabled={saving}>{saving ? 'Uploading...' : 'Upload Marks'}</button>
        </form>
      )}
    </div>
  )
}

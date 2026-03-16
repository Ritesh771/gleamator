import React, { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function TakeAttendance() {
  const [assignments, setAssignments] = useState([]) // faculty-subject assignments
  const [subjectsMap, setSubjectsMap] = useState({}) // subject_id -> { name, semester, department_code, sections: [] }
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAssignments() }, [])

  async function fetchAssignments() {
    setLoading(true)
    try {
      const res = await api.get('faculty-subjects/')
      const list = res.data.results || res.data || []
      setAssignments(list)
      // build subject map
      const map = {}
      list.forEach(a => {
        const sid = a.subject_id
        if (!map[sid]) map[sid] = { id: sid, name: a.subject, semester: a.semester, department_code: a.department_code, sections: [] }
        if (!map[sid].sections.includes(a.section)) map[sid].sections.push(a.section)
      })
      setSubjectsMap(map)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function onSelectSubject(subjectId) {
    setSelectedSubjectId(subjectId)
    const subj = subjectsMap[subjectId]
    const section = (subj && subj.sections && subj.sections[0]) || null
    setSelectedSection(section)
    if (section) await fetchStudentsFor(subj.department_code, subj.semester, section)
    else setStudents([])
  }

  async function onSelectSection(section) {
    setSelectedSection(section)
    const subj = subjectsMap[selectedSubjectId]
    if (subj) await fetchStudentsFor(subj.department_code, subj.semester, section)
  }

  async function fetchStudentsFor(departmentCode, semester, section) {
    setLoading(true)
    try {
      const params = { semester }
      if (section) params.section = section
      if (departmentCode) params.department = departmentCode
      const res = await api.get('students/', { params })
      const list = res.data.results || res.data || []
      setStudents(list)
      const init = {}
      list.forEach((st) => { init[st.id] = true })
      setRecords(init)
    } catch (e) {
      console.error(e)
      setStudents([])
      setRecords({})
    } finally {
      setLoading(false)
    }
  }

  function toggle(id) { setRecords((r) => ({ ...r, [id]: !r[id] })) }

  async function submit(e) {
    e.preventDefault()
    if (!selectedSubjectId || !selectedSection) return
    setSaving(true)
    try {
      const subj = subjectsMap[selectedSubjectId]
      const payload = {
        subject_id: Number(selectedSubjectId),
        semester: Number(subj.semester || 0),
        section: selectedSection,
        records: students.map((s) => ({ student_id: s.id, status: records[s.id] ? 'P' : 'A' }))
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

      <div style={{ marginBottom: 12 }}>
        <label>Subject</label>
        <select value={selectedSubjectId || ''} onChange={(e) => onSelectSubject(e.target.value)}>
          <option value="">-- select --</option>
          {Object.values(subjectsMap).map(s => <option key={s.id} value={s.id}>{s.name} (Sem {s.semester})</option>)}
        </select>
      </div>

      {selectedSubjectId && (
        <div style={{ marginBottom: 12 }}>
          <label>Section</label>
          <select value={selectedSection || ''} onChange={(e) => onSelectSection(e.target.value)}>
            <option value="">-- select --</option>
            {(subjectsMap[selectedSubjectId]?.sections || []).map(sec => <option key={sec} value={sec}>{sec}</option>)}
          </select>
        </div>
      )}

      {selectedSubjectId && selectedSection && (
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

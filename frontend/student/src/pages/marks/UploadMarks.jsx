import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { notify } from '../../lib/toastService'

export default function UploadMarks() {
  const [assignments, setAssignments] = useState([])
  const [subjectsMap, setSubjectsMap] = useState({})
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAssignments() }, [])

  async function fetchAssignments() {
    try {
      const res = await api.get('faculty-subjects/')
      const list = res.data.results || res.data || []
      setAssignments(list)
      const map = {}
      list.forEach(a => {
        const sid = a.subject_id
        if (!map[sid]) map[sid] = { id: sid, name: a.subject, semester: a.semester, department_code: a.department_code, sections: [] }
        if (!map[sid].sections.includes(a.section)) map[sid].sections.push(a.section)
      })
      setSubjectsMap(map)
    } catch (e) { console.error(e) }
  }

  async function onSelectSubject(subjectId) {
    setSelectedSubjectId(subjectId)
    const subj = subjectsMap[subjectId]
    const section = (subj && subj.sections && subj.sections[0]) || null
    setSelectedSection(section)
    if (section) await fetchStudentsFor(subj.department_code, subj.semester, section, Number(subjectId))
    else setStudents([])
  }

  async function onSelectSection(section) {
    setSelectedSection(section)
    const subj = subjectsMap[selectedSubjectId]
    if (subj) await fetchStudentsFor(subj.department_code, subj.semester, section, Number(selectedSubjectId))
  }

  async function fetchStudentsFor(departmentCode, semester, section, subjectIdParam) {
    try {
      const params = { semester }
      if (section) params.section = section
      if (departmentCode) params.department = departmentCode
      const res = await api.get('students/', { params })
      const list = res.data.results || res.data || []
      setStudents(list)
      const init = {}
      list.forEach((st) => { init[st.id] = { obtained: '', max: '' } })
      setMarks(init)
      // fetch existing marks for this subject for each student
      try {
        const subjectId = Number(subjectIdParam || selectedSubjectId)
        if (subjectId) {
          const markPromises = list.map(st => api.get(`marks/student/${st.id}/`).then(r => ({ id: st.id, marks: r.data.marks || [] })).catch(() => ({ id: st.id, marks: [] })))
          const results = await Promise.all(markPromises)
          const updated = { ...init }
          results.forEach(resItem => {
            const rec = resItem.marks.find(m => Number(m.subject_id) === subjectId)
            if (rec) updated[resItem.id] = { obtained: rec.marks, max: rec.max }
          })
          setMarks(updated)
        }
      } catch (e) {
        console.error('failed to load existing marks', e)
      }
    } catch (e) { console.error(e); setStudents([]); setMarks({}) }
  }

  function setMark(id, field, value) { setMarks((m) => ({ ...m, [id]: { ...m[id], [field]: value } })) }

  async function submit(e) {
    e.preventDefault()
    if (!selectedSubjectId || !selectedSection) return
    setSaving(true)
    try {
      const subj = subjectsMap[selectedSubjectId]
      // send marks per student (backend expects single mark per request)
      const promises = students.map(s => {
        const obtained = Number(marks[s.id]?.obtained) || 0
        const max = Number(marks[s.id]?.max) || 100
        return api.post('marks/upload/', { subject_id: Number(selectedSubjectId), student_id: s.id, marks_obtained: obtained, max_marks: max })
      })
      await Promise.all(promises)
      notify({ type: 'success', message: 'Marks uploaded' })
    } catch (err) {
      console.error(err)
      notify({ type: 'error', message: 'Failed to upload marks' })
    } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Upload Marks</h2>
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
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Marks Obtained</th><th>Max Marks</th></tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id}>
                  <td>{i+1}</td>
                  <td>{s.first_name ? `${s.first_name} ${s.last_name || ''}` : s.name || s.username}</td>
                  <td>
                    <input type="number" value={marks[s.id]?.obtained || ''} onChange={(e) => setMark(s.id, 'obtained', e.target.value)} />
                  </td>
                  <td>
                    <input type="number" value={marks[s.id]?.max || ''} onChange={(e) => setMark(s.id, 'max', e.target.value)} placeholder="100" />
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

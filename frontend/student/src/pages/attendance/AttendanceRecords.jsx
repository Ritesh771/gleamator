import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import { notify } from '../../lib/toastService'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function AttendanceRecords() {
  const [records, setRecords] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [studentsMap, setStudentsMap] = useState({})
  const [loadingStudents, setLoadingStudents] = useState(false)
  const query = useQuery()
  const subjectId = query.get('subject_id')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const q = subjectId ? `?subject_id=${subjectId}` : ''
        const res = await api.get(`attendance/records/${q}`)
        if (!mounted) return
        setRecords(res.data.results || [])
      } catch (e) {
        console.error(e)
        notify({ type: 'error', message: 'Failed to load attendance records' })
      }
    }
    load()
    return () => { mounted = false }
  }, [subjectId])

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h2>Attendance Records</h2>
        {subjectId && <div style={{ color: '#6b7280', marginBottom: 8 }}>Filtered by subject: {subjectId}</div>}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: 8 }}>Date</th>
              <th style={{ padding: 8 }}>Subject</th>
              <th style={{ padding: 8 }}>Present</th>
              <th style={{ padding: 8 }}>Absent</th>
              <th style={{ padding: 8 }}>View</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 12, color: '#6b7280' }}>No records found</td>
              </tr>
            )}
            {records.map(r => (
              <React.Fragment key={r.session_id}>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: 8 }}>{r.date}</td>
                  <td style={{ padding: 8 }}>{r.subject}</td>
                  <td style={{ padding: 8 }}>{r.present}</td>
                  <td style={{ padding: 8 }}>{(r.total != null && r.present != null) ? (r.total - r.present) : ''}</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={async () => {
                      const sid = r.session_id
                      if (expanded === sid) { setExpanded(null); return }
                      setLoadingStudents(true)
                      try {
                        const res = await api.get(`attendance/session/${sid}/students/`)
                        setStudentsMap(prev => ({ ...prev, [sid]: res.data || {} }))
                        setExpanded(sid)
                      } catch (e) {
                        console.error(e)
                        notify({ type: 'error', message: 'Failed to load students' })
                      } finally {
                        setLoadingStudents(false)
                      }
                    }}>View students</button>
                  </td>
                </tr>
                {expanded === r.session_id && (
                  <tr>
                    <td colSpan={5} style={{ padding: 12, background: '#f9fafb' }}>
                      {loadingStudents && <div>Loading students...</div>}
                      {!loadingStudents && (
                        <div style={{ display: 'flex', gap: 24 }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>Present ({(studentsMap[r.session_id] && studentsMap[r.session_id].present ? studentsMap[r.session_id].present.length : 0)})</div>
                            <ul>
                              {(studentsMap[r.session_id] && studentsMap[r.session_id].present ? studentsMap[r.session_id].present : []).map(s => (
                                <li key={s.student_id}>{s.usn ? `${s.usn} - ` : ''}{s.name}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>Absent ({(studentsMap[r.session_id] && studentsMap[r.session_id].absent ? studentsMap[r.session_id].absent.length : 0)})</div>
                            <ul>
                              {(studentsMap[r.session_id] && studentsMap[r.session_id].absent ? studentsMap[r.session_id].absent : []).map(s => (
                                <li key={s.student_id}>{s.usn ? `${s.usn} - ` : ''}{s.name}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

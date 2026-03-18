import React, { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import api from '../../lib/api'
import Alert from '../../components/Alert'
import { Link } from 'react-router-dom'
import StatsCard from '../../components/StatsCard'

export default function StudentProfile() {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [marks, setMarks] = useState([])
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [aRes, mRes, sRes] = await Promise.all([
        api.get(`attendance/student/${user.id}/`),
        api.get(`marks/student/${user.id}/`),
        api.get(`students/${user.id}/`).catch(() => ({ data: null }))
      ])
      setAttendance((aRes.data && (aRes.data.attendance || aRes.data.results)) || [])
      setMarks((mRes.data && (mRes.data.marks || mRes.data.results)) || [])
      setStudent((sRes && sRes.data) || null)
    } catch (e) {
      console.error(e)
      setError('Failed to load profile data')
    } finally { setLoading(false) }
  }

  if (!user) return <div style={{ padding: 24 }}>Not logged in</div>

  // computed stats
  const total = attendance.length
  const present = attendance.filter(a => a.present).length
  const attendancePct = total ? Math.round((present / total) * 100) : null
  const marksAvgPct = marks.length ? Math.round((marks.reduce((s, m) => {
    const got = Number(m.marks_obtained || 0)
    const max = Number(m.max_marks || (m.total_marks || 0)) || 0
    return s + (max ? (got / max) * 100 : 0)
  }, 0) / marks.length)) : null

  const attSpark = attendance.slice(-10).map(a => (a.attendance_percent != null ? a.attendance_percent : (a.present ? 100 : 0)))
  const marksSpark = marks.slice(-10).map(m => {
    const got = Number(m.marks_obtained || 0)
    const max = Number(m.max_marks || (m.total_marks || 100)) || 100
    return max ? Math.round((got / max) * 100) : 0
  })

  const initials = (student && (student.first_name || student.username) || user.username || 'U').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 18 }}>
        <div style={{ width: 96, height: 96, borderRadius: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 600 }}>
          {student && student.avatar_url ? (
            <img src={student.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
          ) : (
            <div style={{ width: 76, height: 76, borderRadius: 12, background: '#7c3aed', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials}</div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{student?.full_name || student?.username || user.username}</h2>
          <div style={{ color: '#6b7280', marginTop: 4 }}>{student?.department_name || student?.department || ''} • {user.role}</div>
          <div style={{ marginTop: 10 }}>
            <Link to="/student/attendance">View Attendance</Link> | <Link to="/student/marks">View Marks</Link>
          </div>
        </div>

        <div style={{ width: 320 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <StatsCard title="Attendance" value={attendancePct != null ? `${attendancePct}%` : '—'} meta={total ? `of ${total} sessions` : ''} spark={attSpark} />
            </div>
            <div style={{ flex: 1 }}>
              <StatsCard title="Average Marks" value={marksAvgPct != null ? `${marksAvgPct}%` : '—'} meta={marks.length ? `${marks.length} exams` : ''} spark={marksSpark} />
            </div>
          </div>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {loading && <div>Loading...</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20 }}>
        <div>
          <section style={{ background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginTop: 0 }}>Attendance Records</h3>
            {attendance.length === 0 ? <div>No attendance records</div> : (
                <div className="table-wrap">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#374151' }}><th style={{ padding: '8px 6px' }}>Date</th><th style={{ padding: '8px 6px' }}>Subject</th><th style={{ padding: '8px 6px' }}>Present</th></tr>
                    </thead>
                    <tbody>
                      {attendance.map((r) => (
                        <tr key={r.id} style={{ borderTop: '1px solid #eef2f7' }}>
                          <td style={{ padding: '8px 6px' }}>{new Date(r.session_date || r.created_at || r.date).toLocaleString()}</td>
                          <td style={{ padding: '8px 6px' }}>{r.subject_name || r.subject?.name}</td>
                          <td style={{ padding: '8px 6px' }}>{r.present ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </section>

          <section style={{ marginTop: 16, background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginTop: 0 }}>Marks</h3>
            {marks.length === 0 ? <div>No marks available</div> : (
              <div className="table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#374151' }}><th style={{ padding: '8px 6px' }}>Subject</th><th style={{ padding: '8px 6px' }}>Marks</th><th style={{ padding: '8px 6px' }}>Max</th><th style={{ padding: '8px 6px' }}>%</th></tr>
                  </thead>
                  <tbody>
                    {marks.map((m) => {
                      const got = Number(m.marks_obtained || 0)
                      const max = Number(m.max_marks || (m.total_marks || ''))
                      const pct = max ? Math.round((got / max) * 100) : ''
                      return (
                        <tr key={m.id} style={{ borderTop: '1px solid #eef2f7' }}>
                          <td style={{ padding: '8px 6px' }}>{m.subject_name || m.subject?.name}</td>
                          <td style={{ padding: '8px 6px' }}>{m.marks_obtained}</td>
                          <td style={{ padding: '8px 6px' }}>{max || ''}</td>
                          <td style={{ padding: '8px 6px' }}>{pct !== '' ? `${pct}%` : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div>
          <section style={{ background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginTop: 0 }}>Quick Info</h3>
            <div style={{ color: '#6b7280' }}>Username</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{user.username}</div>
            <div style={{ color: '#6b7280' }}>Role</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{user.role}</div>
            {student && (
              <>
                <div style={{ color: '#6b7280' }}>Credits</div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{student.credits ?? '—'}</div>
                <div style={{ color: '#6b7280' }}>Department</div>
                <div style={{ fontWeight: 600 }}>{student.department_name || student.department || '—'}</div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

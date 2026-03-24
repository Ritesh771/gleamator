import React, { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import api from '../../lib/api'
import StatsCard from '../../components/StatsCard'
import Alert from '../../components/Alert'

export default function StudentAttendance() {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { if (user) fetchAttendance() }, [user])

  async function fetchAttendance() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`attendance/student/${user.id}/`)
      const list = (res.data && (res.data.attendance || res.data.results)) || []
      setAttendance(list)
    } catch (e) {
      console.error('load attendance failed', e)
      setError('Failed to load attendance')
    } finally { setLoading(false) }
  }

  const total = attendance.length
  const present = attendance.filter(a => a.present).length
  const percent = total ? Math.round((present / total) * 100) : null
  const spark = attendance.slice(-12).map(a => a.attendance_percent != null ? a.attendance_percent : (a.present ? 100 : 0))

  return (
    <div className="page-full" style={{ padding: 24 }}>
      <h2>My Attendance</h2>
      {error && <Alert>{error}</Alert>}
      {loading && <div>Loading...</div>}

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <StatsCard title="Attendance" value={percent != null ? `${percent}%` : '—'} meta={total ? `of ${total} sessions` : ''} spark={spark} />
        <StatsCard title="Present" value={String(present)} meta="Sessions present" />
        <StatsCard title="Absent" value={String(total - present)} meta="Sessions absent" />
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <h3>Records</h3>
          {attendance.length === 0 ? (
          <div>No attendance records found.</div>
        ) : (
          <div className="table-wrap" style={{ display: 'block' }}>
            <table>
              <thead>
                <tr><th>Date</th><th>Subject</th><th>Present</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {attendance.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.session_date || r.created_at || r.date).toLocaleString()}</td>
                    <td>{r.subject_name || (r.subject && r.subject.name) || ''}</td>
                    <td>{r.present ? 'Yes' : 'No'}</td>
                    <td>{r.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

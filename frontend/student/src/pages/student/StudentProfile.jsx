import React, { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import api from '../../lib/api'
import Alert from '../../components/Alert'
import { Link } from 'react-router-dom'

export default function StudentProfile() {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [marks, setMarks] = useState([])
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
      const [aRes, mRes] = await Promise.all([
        api.get(`attendance/student/${user.id}/`),
        api.get(`marks/student/${user.id}/`),
      ])
      setAttendance(aRes.data.results || aRes.data || [])
      setMarks(mRes.data.results || mRes.data || [])
    } catch (e) {
      setError('Failed to load profile data')
    } finally { setLoading(false) }
  }

  if (!user) return <div style={{ padding: 24 }}>Not logged in</div>

  return (
    <div style={{ padding: 24 }}>
      <h2>My Profile</h2>
      <div>Username: {user.username}</div>
      <div>Role: {user.role}</div>
      <div style={{ marginTop: 12 }}>
        <Link to="/student/attendance">View Attendance</Link> | <Link to="/student/marks">View Marks</Link>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading && <div>Loading...</div>}

      <section>
        <h3>Attendance Records</h3>
        {attendance.length === 0 ? <div>No attendance records</div> : (
          <table>
            <thead><tr><th>Date</th><th>Subject</th><th>Present</th></tr></thead>
            <tbody>
              {attendance.map((r) => (
                <tr key={r.id}><td>{new Date(r.session_date || r.created_at || r.date).toLocaleString()}</td><td>{r.subject_name || r.subject?.name}</td><td>{r.present ? 'Yes' : 'No'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Marks</h3>
        {marks.length === 0 ? <div>No marks available</div> : (
          <table>
            <thead><tr><th>Subject</th><th>Marks</th><th>Max</th></tr></thead>
            <tbody>
              {marks.map((m) => (
                <tr key={m.id}><td>{m.subject_name || m.subject?.name}</td><td>{m.marks_obtained}</td><td>{m.max_marks || ''}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

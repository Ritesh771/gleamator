import React, { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'
import LineChart from '../../components/LineChart'
import BarChart from '../../components/BarChart'
import api from '../../lib/api'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState([])
  const [student, setStudent] = useState(null)
  const [attendanceSeries, setAttendanceSeries] = useState([])
  const [marksSeries, setMarksSeries] = useState([])

  useEffect(() => { if (user) loadSummary() }, [user])

  async function loadSummary() {
    setLoading(true)
    try {
      const [profRes, attRes, marksRes] = await Promise.all([
        api.get(`students/${user.id}/`).catch(() => ({ data: null })),
        api.get(`attendance/student/${user.id}/`).catch(() => ({ data: null })),
        api.get(`marks/student/${user.id}/`).catch(() => ({ data: null }))
      ])

      const studentData = (profRes && profRes.data) || null
      const attendance = (attRes && (attRes.data && (attRes.data.attendance || attRes.data.results))) || []
      const marks = (marksRes && (marksRes.data && (marksRes.data.marks || marksRes.data.results))) || []

      setStudent(studentData)

      // attendance stats
      const vals = attendance.map(a => (a.attendance_percent != null ? a.attendance_percent : (a.present ? 100 : 0)))
      const avgAtt = vals.length ? Math.round(vals.reduce((a,b) => a+b, 0) / vals.length) : null

      // marks avg
      const avgMarks = marks.length ? Math.round(marks.reduce((s, m) => {
        const got = Number(m.marks_obtained || 0)
        const max = Number(m.max_marks || (m.total_marks || 100)) || 100
        return s + (max ? (got / max) * 100 : 0)
      }, 0) / marks.length) : null

      setStats([
        { title: 'Attendance', value: avgAtt != null ? `${avgAtt}%` : '—', meta: 'This semester', spark: vals.slice(-8), chartType: 'circle', chartValue: avgAtt || 0 },
        { title: 'Average Marks', value: avgMarks != null ? `${avgMarks}%` : '—', meta: marks.length ? `${marks.length} exams` : '', chartType: 'circle', chartValue: avgMarks || 0 },
        { title: 'Credits', value: studentData && studentData.credits != null ? String(studentData.credits) : '—', meta: 'Total credits' }
      ])

      // prepare line chart data for attendance (last 8)
      const attSeries = attendance.slice(-8).map(a => ({ label: (a.session_date || a.date || a.created_at || '').slice(0,10) || '', value: a.attendance_percent != null ? a.attendance_percent : (a.present ? 100 : 0) }))
      setAttendanceSeries(attSeries)

      // prepare bar chart for most recent marks by subject
      const marksBySubject = marks.slice(-8).map(m => {
        const got = Number(m.marks_obtained || 0)
        const max = Number(m.max_marks || (m.total_marks || 100)) || 100
        return { label: (m.subject_name || (m.subject && m.subject.name) || 'Exam').slice(0,18), value: Math.round(max ? (got / max) * 100 : 0) }
      })
      setMarksSeries(marksBySubject)

    } catch (e) {
      console.error('failed to load student summary', e)
    } finally { setLoading(false) }
  }

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Student Dashboard</h2>
            <div style={{ color: '#6b7280' }}>{student?.department_name || student?.department || ''} • {student?.current_semester ? `Sem ${student.current_semester}` : ''} {student?.section ? `• Sec ${student.section}` : ''}</div>
          </div>
        </div>

        {loading && <div>Loading...</div>}

        <div className="stats-grid" style={{ marginTop: 12 }}>
          {stats.map(s => <StatsCard key={s.title} {...s} className="hod-card" />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: 20, marginTop: 20 }}>
          <div style={{ background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginTop: 0 }}>Attendance Trend</h3>
            <LineChart data={attendanceSeries} width={680} height={200} />
            <p style={{ color: '#6b7280' }}>Recent attendance percentages by session.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'white', padding: 12, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <h4 style={{ marginTop: 0 }}>Recent Marks</h4>
              <BarChart data={marksSeries} width={420} height={160} />
            </div>

            <div style={{ background: 'white', padding: 12, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <h4 style={{ marginTop: 0 }}>Quick Links</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to="/student/attendance" style={{ textDecoration: 'none' }}>
                  <button style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e9ef', background: '#7c3aed', color: '#fff', cursor: 'pointer' }}>View Attendance</button>
                </Link>
                <Link to="/student/marks" style={{ textDecoration: 'none' }}>
                  <button style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e9ef', background: '#06b6d4', color: '#fff', cursor: 'pointer' }}>View Marks</button>
                </Link>
                <Link to="/student/profile" style={{ textDecoration: 'none' }}>
                  <button style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e9ef', background: '#f59e0b', color: '#fff', cursor: 'pointer' }}>Profile</button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <p style={{ marginTop: 12, color: '#6b7280' }}>View your attendance and marks using the sidebar links.</p>
      </div>
    </Layout>
  )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'
import BarChart from '../../components/BarChart'
import api from '../../lib/api'
import { notify } from '../../lib/toastService'

export default function FacultyDashboard() {
  const [stats, setStats] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [trends, setTrends] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [dashRes, subjRes, trendsRes] = await Promise.all([
          api.get('faculty/dashboard/'),
          api.get('faculty-subjects/'),
          api.get('faculty/attendance/trends/'),
        ])
        if (!mounted) return
        setStats([
          { title: 'Classes Today', value: String(dashRes.data.classes_today || 0), meta: 'Scheduled' },
          { title: 'Pending Attendance', value: String(dashRes.data.pending_attendance || 0), meta: 'Needs submission' }
        ])
        setSubjects(subjRes.data || [])
        setTrends((trendsRes.data && trendsRes.data.trends) || [])
      } catch (e) {
        console.error(e)
        notify({ type: 'error', message: 'Failed to load dashboard' })
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h2>Faculty Dashboard</h2>
        <div className="stats-grid">
          {(stats || [{ title: 'Classes Today', value: '—', meta: '' }, { title: 'Pending Attendance', value: '—', meta: '' }]).map(s => <StatsCard key={s.title} {...s} />)}
        </div>

        <div style={{ marginTop: 18 }}>
          <h3>Attendance Trends (last 7 days)</h3>
          {trends && trends.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              <BarChart data={trends} width={520} height={160} />
            </div>
          ) : (
            <div style={{ color: '#6b7280' }}>No attendance data yet</div>
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <h3>Assigned Subjects</h3>
          <div className="subjects-grid" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {subjects && subjects.length > 0 ? subjects.map(s => (
              <div key={s.id} className="subject-card" style={{ border: '1px solid #e5e7eb', padding: 12, borderRadius: 8, minWidth: 180 }}>
                <div style={{ fontWeight: 600 }}>{s.subject}</div>
                <div style={{ color: '#6b7280', fontSize: 13 }}>{s.department_code || ''} • Sem {s.semester || ''} • {s.section || ''}</div>
                <div style={{ marginTop: 8 }}><Link to={`/attendance/records?subject_id=${s.subject_id}`}>View Records</Link></div>
              </div>
            )) : <div style={{ color: '#6b7280' }}>No subjects assigned</div>}
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/attendance/take" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e9ef', background: '#7c3aed', color: '#fff', cursor: 'pointer' }}>Take Attendance</button>
          </Link>
          <Link to="/marks/upload" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e9ef', background: '#06b6d4', color: '#fff', cursor: 'pointer' }}>Upload Marks</button>
          </Link>
          <Link to="/students" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e9ef', background: '#f59e0b', color: '#fff', cursor: 'pointer' }}>My Students</button>
          </Link>
        </div>
      </div>
    </Layout>
  )
}

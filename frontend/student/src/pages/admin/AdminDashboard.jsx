import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'
import api from '../../lib/api'

function AnimatedNumber({ value, duration = 800, format = v => v }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = null
    const from = 0
    const to = Number(String(value).replace(/,/g, '')) || 0
    function step(ts) {
      if (!start) start = ts
      const t = Math.min(1, (ts - start) / duration)
      const cur = Math.round(from + (to - from) * t)
      setDisplay(cur)
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value, duration])
  return <>{format(display)}</>
}

export default function AdminDashboard() {
  const [adminStats, setAdminStats] = useState(null)
  const [overview, setOverview] = useState(null)
  const [deptStats, setDeptStats] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [aRes, oRes, dRes] = await Promise.all([
          api.get('/stats/admin/'),
          api.get('/stats/overview/'),
          api.get('/departments/'),
        ])
        if (!mounted) return
        setAdminStats(aRes.data)
        setOverview(oRes.data)
        const depts = dRes.data || []
        // fetch per-department stats in parallel but limit to first 8 for performance
        const slice = depts.slice(0, 8)
        const deptCalls = slice.map(d => api.get(`/stats/department/${d.code}/`).then(r => ({ ...r.data, code: d.code })))
        const deptResults = await Promise.allSettled(deptCalls)
        const mapped = deptResults.map((r, i) => {
          if (r.status === 'fulfilled') return { id: slice[i].id, name: slice[i].name, code: slice[i].code, ...r.value }
          return { id: slice[i].id, name: slice[i].name, code: slice[i].code }
        })
        setDeptStats(mapped)
      } catch (e) {
        console.error('dashboard load error', e)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const stats = adminStats ? [
    { title: 'Total Users', value: adminStats.total_users, meta: `${adminStats.admins} admins • ${adminStats.faculty} faculty • ${adminStats.students} students`, variant: 'purple', spark: [5,8,12,9,14,16,18] },
    { title: 'Departments', value: adminStats.departments, meta: 'Active departments', variant: 'green', spark: [1,1,2,2,2,3,1] },
    { title: 'Faculty', value: adminStats.faculty, meta: 'Total faculty', variant: 'blue', spark: [2,3,3,4,5,4,6] },
    { title: 'Students', value: adminStats.students, meta: 'Total students', variant: 'orange', spark: [8,9,11,10,14,13,15] },
  ] : []

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h2>Admin Dashboard</h2>

        <div className="stats-grid">
          {stats.length === 0 && (
            <div className="card">Loading stats…</div>
          )}
          {stats.map((s, i) => (
            <StatsCard key={s.title} title={s.title} value={<AnimatedNumber value={s.value} format={v => v.toLocaleString()} />} meta={s.meta} variant={s.variant} spark={s.spark} />
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <h3>Quick Actions</h3>
          <div className="admin-tools-grid">
            <Link to="/students" className="admin-tool-card">
              <div className="tool-icon">👥</div>
              <div>
                <div className="tool-title">Manage Students</div>
                <div className="meta">Create, search and edit student records</div>
              </div>
            </Link>
            <Link to="/admin/users" className="admin-tool-card">
              <div className="tool-icon">🛠️</div>
              <div>
                <div className="tool-title">Users</div>
                <div className="meta">Add or modify user accounts</div>
              </div>
            </Link>
            <Link to="/admin/departments" className="admin-tool-card">
              <div className="tool-icon">🏛️</div>
              <div>
                <div className="tool-title">Departments</div>
                <div className="meta">Manage department HODs and codes</div>
              </div>
            </Link>
            <Link to="/admin/faculty" className="admin-tool-card">
              <div className="tool-icon">🎓</div>
              <div>
                <div className="tool-title">Faculty</div>
                <div className="meta">Assign departments and designations</div>
              </div>
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <h3>Departments</h3>
          <div className="dept-grid">
            {deptStats.length === 0 && <div className="card">Loading departments…</div>}
            {deptStats.map(d => (
              <div key={d.code} className="card dept-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="dept-avatar">{(d.name || '').slice(0,2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 800 }}>{d.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>{d.code}</div>
                  </div>
                </div>
                <div className="dept-card-body">
                  <div className="dept-stat">
                    <div style={{ fontWeight:700 }}><AnimatedNumber value={d.students || 0} format={v => v.toLocaleString()} /></div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>Students</div>
                  </div>
                  <div className="dept-stat">
                    <div style={{ fontWeight:700 }}><AnimatedNumber value={d.faculty || 0} /></div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>Faculty</div>
                  </div>
                  <div className="dept-attendance">
                    <div style={{ fontWeight:700 }}>{d.average_attendance != null ? `${d.average_attendance}%` : '—'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>Avg Attendance</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

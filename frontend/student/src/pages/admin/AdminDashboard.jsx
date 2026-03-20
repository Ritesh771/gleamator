import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'
import BarChart from '../../components/BarChart'
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

  const stats = adminStats ? (() => {
    const calcPct = (arr) => {
      if (!arr || arr.length === 0) return 0
      const max = Math.max(...arr)
      if (!max) return 0
      return Math.round((arr[arr.length - 1] / max) * 100)
    }
    return [
      { title: 'Total Users', value: adminStats.total_users, meta: `${adminStats.admins} admins • ${adminStats.faculty} faculty • ${adminStats.students} students`, variant: 'purple', spark: [5,8,12,9,14,16,18], chartType: 'circle', chartValue: calcPct([5,8,12,9,14,16,18]) },
      { title: 'Departments', value: adminStats.departments, meta: 'Active departments', variant: 'green', spark: [1,1,2,2,2,3,1], chartType: 'circle', chartValue: calcPct([1,1,2,2,2,3,1]) },
      { title: 'Faculty', value: adminStats.faculty, meta: 'Total faculty', variant: 'blue', spark: [2,3,3,4,5,4,6], chartType: 'circle', chartValue: calcPct([2,3,3,4,5,4,6]) },
      { title: 'Students', value: adminStats.students, meta: 'Total students', variant: 'orange', spark: [8,9,11,10,14,13,15], chartType: 'circle', chartValue: calcPct([8,9,11,10,14,13,15]) },
    ]
  })() : []

  const studentData = deptStats.map(d => ({ label: d.code, value: d.students || 0, color: '#f59e0b' }))
  const facultyData = deptStats.map(d => ({ label: d.code, value: d.faculty || 0, color: '#06b6d4' }))
  const attendanceData = deptStats.map(d => ({ label: d.code, value: d.average_attendance || 0, color: '#10b981' }))

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h2>Admin Dashboard</h2>

        <div className="stats-grid">
          {stats.length === 0 && (
            <div className="card">Loading stats…</div>
          )}
          {stats.map((s, i) => (
            <StatsCard key={s.title} title={s.title} value={<AnimatedNumber value={s.value} format={v => v.toLocaleString()} />} meta={s.meta} variant={s.variant} spark={s.spark} className="hod-card" chartType={s.chartType} chartValue={s.chartValue} />
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
          {deptStats.length === 0 && <div className="card">Loading departments…</div>}
          {deptStats.length > 0 &&
            <div className="dept-grid">
              <div className="card">
                <h4 style={{ margin: '4px 0 12px 12px' }}>Students per Department</h4>
                <BarChart data={studentData} width={320} height={200} />
              </div>
              <div className="card">
                <h4 style={{ margin: '4px 0 12px 12px' }}>Faculty per Department</h4>
                <BarChart data={facultyData} width={320} height={200} />
              </div>
              <div className="card">
                <h4 style={{ margin: '4px 0 12px 12px' }}>Avg. Attendance (%)</h4>
                <BarChart data={attendanceData} width={320} height={200} format={v => `${v}%`} />
              </div>
            </div>
          }
        </div>
      </div>
    </Layout>
  )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'
import api from '../../lib/api'
import { useAuth } from '../../lib/auth'
import BarChart from '../../components/BarChart'

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

export default function HodDashboard() {
  const { user } = useAuth()
  const [dept, setDept] = useState(null)
  const [stats, setStats] = useState([])
  const [deptStats, setDeptStats] = useState(null)
  const [semStats, setSemStats] = useState([])
  const [loadingSemStats, setLoadingSemStats] = useState(false)

  useEffect(() => { if (user) loadDept() }, [user])

  async function loadDept() {
    try {
      const res = await api.get('departments/')
      const list = res.data.results || res.data || []
      const my = list.find((d) => {
        const h = d.hod
        if (!h || !user) return false
        if (typeof h === 'object' && h.id != null) return String(h.id) === String(user.id)
        return String(h) === String(user.id) || String(h) === String(user.username)
      })
      if (my) {
        setDept(my)
        await loadStatsForDept(my)
      }
    } catch (e) {
      console.error('failed to load department', e)
    }
  }

  async function loadStatsForDept(deptObj) {
    try {
      const code = deptObj.code
      // try department stats endpoint
      const res = await api.get(`/stats/department/${code}/`)
      const d = res.data || {}
      setDeptStats(d)
      // compute lightweight percent for students/faculty from spark arrays (last / max)
      const studentSpark = [8,9,11,10,14,13,15]
      const facultySpark = [2,3,3,4,5,4,6]
      const attendanceSpark = [1,2,1,3,2,2,1]
      const calcPct = (arr) => {
        if (!arr || arr.length === 0) return 0
        const max = Math.max(...arr)
        if (!max) return 0
        return Math.round((arr[arr.length - 1] / max) * 100)
      }

      setStats([
        { title: 'Dept Students', value: d.students != null ? d.students : '—', meta: 'Active students', variant: 'orange', spark: studentSpark, chartType: 'circle', chartValue: calcPct(studentSpark) },
        { title: 'Dept Faculty', value: d.faculty != null ? d.faculty : '—', meta: 'Faculty count', variant: 'blue', spark: facultySpark, chartType: 'circle', chartValue: calcPct(facultySpark) },
        { title: 'Avg Attendance', value: d.average_attendance != null ? `${d.average_attendance}%` : '—', meta: 'Department average', variant: 'green', spark: attendanceSpark, chartType: 'circle', chartValue: d.average_attendance != null ? d.average_attendance : 0 }
      ])
      // load semester-wise stats (aggregate student attendance by semester)
      loadSemesterStats(deptObj)
    } catch (e) {
      console.error('failed to load stats for dept', e)
      // fallback: count via students/faculty endpoints
      try {
        const s1 = await api.get('students/', { params: { department: deptObj.code, page: 1, page_size: 1 } })
        const studentsCount = s1.data.count || (Array.isArray(s1.data) ? s1.data.length : undefined)
        const f = await api.get('faculty/', { params: { department: deptObj.code, page: 1, page_size: 1 } })
        const facultyCount = f.data.count || (Array.isArray(f.data) ? f.data.length : undefined)
        setStats([
          { title: 'Dept Students', value: studentsCount != null ? String(studentsCount) : '—', meta: 'Active students', variant: 'orange', chartType: 'circle', chartValue: 60 },
          { title: 'Dept Faculty', value: facultyCount != null ? String(facultyCount) : '—', meta: 'Faculty count', variant: 'blue', chartType: 'circle', chartValue: 40 }
        ])
      } catch (e2) {
        console.error('fallback stats failed', e2)
      }
    }
  }

  async function loadSemesterStats(deptObj) {
    setLoadingSemStats(true)
    try {
      // fetch all students in department (reasonable for department sizes)
      const res = await api.get('students/', { params: { department: deptObj.code, page: 1, page_size: 1000 } })
      const list = (res.data && (res.data.results || res.data)) || []
      // fetch attendance per student in parallel (attendance/student/<id>/)
      const perStudent = await Promise.all(list.map(async (s) => {
        try {
          const r = await api.get(`attendance/student/${s.id}/`)
          // Prefer `summary` field (per-subject percentages) returned by the endpoint
          const summary = r.data && Array.isArray(r.data.summary) ? r.data.summary : null
          if (summary) {
            const vals = summary.map(a => a.attendance_percent).filter(v => v != null)
            const avg = vals.length ? Math.round(vals.reduce((a,b) => a+b, 0) / vals.length) : null
            return { id: s.id, semester: s.semester, attendance_percent: avg }
          }
          // Fallback: use detailed `attendance` records (present vs total)
          const records = r.data && Array.isArray(r.data.attendance) ? r.data.attendance : []
          if (records.length === 0) return { id: s.id, semester: s.semester, attendance_percent: null }
          const presentCount = records.filter(rr => rr.present === true || rr.status === 'P').length
          const avg2 = Math.round((presentCount / records.length) * 100)
          return { id: s.id, semester: s.semester, attendance_percent: avg2 }
        } catch (e) {
          return { id: s.id, semester: s.semester, attendance_percent: null }
        }
      }))

      // aggregate by semester
      const map = {}
      perStudent.forEach(p => {
        const sem = p.semester || 0
        if (!map[sem]) map[sem] = { total: 0, count: 0 }
        if (p.attendance_percent != null) {
          map[sem].total += p.attendance_percent
          map[sem].count += 1
        }
      })
      const sems = Object.keys(map).sort((a,b)=>Number(a)-Number(b)).map(sem => ({ label: `Sem ${sem}`, value: map[sem].count ? Math.round(map[sem].total / map[sem].count) : 0 }))
      setSemStats(sems)
    } catch (e) {
      console.error('failed to load semester stats', e)
    } finally {
      setLoadingSemStats(false)
    }
  }

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h2>HOD Dashboard{dept ? ` — ${dept.name}` : ''}</h2>

        <div className="stats-grid">
          {stats.length === 0 && (
            <div className="card">Loading stats…</div>
          )}
          {stats.map((s) => (
            <StatsCard
              key={s.title}
              title={s.title}
              value={<AnimatedNumber value={s.value === '—' ? 0 : s.value} format={v => (typeof s.value === 'string' && s.value.endsWith('%') ? `${s.value}` : v.toLocaleString())} />}
              meta={s.meta}
              variant={s.variant}
              spark={s.spark}
              className="hod-card"
              chartType={s.chartType}
              chartValue={s.chartValue}
            />
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <h3>Quick Actions</h3>
          <div className="admin-tools-grid">
            <Link to="/hod/students" className="admin-tool-card">
              <div className="tool-icon">👥</div>
              <div>
                <div className="tool-title">Department Students</div>
                <div className="meta">View and manage department students</div>
              </div>
            </Link>
            <Link to="/hod/faculty" className="admin-tool-card">
              <div className="tool-icon">🎓</div>
              <div>
                <div className="tool-title">Department Faculty</div>
                <div className="meta">View faculty in your department</div>
              </div>
            </Link>
            <Link to="/hod/courses" className="admin-tool-card">
              <div className="tool-icon">📚</div>
              <div>
                <div className="tool-title">Department Courses</div>
                <div className="meta">Create and assign courses</div>
              </div>
            </Link>
            <Link to="/hod/departments" className="admin-tool-card">
              <div className="tool-icon">🏛️</div>
              <div>
                <div className="tool-title">Departments</div>
                <div className="meta">Browse departments</div>
              </div>
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <h3>Department</h3>
          {dept ? (
            <div className="card dept-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="dept-avatar">{(dept.name || '').slice(0,2).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 800 }}>{dept.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>{dept.code}</div>
                </div>
              </div>
              <div className="dept-card-body">
                <div className="dept-stat">
                  <div style={{ fontWeight:700 }}><AnimatedNumber value={deptStats?.students || 0} format={v => v.toLocaleString()} /></div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Students</div>
                </div>
                <div className="dept-stat">
                  <div style={{ fontWeight:700 }}><AnimatedNumber value={deptStats?.faculty || 0} /></div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Faculty</div>
                </div>
                <div className="dept-attendance">
                  <div style={{ fontWeight:700 }}>{deptStats?.average_attendance != null ? `${deptStats.average_attendance}%` : '—'}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Avg Attendance</div>
                </div>
              </div>
            </div>
          ) : (
            <div>No department assigned to your HOD account. Contact admin.</div>
          )}
          {dept && (
            <div style={{ marginTop: 18 }}>
              <h4>Semester-wise Attendance</h4>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 320, background: '#fff', border: '1px solid #e6e6e6', padding: 12, borderRadius: 8 }}>
                  {loadingSemStats ? <div>Loading semester stats…</div> : (
                    semStats.length > 0 ? <BarChart data={semStats.map(s => ({ label: s.label, value: s.value }))} width={480} height={160} /> : <div style={{ color: '#6b7280' }}>No semester data available</div>
                  )}
                </div>
                <div style={{ width: 220 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Semester Summary</div>
                  {semStats.length === 0 && <div style={{ color: '#6b7280' }}>No data</div>}
                  {semStats.map(s => (
                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <div style={{ color: '#374151' }}>{s.label}</div>
                      <div style={{ fontWeight: 700 }}>{s.value}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

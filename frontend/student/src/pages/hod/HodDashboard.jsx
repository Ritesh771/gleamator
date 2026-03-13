import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'
import api from '../../lib/api'
import { useAuth } from '../../lib/auth'

export default function HodDashboard() {
  const { user } = useAuth()
  const [dept, setDept] = useState(null)
  const [stats, setStats] = useState([
    { title: 'Dept Students', value: '—', meta: 'Active students' },
    { title: 'Dept Faculty', value: '—', meta: 'Faculty count' }
  ])

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
        await loadStatsForDept(my.id)
      }
    } catch (e) {
      console.error('failed to load department', e)
    }
  }

  async function loadStatsForDept(deptIdOrObj) {
    try {
      const deptCode = typeof deptIdOrObj === 'object' ? deptIdOrObj.code : deptIdOrObj
      const s1 = await api.get('students/', { params: { department: deptCode, page: 1, page_size: 1 } })
      const studentsCount = s1.data.count || (Array.isArray(s1.data) ? s1.data.length : undefined)
      const f = await api.get('faculty/', { params: { department: deptCode, page: 1, page_size: 1 } })
      const facultyCount = f.data.count || (Array.isArray(f.data) ? f.data.length : undefined)
      setStats([
        { title: 'Dept Students', value: studentsCount != null ? String(studentsCount) : '—', meta: 'Active students' },
        { title: 'Dept Faculty', value: facultyCount != null ? String(facultyCount) : '—', meta: 'Faculty count' }
      ])
    } catch (e) {
      console.error('failed to load stats', e)
    }
  }

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h2>HOD Dashboard{dept ? ` — ${dept.name}` : ''}</h2>
        <div className="stats-grid">
          {stats.map(s => <StatsCard key={s.title} {...s} />)}
        </div>

        <ul>
          <li><Link to="/hod/students">Department Students</Link></li>
          <li><Link to="/hod/faculty">Department Faculty</Link></li>
          <li><Link to="/hod/departments">Departments</Link></li>
        </ul>
      </div>
    </Layout>
  )
}

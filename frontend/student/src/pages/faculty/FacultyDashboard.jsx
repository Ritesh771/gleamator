import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'
import api from '../../lib/api'
import { notify } from '../../lib/toastService'

export default function FacultyDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await api.get('faculty/dashboard/')
        if (!mounted) return
        setStats([
          { title: 'Classes Today', value: String(res.data.classes_today || 0), meta: 'Scheduled' },
          { title: 'Pending Attendance', value: String(res.data.pending_attendance || 0), meta: 'Needs submission' }
        ])
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

        <ul>
          <li><Link to="/attendance/take">Take Attendance</Link></li>
          <li><Link to="/marks/upload">Upload Marks</Link></li>
          <li><Link to="/students">My Students</Link></li>
        </ul>
      </div>
    </Layout>
  )
}

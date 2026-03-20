import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

import Layout from '../components/Layout'
import StatsCard from '../components/StatsCard'

export default function Dashboard() {
  const { user, logout } = useAuth()
  // Sample stats — replace with API data as needed
  const stats = [
    { title: 'Active Students', value: '1,248', meta: 'Up 4% vs last month', spark: [10,12,8,14,16,18,20] },
    { title: 'Attendance Avg', value: '88%', meta: 'This week', spark: [80,85,90,88,87,89,88], chartType: 'circle', chartValue: 88 },
    { title: 'Assignments Due', value: '12', meta: 'Due this week', spark: [2,3,1,4,3,2,2] },
    { title: 'Avg Marks', value: '76%', meta: 'Last exam', spark: [70,72,75,78,76,77,76], chartType: 'circle', chartValue: 76 }
  ]

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2>Dashboard</h2>
            <div style={{ color: 'var(--muted)' }}>Welcome {user?.username || 'user'}</div>
          </div>
          <div>
            <button onClick={() => logout()}>Logout</button>
          </div>
        </div>

        <div className="stats-grid">
          {stats.map((s) => <StatsCard key={s.title} title={s.title} value={s.value} meta={s.meta} spark={s.spark} className="hod-card" chartType={s.chartType} chartValue={s.chartValue} />)}
        </div>

        <nav>
          <ul>
            <li><Link to="/students">Students</Link></li>
          </ul>
        </nav>
      </div>
    </Layout>
  )
}

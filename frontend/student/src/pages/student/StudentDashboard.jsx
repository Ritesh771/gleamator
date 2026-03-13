import React from 'react'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'

export default function StudentDashboard() {
  const stats = [
    { title: 'Attendance', value: '92%', meta: 'This semester', spark: [85,88,90,92,91,92,92] },
    { title: 'Credits Earned', value: '48', meta: 'of 60', spark: [40,42,44,45,46,47,48] }
  ]

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h2>Student Dashboard</h2>
        <div className="stats-grid">
          {stats.map(s => <StatsCard key={s.title} {...s} />)}
        </div>
        <p>View your attendance and marks using the sidebar links.</p>
      </div>
    </Layout>
  )
}

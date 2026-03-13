import React from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'

export default function FacultyDashboard() {
  const stats = [
    { title: 'Classes Today', value: '4', meta: 'Scheduled', spark: [1,2,3,4,3,4,4] },
    { title: 'Pending Attendance', value: '2', meta: 'Needs submission', spark: [2,2,1,2,3,2,2] }
  ]

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h2>Faculty Dashboard</h2>
        <div className="stats-grid">
          {stats.map(s => <StatsCard key={s.title} {...s} />)}
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

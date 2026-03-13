import React from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'

export default function HodDashboard() {
  const stats = [
    { title: 'Dept Students', value: '342', meta: 'Active students', spark: [30,32,34,33,35,34,34] },
    { title: 'Avg Attendance', value: '90%', meta: 'Department avg', spark: [88,89,90,91,90,90,90] }
  ]

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h2>HOD Dashboard</h2>
        <div className="stats-grid">
          {stats.map(s => <StatsCard key={s.title} {...s} />)}
        </div>

        <ul>
          <li><Link to="/students">Department Students</Link></li>
          <li><Link to="/hod/departments">Departments</Link></li>
          <li><Link to="/">Department Reports</Link></li>
        </ul>
      </div>
    </Layout>
  )
}

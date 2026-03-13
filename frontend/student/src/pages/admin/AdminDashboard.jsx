import React from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'

export default function AdminDashboard() {
  const stats = [
    { title: 'Total Users', value: '1,842', meta: 'Admins, faculty, students', spark: [5,8,12,9,14,16,18] },
    { title: 'Departments', value: '18', meta: 'Active', spark: [1,1,2,2,2,3,1] }
  ]

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h2>Admin Dashboard</h2>
        <div className="stats-grid">
          {stats.map(s => <StatsCard key={s.title} {...s} />)}
        </div>

        <ul>
          <li><Link to="/students">Manage Students</Link></li>
          <li><Link to="/admin/users">Users</Link></li>
          <li><Link to="/hod/departments">Departments</Link></li>
          <li><Link to="/">Other Admin Tools</Link></li>
        </ul>
      </div>
    </Layout>
  )
}

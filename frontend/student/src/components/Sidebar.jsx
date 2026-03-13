import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Sidebar() {
  const { user } = useAuth()
  return (
    <aside className="app-sidebar">
      <div className="sidebar-inner">
        <h3 className="sidebar-title">College ERP</h3>
        {user && <div className="sidebar-greeting">Hi, {user.username}</div>}
        <nav>
          <ul className="sidebar-nav">
            <li><Link to="/">Home</Link></li>
            {user?.role === 'ADMIN' && (
              <>
                <li><Link to="/admin/users">Users</Link></li>
                <li><Link to="/admin/departments">Departments</Link></li>
                <li><Link to="/admin/faculty">Faculty</Link></li>
              </>
            )}
            {user?.role === 'HOD' && (
              <>
                <li><Link to="/hod/departments">Departments</Link></li>
                <li><Link to="/students">Students</Link></li>
              </>
            )}
            {user?.role === 'FACULTY' && (
              <>
                <li><Link to="/attendance/take">Take Attendance</Link></li>
                <li><Link to="/marks/upload">Upload Marks</Link></li>
                <li><Link to="/students">Students</Link></li>
              </>
            )}
            {user?.role === 'STUDENT' && (
              <>
                <li><Link to="/student/profile">My Profile</Link></li>
                <li><Link to="/student/attendance">My Attendance</Link></li>
                <li><Link to="/student/marks">My Marks</Link></li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
